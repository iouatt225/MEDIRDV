"""
MediRDV CI — Tests d'intégration pour le module ``agenda`` et la concurrence.
"""

from __future__ import annotations

import concurrent.futures
from datetime import datetime, time, timedelta, timezone
from uuid import UUID

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app import extensions
from app.agenda.services import calculate_availabilities
from app.appointments.services import book_appointment
from app.extensions import db
from app.models import Appointment, AvailabilitySlot, BlockedSlot, ConsultationType, User, UserRole


class TestAgendaIntegration:
    """Classe regroupant les tests d'intégration de l'agenda et de la concurrence."""

    def _get_auth_headers(self, client: FlaskClient, register_payload: dict) -> dict:
        """Helper pour inscrire et connecter un utilisateur."""
        client.post("/api/v1/auth/register", json=register_payload)
        login_resp = client.post(
            "/api/v1/auth/login",
            json={
                "phone": register_payload["phone"],
                "password": register_payload["password"],
            },
        ).get_json()
        return {"Authorization": f"Bearer {login_resp['access_token']}"}

    def test_slots_crud(self, client: FlaskClient) -> None:
        """Flot complet CRUD pour les AvailabilitySlots."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Koffi",
            "phone": "+22509000001",
            "password": "Password123",
        }
        headers = self._get_auth_headers(client, doc_payload)

        # 1. POST /slots (Créer)
        slot_payload = {
            "day_of_week": 1,  # Mardi
            "start_time": "09:00:00",
            "end_time": "12:00:00",
            "consultation_type": "presentiel",
            "duration_min": 30,
        }
        post_resp = client.post("/api/v1/slots", json=slot_payload, headers=headers)
        assert post_resp.status_code == 201
        slot_data = post_resp.get_json()
        assert slot_data["day_of_week"] == 1
        slot_id = slot_data["id"]

        # 2. GET /slots (Liste)
        get_resp = client.get("/api/v1/slots", headers=headers)
        assert get_resp.status_code == 200
        get_data = get_resp.get_json()
        assert len(get_data) == 1
        assert get_data[0]["id"] == slot_id

        # 3. PUT /slots/<id> (Modifier)
        put_payload = {"duration_min": 45}
        put_resp = client.put(f"/api/v1/slots/{slot_id}", json=put_payload, headers=headers)
        assert put_resp.status_code == 200
        assert put_resp.get_json()["duration_min"] == 45

        # 4. DELETE /slots/<id> (Supprimer)
        del_resp = client.delete(f"/api/v1/slots/{slot_id}", headers=headers)
        assert del_resp.status_code == 204

        # Liste doit être vide
        get_resp2 = client.get("/api/v1/slots", headers=headers)
        assert len(get_resp2.get_json()) == 0

    def test_block_slots(self, client: FlaskClient) -> None:
        """Un médecin peut bloquer une plage horaire."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Koffi",
            "phone": "+22509000002",
            "password": "Password123",
        }
        headers = self._get_auth_headers(client, doc_payload)

        block_payload = {
            "start_datetime": "2026-08-01T10:00:00",
            "end_datetime": "2026-08-01T12:00:00",
            "reason": "Congés",
        }
        resp = client.post("/api/v1/slots/block", json=block_payload, headers=headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["reason"] == "Congés"

        # Vérification en base
        doctor = User.query.filter_by(phone="+22509000002").first()
        blocked = BlockedSlot.query.filter_by(doctor_id=doctor.id).first()
        assert blocked is not None
        assert blocked.reason == "Congés"

    def test_availability_caching_and_invalidation(self, app: Flask, client: FlaskClient) -> None:
        """La liste des disponibilités est mise en cache Redis et invalidée lors des modifications."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Cache",
            "last_name": "Doctor",
            "phone": "+22509000003",
            "password": "Password123",
        }
        headers = self._get_auth_headers(client, doc_payload)
        doctor = User.query.filter_by(phone="+22509000003").first()

        # Configurer un créneau récurrent le lundi (day_of_week=0)
        slot_payload = {
            "day_of_week": 0,
            "start_time": "09:00:00",
            "end_time": "10:00:00",
            "consultation_type": "presentiel",
        }
        client.post("/api/v1/slots", json=slot_payload, headers=headers)

        # Calculer disponibilités (va alimenter le cache Redis)
        from_dt = datetime.now() + timedelta(days=1)
        # S'assurer d'inclure le prochain lundi
        days_ahead = 0 - from_dt.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        monday_dt = from_dt + timedelta(days=days_ahead)
        start_range = datetime.combine(monday_dt.date(), time(8, 0))
        end_range = datetime.combine(monday_dt.date(), time(11, 0))

        # Premier appel -> écrit dans Redis
        url = f"/api/v1/doctors/{doctor.id}/availability?from={start_range.isoformat()}&to={end_range.isoformat()}"
        resp1 = client.get(url)
        assert resp1.status_code == 200
        avail1 = resp1.get_json()
        assert len(avail1) == 2  # 09:00 et 09:30

        # Vérifier que le cache Redis contient la clé
        cache_key = f"doctor_availabilities:{doctor.id}:{start_range.isoformat()}:{end_range.isoformat()}"
        assert extensions.redis_client.get(cache_key) is not None  # type: ignore[attr-defined]

        # Modifier les ouvertures (devrait invalider le cache Redis)
        # Ajout d'un blocage
        block_payload = {
            "start_datetime": datetime.combine(monday_dt.date(), time(9, 30)).isoformat(),
            "end_datetime": datetime.combine(monday_dt.date(), time(10, 0)).isoformat(),
            "reason": "Réunion cache",
        }
        client.post("/api/v1/slots/block", json=block_payload, headers=headers)

        # Vérifier que la clé a été invalidée (supprimée de Redis)
        assert extensions.redis_client.get(cache_key) is None  # type: ignore[attr-defined]

    def test_concurrent_bookings_tc_001(self, app: Flask, client: FlaskClient) -> None:
        """TC-001 : Réservations simultanées sur le même créneau. Une seule doit réussir."""
        # 1. Enregistrer le médecin et les patients
        doc_payload = {
            "role": "medecin",
            "first_name": "Didier",
            "last_name": "Drogba",
            "phone": "+22509000004",
            "password": "Password123",
        }
        pat1_payload = {
            "role": "patient",
            "first_name": "Patient",
            "last_name": "Un",
            "phone": "+22509000005",
            "password": "Password123",
            "gdpr_consent": True,
        }
        pat2_payload = {
            "role": "patient",
            "first_name": "Patient",
            "last_name": "Deux",
            "phone": "+22509000006",
            "password": "Password123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=doc_payload)
        client.post("/api/v1/auth/register", json=pat1_payload)
        client.post("/api/v1/auth/register", json=pat2_payload)

        doctor = User.query.filter_by(phone="+22509000004").first()
        patient1 = User.query.filter_by(phone="+22509000005").first()
        patient2 = User.query.filter_by(phone="+22509000006").first()

        # Créneau cible
        slot_start = datetime.now() + timedelta(days=3)
        slot_end = slot_start + timedelta(minutes=30)

        results: list[str] = []

        def run_booking(patient_id: UUID) -> str:
            # Créer un contexte d'application distinct pour le thread secondaire
            with app.app_context():
                try:
                    book_appointment(
                        doctor_id=doctor.id,
                        patient_id=patient_id,
                        slot_start=slot_start,
                        slot_end=slot_end,
                        type=ConsultationType.PRESENTIEL,
                    )
                    return "success"
                except Exception as exc:
                    db.session.rollback()
                    return str(exc)

        # Exécuter les deux réservations simultanément
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(run_booking, patient1.id),
                executor.submit(run_booking, patient2.id),
            ]
            for f in concurrent.futures.as_completed(futures):
                results.append(f.result())

        # Une seule réservation doit réussir
        assert "success" in results

        # L'autre doit échouer avec une erreur de conflit (déjà réservé) ou violation de contrainte unique
        failures = [r for r in results if r != "success"]
        assert len(failures) == 1
        assert (
            "déjà réservé" in failures[0]
            or "UNIQUE constraint failed" in failures[0]
            or "database is locked" in failures[0]
            or "does not return rows" in failures[0]
        )
