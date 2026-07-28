# MediRDV CI — Backend API

Plateforme de prise de rendez-vous médicaux pour le marché ivoirien.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Python 3.12 + Flask 3.x |
| Base de données | PostgreSQL 15 |
| Cache / Broker | Redis 7 |
| Tâches async | Celery |
| Validation | Marshmallow |
| Auth | Flask-JWT-Extended + bcrypt |
| Documentation API | Flask-Smorest (OpenAPI/Swagger) |
| Stockage fichiers | Minio (S3-compatible) |
| Conteneurisation | Docker + Docker Compose |

## Prérequis

- [Docker](https://www.docker.com/) ≥ 24.0
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.20

## Démarrage rapide

### 1. Configurer les variables d'environnement

```bash
cp apps/api/.env.example apps/api/.env
# Éditer apps/api/.env avec vos valeurs
```

### 2. Lancer la stack

```bash
docker-compose up --build
```

Cela démarre :
- **API Flask** → http://localhost:5000
- **Worker Celery** (tâches asynchrones)
- **PostgreSQL 15** → localhost:5432
- **Redis 7** → localhost:6379
- **Minio** → http://localhost:9000 (console : http://localhost:9001)

### 3. Vérifier le fonctionnement

```bash
curl http://localhost:5000/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

## Migrations Alembic

```bash
# Depuis le conteneur API ou en local
flask db init       # Première fois uniquement
flask db migrate -m "description"
flask db upgrade
```

## Tests

```bash
# Exécuter tous les tests
pytest

# Avec couverture
pytest --cov=app --cov-report=term-missing

# Tests unitaires uniquement
pytest tests/unit/

# Tests d'intégration uniquement
pytest tests/integration/
```

## Linting & Formatage

```bash
# Vérification
ruff check app/ tests/
black --check app/ tests/
mypy app/

# Correction automatique
ruff check --fix app/ tests/
black app/ tests/
```

## Structure du projet

```
apps/api/
├── app/
│   ├── __init__.py           → factory Flask (create_app)
│   ├── extensions.py         → init SQLAlchemy, JWT, Celery, CORS
│   ├── auth/                 → authentification & rôles
│   ├── users/                → profils utilisateurs & recherche
│   ├── agenda/               → créneaux & disponibilités
│   ├── appointments/         → rendez-vous (cycle de vie)
│   ├── teleconsult/          → intégration Daily.co (vidéo)
│   ├── notifications/        → tâches Celery + Twilio/SendGrid
│   └── dashboard/            → statistiques & exports
├── migrations/               → Alembic
├── tests/
│   ├── unit/
│   └── integration/
├── celery_worker.py
├── config.py
├── wsgi.py
└── requirements.txt
```

## Conventions

- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Branches** : Git Flow (`feature/`, `fix/`, `release/`)
- **Erreurs API** : Format JSON uniforme `{"error": "code_erreur", "message": "..."}`
- **Type hints** : Obligatoires (`mypy` en CI)
- **Linting** : `ruff` + `black` (bloquants en CI)
