"""
MediRDV CI — Tests d'intégration pour le module ``users``.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from uuid import UUID

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AvailabilitySlot, BlockedSlot, ConsultationType, User, UserRole


class TestUsersIntegration:
    """Classe regroupant les tests d'intégration des profils et de la recherche."""

    def _get_auth_headers(self, client: FlaskClient, register_payload: dict) -> dict:
        """Helper pour enregistrer et connecter un utilisateur et obtenir les headers."""
        client.post("/api/v1/auth/register", json=register_payload)
        login_resp = client.post(
            "/api/v1/auth/login",
            json={
                "phone": register_payload["phone"],
                "password": register_payload["password"],
            },
        ).get_json()
        return {"Authorization": f"Bearer {login_resp['access_token']}"}

    def test_get_put_users_me_patient(self, client: FlaskClient) -> None:
        """Récupération et mise à jour des infos personnelles d'un patient."""
        register_payload = {
            "role": "patient",
            "first_name": "Alassane",
            "last_name": "Ouattara",
            "phone": "+22500000001",
            "password": "Password123",
            "gdpr_consent": True,
        }
        headers = self._get_auth_headers(client, register_payload)

        # 1. GET /users/me
        get_resp = client.get("/api/v1/users/me", headers=headers)
        assert get_resp.status_code == 200
        get_data = get_resp.get_json()
        assert get_data["first_name"] == "Alassane"
        assert get_data["patient_profile"]["address"] is None

        # 2. PUT /users/me
        update_payload = {
            "first_name": "Alassane K.",
            "address": "Cocody, Rue des Ministres",
            "phone_secondary": "+22501010101",
        }
        put_resp = client.put(
            "/api/v1/users/me", json=update_payload, headers=headers
        )
        assert put_resp.status_code == 200

        # Vérification GET
        get_resp2 = client.get("/api/v1/users/me", headers=headers)
        get_data2 = get_resp2.get_json()
        assert get_data2["first_name"] == "Alassane K."
        assert get_data2["patient_profile"]["address"] == "Cocody, Rue des Ministres"

    def test_doctor_search_by_specialty_and_city(self, client: FlaskClient) -> None:
        """Recherche de médecins par spécialité et adresse (ville)."""
        # Création pédiatre à Abidjan Plateau
        doc1_payload = {
            "role": "medecin",
            "first_name": "Jean-Marc",
            "last_name": "Koffi",
            "phone": "+22500000002",
            "password": "Password123",
            "specialty": "Pediatrie",
            "address": "Plateau, Abidjan",
            "cabinet_name": "Cabinet Central",
        }
        client.post("/api/v1/auth/register", json=doc1_payload)

        # Création ophtalmologue à Bouaké
        doc2_payload = {
            "role": "medecin",
            "first_name": "Amina",
            "last_name": "Yao",
            "phone": "+22500000003",
            "password": "Password123",
            "specialty": "Ophtalmologie",
            "address": "Zone Industrielle, Bouake",
            "cabinet_name": "Cabinet Lumiere",
        }
        client.post("/api/v1/auth/register", json=doc2_payload)

        # 1. Recherche par spécialité
        resp_spec = client.get("/api/v1/doctors?specialty=Pediatrie")
        assert resp_spec.status_code == 200
        data_spec = resp_spec.get_json()
        assert len(data_spec["doctors"]) == 1
        assert data_spec["doctors"][0]["last_name"] == "Koffi"

        # 2. Recherche par ville
        resp_city = client.get("/api/v1/doctors?city=Bouake")
        assert resp_city.status_code == 200
        data_city = resp_city.get_json()
        assert len(data_city["doctors"]) == 1
        assert data_city["doctors"][0]["last_name"] == "Yao"

    def test_doctor_geographical_search(self, client: FlaskClient) -> None:
        """Recherche par localisation lat/lng et rayon."""
        # Yao : Plateau (5.3484, -4.0197)
        doc1_payload = {
            "role": "medecin",
            "first_name": "Jean-Marc",
            "last_name": "Koffi",
            "phone": "+22500000004",
            "password": "Password123",
            "address": "Plateau",
            "latitude": 5.3484,
            "longitude": -4.0197,
        }
        client.post("/api/v1/auth/register", json=doc1_payload)

        # Diallo : Cocody (5.3584, -3.9897) -> ~3.5km de Plateau
        doc2_payload = {
            "role": "medecin",
            "first_name": "Aminata",
            "last_name": "Diallo",
            "phone": "+22500000005",
            "password": "Password123",
            "address": "Cocody",
            "latitude": 5.3584,
            "longitude": -3.9897,
        }
        client.post("/api/v1/auth/register", json=doc2_payload)

        # 1. Recherche avec rayon 5km (retourne les deux)
        resp_5km = client.get("/api/v1/doctors?lat=5.3484&lng=-4.0197&radius=5")
        assert resp_5km.status_code == 200
        assert len(resp_5km.get_json()["doctors"]) == 2

        # 2. Recherche avec rayon 2km (uniquement Koffi au Plateau)
        resp_2km = client.get("/api/v1/doctors?lat=5.3484&lng=-4.0197&radius=2")
        assert resp_2km.status_code == 200
        data_2km = resp_2km.get_json()["doctors"]
        assert len(data_2km) == 1
        assert data_2km[0]["last_name"] == "Koffi"

    def test_doctor_upcoming_availabilities(self, app: Flask, client: FlaskClient) -> None:
        """Calcul à la volée des disponibilités d'un médecin (Slots réguliers - Rendez-vous - Bloqués)."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Didier",
            "last_name": "Drogba",
            "phone": "+22500000006",
            "password": "Password123",
        }
        client.post("/api/v1/auth/register", json=doc_payload)
        doctor = User.query.filter_by(phone="+22500000006").first()

        # Prochain lundi
        now = datetime.now()
        days_ahead = 0 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_monday = (now + timedelta(days=days_ahead)).date()

        # Création d'une ouverture récurrente le lundi (day_of_week=0)
        # de 09:00 à 10:30 avec durée 30 min -> 3 créneaux (09:00, 09:30, 10:00)
        with app.app_context():
            slot = AvailabilitySlot(
                doctor_id=doctor.id,
                day_of_week=0,
                start_time=time(9, 0),
                end_time=time(10, 30),
                consultation_type=ConsultationType.PRESENTIEL,
                duration_min=30,
            )
            db.session.add(slot)
            db.session.commit()

        # 1. Vérification initiale (3 créneaux dispos)
        resp = client.get(f"/api/v1/doctors/{doctor.id}")
        assert resp.status_code == 200
        avail1 = resp.get_json()["upcoming_availabilities"]
        assert len(avail1) == 3

        # 2. Bloquer le créneau de 09:30 - 10:00 (BlockedSlot)
        with app.app_context():
            blocked = BlockedSlot(
                doctor_id=doctor.id,
                start_datetime=datetime.combine(next_monday, time(9, 30)),
                end_datetime=datetime.combine(next_monday, time(10, 0)),
                reason="Réunion",
            )
            db.session.add(blocked)
            db.session.commit()

        resp2 = client.get(f"/api/v1/doctors/{doctor.id}")
        avail2 = resp2.get_json()["upcoming_availabilities"]
        # Devrait rester 09:00 et 10:00 (09:30 bloqué)
        assert len(avail2) == 2
        starts = [datetime.fromisoformat(s).time() for s in avail2]
        assert time(9, 30) not in starts

        # 3. Créer un rendez-vous à 09:00
        # Nous avons besoin d'un patient
        patient_payload = {
            "role": "patient",
            "first_name": "Test",
            "last_name": "Patient",
            "phone": "+22500000007",
            "password": "Password123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=patient_payload)
        patient = User.query.filter_by(phone="+22500000007").first()

        with app.app_context():
            appt = Appointment(
                doctor_id=doctor.id,
                patient_id=patient.id,
                slot_start=datetime.combine(next_monday, time(9, 0)),
                slot_end=datetime.combine(next_monday, time(9, 30)),
                type=ConsultationType.PRESENTIEL,
            )
            db.session.add(appt)
            db.session.commit()

        resp3 = client.get(f"/api/v1/doctors/{doctor.id}")
        avail3 = resp3.get_json()["upcoming_availabilities"]
        # Ne reste plus que le créneau de 10:00
        assert len(avail3) == 1
        assert datetime.fromisoformat(avail3[0]).time() == time(10, 0)

    def test_settings_restrictions_and_forbidden(self, client: FlaskClient) -> None:
        """Vérifie la sécurité d'accès en modification des paramètres du médecin."""
        doc1_payload = {
            "role": "medecin",
            "first_name": "Doc",
            "last_name": "One",
            "phone": "+22500000008",
            "password": "Password123",
        }
        doc2_payload = {
            "role": "medecin",
            "first_name": "Doc",
            "last_name": "Two",
            "phone": "+22500000009",
            "password": "Password123",
        }
        sec_payload = {
            "role": "secretaire",
            "first_name": "Sec",
            "last_name": "One",
            "phone": "+22500000010",
            "password": "Password123",
        }

        doc1_headers = self._get_auth_headers(client, doc1_payload)
        doc2_headers = self._get_auth_headers(client, doc2_payload)
        sec_headers = self._get_auth_headers(client, sec_payload)

        doc1 = User.query.filter_by(phone="+22500000008").first()

        # 1. Medecin 2 tente de modifier Medecin 1 -> 403 Forbidden
        url = f"/api/v1/doctors/{doc1.id}/settings"
        payload = {"cancellation_delay_hours": 48}
        resp = client.put(url, json=payload, headers=doc2_headers)
        assert resp.status_code == 403

        # 2. Secrétaire tente de modifier Medecin 1 -> 403 Forbidden
        resp2 = client.put(url, json=payload, headers=sec_headers)
        assert resp2.status_code == 403

        # 3. Medecin 1 modifie ses propres paramètres -> 200 OK
        resp3 = client.put(url, json=payload, headers=doc1_headers)
        assert resp3.status_code == 200
        assert doc1.doctor_profile.cancellation_delay_hours == 48
