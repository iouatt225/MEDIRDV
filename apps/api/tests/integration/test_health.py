"""
MediRDV CI — Test d'intégration de l'endpoint ``/health``.

Vérifie que le health check retourne la structure JSON attendue.

Note : sans PostgreSQL et Redis locaux (hors Docker), le health check
retourne ``503 degraded``. Les tests vérifient la structure de la réponse
et le comportement correct dans les deux cas.
"""

from __future__ import annotations

from flask.testing import FlaskClient


class TestHealthEndpoint:
    """Tests de l'endpoint /health."""

    def test_health_returns_valid_json(self, client: FlaskClient) -> None:
        """Le health check retourne une réponse JSON valide."""
        response = client.get("/health")
        data = response.get_json()

        assert response.status_code in (200, 503)
        assert data is not None
        assert "status" in data
        assert data["status"] in ("healthy", "degraded")

    def test_health_response_structure(self, client: FlaskClient) -> None:
        """La réponse contient les clés obligatoires."""
        response = client.get("/health")
        data = response.get_json()

        expected_keys = {"status", "database", "redis"}
        assert expected_keys.issubset(set(data.keys()))

    def test_health_database_status(self, client: FlaskClient) -> None:
        """Le statut de la base de données est renseigné."""
        response = client.get("/health")
        data = response.get_json()

        assert data["database"] in ("connected", "disconnected")

    def test_health_redis_status(self, client: FlaskClient) -> None:
        """Le statut de Redis est renseigné."""
        response = client.get("/health")
        data = response.get_json()

        assert data["redis"] in ("connected", "disconnected", "not_configured")

    def test_health_200_when_all_services_up(self, client: FlaskClient) -> None:
        """Si status=healthy, le code HTTP doit être 200."""
        response = client.get("/health")
        data = response.get_json()

        if data["status"] == "healthy":
            assert response.status_code == 200

    def test_health_503_when_degraded(self, client: FlaskClient) -> None:
        """Si status=degraded, le code HTTP doit être 503."""
        response = client.get("/health")
        data = response.get_json()

        if data["status"] == "degraded":
            assert response.status_code == 503

    def test_health_database_connected_with_sqlite(self, client: FlaskClient) -> None:
        """En mode test (SQLite), la base est connectée."""
        response = client.get("/health")
        data = response.get_json()

        # SQLite en mémoire est toujours accessible
        assert data["database"] == "connected"
