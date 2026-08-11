"""
MediRDV CI — Tests d'intégration pour le module ``auth``.
"""

from __future__ import annotations

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import SecretaryDoctor, SecretaryDoctorStatus, User, UserRole


class TestAuthIntegration:
    """Classe regroupant les tests d'intégration du module auth."""

    def test_register_patient_success(self, client: FlaskClient) -> None:
        """Inscription d'un patient avec succès."""
        payload = {
            "role": "patient",
            "first_name": "Koffi",
            "last_name": "Kouadio",
            "phone": "+22501020304",
            "email": "koffi@patient.ci",
            "password": "Password123",
            "date_of_birth": "1995-10-12",
            "address": "Plateau, Abidjan",
            "gdpr_consent": True,
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.get_json()
        assert data["message"] == "Inscription réussie."
        assert "user_id" in data

        # Vérification en base
        user = User.query.filter_by(phone="+22501020304").first()
        assert user is not None
        assert user.role == UserRole.PATIENT
        assert user.patient_profile is not None
        assert user.patient_profile.address == "Plateau, Abidjan"
        assert user.gdpr_consent_at is not None

    def test_register_patient_fails_without_gdpr(self, client: FlaskClient) -> None:
        """Inscription d'un patient échoue si le consentement RGPD n'est pas True."""
        payload = {
            "role": "patient",
            "first_name": "Koffi",
            "last_name": "Kouadio",
            "phone": "+22501020305",
            "password": "Password123",
            "gdpr_consent": False,
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422
        data = response.get_json()
        assert "validation_error" in data["error"]
        assert "gdpr_consent" in data["messages"]

    def test_register_password_complexity(self, client: FlaskClient) -> None:
        """Le mot de passe doit respecter la complexité requise."""
        payload = {
            "role": "secretaire",
            "first_name": "Aminata",
            "last_name": "Diallo",
            "phone": "+22502020202",
            "password": "simple",  # Trop court et pas de majuscule/chiffre
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422
        data = response.get_json()
        assert "password" in data["messages"]

    def test_register_doctor_success(self, client: FlaskClient) -> None:
        """Inscription d'un médecin avec succès."""
        payload = {
            "role": "medecin",
            "first_name": "Dr. Yao",
            "last_name": "N'guessan",
            "phone": "+22505050505",
            "email": "dr.yao@medecin.ci",
            "password": "Password123",
            "specialty": "Pédiatrie",
            "cabinet_name": "Clinique des Anges",
            "address": "Cocody Vallon",
            "languages": ["Français", "Baoulé"],
            "fee": 15000.00,
            "cancellation_delay_hours": 12,
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201

        # Vérification en base
        user = User.query.filter_by(phone="+22505050505").first()
        assert user is not None
        assert user.role == UserRole.MEDECIN
        assert user.doctor_profile is not None
        assert user.doctor_profile.specialty == "Pédiatrie"
        assert user.doctor_profile.fee == 15000.00
        assert user.doctor_profile.cancellation_delay_hours == 12

    def test_login_success_and_jwt_cookies(self, client: FlaskClient) -> None:
        """Connexion réussie renvoyant l'access token et le refresh token en cookie httpOnly."""
        # Création préalable
        register_payload = {
            "role": "patient",
            "first_name": "Marc",
            "last_name": "Kouassi",
            "phone": "+22507070707",
            "password": "Password123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=register_payload)

        # Tentative de login
        login_payload = {"phone": "+22507070707", "password": "Password123"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.get_json()
        assert "access_token" in data
        assert data["user"]["role"] == "patient"

        # Vérification du cookie refresh token
        headers = response.headers
        cookie_header = headers.get("Set-Cookie", "")
        assert "refresh_token_cookie" in cookie_header
        assert "HttpOnly" in cookie_header

    def test_login_invalid_credentials(self, client: FlaskClient) -> None:
        """Échec de la connexion avec de mauvais identifiants."""
        login_payload = {"phone": "+22500000000", "password": "WrongPassword"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "unauthorized"

    def test_jwt_refresh_flow(self, client: FlaskClient) -> None:
        """Le token de rafraîchissement cookie permet d'obtenir un nouvel access token."""
        register_payload = {
            "role": "secretaire",
            "first_name": "Secretaire",
            "last_name": "Test",
            "phone": "+22508080808",
            "password": "Password123",
        }
        client.post("/api/v1/auth/register", json=register_payload)

        # Login pour stocker les cookies
        login_payload = {"phone": "+22508080808", "password": "Password123"}
        login_resp = client.post("/api/v1/auth/login", json=login_payload)
        assert login_resp.status_code == 200

        # Refresh
        refresh_resp = client.post("/api/v1/auth/refresh")
        assert refresh_resp.status_code == 200
        data = refresh_resp.get_json()
        assert "access_token" in data

    def test_password_reset_flow(self, app: Flask, client: FlaskClient) -> None:
        """Scénario complet de demande et confirmation de réinitialisation de mot de passe."""
        # Création utilisateur avec email
        register_payload = {
            "role": "patient",
            "first_name": "Jean",
            "last_name": "Gomez",
            "phone": "+22509090909",
            "email": "jean.gomez@test.ci",
            "password": "OldPassword123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=register_payload)

        # 1. Demande de reset
        req_resp = client.post(
            "/api/v1/auth/reset-password", json={"email": "jean.gomez@test.ci"}
        )
        assert req_resp.status_code == 200

        # Récupération du token depuis Redis (Mocké)
        from app.extensions import redis_client

        keys = list(redis_client.data.keys())  # type: ignore[attr-defined]
        reset_key = [k for k in keys if k.startswith("password_reset:")][0]
        token = reset_key.split(":")[1]

        # 2. Confirmation du nouveau mot de passe
        confirm_payload = {"token": token, "new_password": "NewPassword123"}
        confirm_resp = client.post(
            "/api/v1/auth/reset-password/confirm", json=confirm_payload
        )
        assert confirm_resp.status_code == 200

        # 3. Validation de la connexion avec le nouveau mot de passe
        login_payload = {"phone": "+22509090909", "password": "NewPassword123"}
        login_resp = client.post("/api/v1/auth/login", json=login_payload)
        assert login_resp.status_code == 200

    def test_secretary_invitation_and_join(self, client: FlaskClient) -> None:
        """Un médecin génère un code d'invitation, une secrétaire rejoint avec succès."""
        # 1. Inscriptions
        doc_payload = {
            "role": "medecin",
            "first_name": "Dr Yao",
            "last_name": "N'Guessan",
            "phone": "+22511111111",
            "password": "Password123",
        }
        sec_payload = {
            "role": "secretaire",
            "first_name": "Awa",
            "last_name": "Kone",
            "phone": "+22522222222",
            "password": "Password123",
        }
        client.post("/api/v1/auth/register", json=doc_payload)
        client.post("/api/v1/auth/register", json=sec_payload)

        # 2. Login Médecin & Invitation
        login_doc = client.post(
            "/api/v1/auth/login",
            json={"phone": "+22511111111", "password": "Password123"},
        ).get_json()
        doc_token = login_doc["access_token"]

        invite_headers = {"Authorization": f"Bearer {doc_token}"}
        invite_resp = client.post(
            "/api/v1/secretary/invite", headers=invite_headers
        )
        assert invite_resp.status_code == 200
        code = invite_resp.get_json()["invitation_code"]

        # 3. Login Secrétaire & Rattachement
        login_sec = client.post(
            "/api/v1/auth/login",
            json={"phone": "+22522222222", "password": "Password123"},
        ).get_json()
        sec_token = login_sec["access_token"]

        join_headers = {"Authorization": f"Bearer {sec_token}"}
        join_resp = client.post(
            "/api/v1/secretary/join",
            json={"invitation_code": code},
            headers=join_headers,
        )
        assert join_resp.status_code == 200

        # 4. Vérification de la liaison
        doctor_user = User.query.filter_by(phone="+22511111111").first()
        secretary_user = User.query.filter_by(phone="+22522222222").first()
        link = SecretaryDoctor.query.filter_by(
            doctor_id=doctor_user.id, secretary_id=secretary_user.id
        ).first()

        assert link is not None
        assert link.status == SecretaryDoctorStatus.ACTIVE

    def test_role_restrictions_and_forbidden(self, client: FlaskClient) -> None:
        """Vérifie que les routes sensibles appliquent des contrôles de rôles stricts (403)."""
        # Création d'un patient
        patient_payload = {
            "role": "patient",
            "first_name": "Simple",
            "last_name": "Patient",
            "phone": "+22533333333",
            "password": "Password123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=patient_payload)

        # Login Patient
        login_patient = client.post(
            "/api/v1/auth/login",
            json={"phone": "+22533333333", "password": "Password123"},
        ).get_json()
        patient_token = login_patient["access_token"]
        headers = {"Authorization": f"Bearer {patient_token}"}

        # 1. Un patient tente d'inviter une secrétaire -> 403 Forbidden
        invite_resp = client.post("/api/v1/secretary/invite", headers=headers)
        assert invite_resp.status_code == 403
        assert invite_resp.get_json()["error"] == "forbidden"

        # 2. Un patient tente de rejoindre en tant que secrétaire -> 403 Forbidden
        join_resp = client.post(
            "/api/v1/secretary/join",
            json={"invitation_code": "INVITE123"},
            headers=headers,
        )
        assert join_resp.status_code == 403

    def test_login_success_with_email(self, client: FlaskClient) -> None:
        """Connexion reussie avec l'adresse e-mail."""
        register_payload = {
            "role": "patient",
            "first_name": "Aline",
            "last_name": "Traore",
            "phone": "+22507070708",
            "email": "aline.traore@example.com",
            "password": "Password123",
            "gdpr_consent": True,
        }
        client.post("/api/v1/auth/register", json=register_payload)

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "aline.traore@example.com", "password": "Password123"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert "access_token" in data
        assert data["user"]["email"] == "aline.traore@example.com"
