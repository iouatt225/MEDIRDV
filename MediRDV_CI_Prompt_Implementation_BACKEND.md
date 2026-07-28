# MediRDV CI — Prompt d'implémentation BACKEND
**Stack :** Python 3.12 + Flask (API REST) + PostgreSQL + Redis + Celery
**Source fonctionnelle :** Cahier des charges MVP v1.0 (Mars 2026) + Plan de Projet Développé v1.0 (Mai 2026)

> ⚠️ **Adaptation de stack assumée** : le cahier des charges et le plan de projet fournis
> recommandent NestJS + BullMQ. Ce prompt adapte l'architecture à **Flask/Python**, conformément
> à ta spécialisation, en conservant des équivalents fonctionnels stricts :
> - NestJS (modules/services) → **Flask + Blueprints**, organisation en modules par domaine
> - TypeORM/Prisma → **SQLAlchemy** (PostgreSQL)
> - class-validator/Zod → **Marshmallow** (ou Pydantic) pour la validation des schémas
> - BullMQ (Redis) → **Celery + Redis** comme broker pour les jobs asynchrones (rappels, notifications)
> - Swagger NestJS auto-généré → **Flask-Smorest** ou **flasgger** pour générer la doc OpenAPI
> Tous les autres éléments (entités, endpoints, règles métier, exigences non fonctionnelles,
> jalons) sont repris à l'identique des documents fournis.

---

## Comment utiliser ce document

Prompt à exécuter **bloc par bloc**, dans l'ordre indiqué en fin de document. Chaque bloc
est autonome. Valide le livrable de chaque bloc avant de passer au suivant — en particulier
le Bloc 2 (modèle de données), car toute la suite en dépend.

---

## BLOC 0 — Contexte projet & conventions globales

**Contexte produit**
MediRDV CI est une plateforme de prise de RDV médicaux pour le marché ivoirien. 3 rôles :
`medecin`, `secretaire`, `patient`. Le backend expose une API REST consommée par le frontend
Next.js (voir prompt FRONTEND séparé). Cible : 500 utilisateurs simultanés, disponibilité 99.5%.

**Stack technique imposée**
- Python 3.12, Flask 3.x, organisation en Blueprints par domaine
- SQLAlchemy 2.x + Alembic pour les migrations, PostgreSQL 15
- Redis 7 : cache des créneaux disponibles (TTL 30s) + broker Celery
- Celery : workers asynchrones pour rappels (J-1, H-1) et envoi notifications
- Marshmallow (ou Pydantic v2) pour validation des schémas entrée/sortie
- Flask-JWT-Extended : JWT access token (15 min) + refresh token (cookie `httpOnly`)
- bcrypt (via `flask-bcrypt`) pour le hash des mots de passe
- Flask-Smorest (ou flasgger) pour la documentation OpenAPI/Swagger, exposée sur `/api/docs` en staging
- Intégrations tierces : Twilio (SMS), SendGrid ou Mailgun (email), Daily.co (vidéo), Minio (stockage S3-compatible)
- Docker + Docker Compose pour l'orchestration locale et de production, Nginx en reverse proxy

**Conventions de code**
- Un module métier = un Blueprint + un dossier (`app/auth/`, `app/users/`, `app/agenda/`, `app/appointments/`, `app/teleconsult/`, `app/notifications/`, `app/dashboard/`)
- Chaque module contient : `routes.py`, `services.py` (logique métier), `models.py` (si spécifique), `schemas.py` (Marshmallow)
- Type hints Python obligatoires (`mypy` en CI)
- Conventional Commits, Git Flow (`feature/`, `fix/`, `release/`), PR obligatoire + 1 review avant merge
- Linting : `ruff` + `black`, bloquants en CI
- Toute réponse d'erreur suit un format JSON unique : `{"error": "code_erreur", "message": "..."}`

**Structure de dossiers cible (monorepo, dossier `apps/api`)**
```
apps/api/
├── app/
│   ├── __init__.py           → factory Flask (create_app)
│   ├── extensions.py         → init SQLAlchemy, JWT, Celery, CORS
│   ├── auth/
│   ├── users/
│   ├── agenda/
│   ├── appointments/
│   ├── teleconsult/
│   ├── notifications/        → tâches Celery + intégrations Twilio/SendGrid
│   └── dashboard/
├── migrations/                → Alembic
├── tests/
│   ├── unit/
│   └── integration/
├── celery_worker.py
├── config.py
├── wsgi.py
└── requirements.txt
```

**Livrable attendu :** squelette Flask qui démarre (`flask run`), connecté à PostgreSQL et Redis locaux via Docker Compose, avec un endpoint `/health` fonctionnel.

---

## BLOC 1 — Setup projet, configuration & Docker

**Objectif :** environnement de développement reproductible.

**Tâches**
1. `docker-compose.yml` à la racine du monorepo avec services : `api` (Flask), `web` (Next.js, référencé), `worker` (Celery), `postgres`, `redis`, `minio`.
2. `config.py` avec classes `DevelopmentConfig`, `TestingConfig`, `ProductionConfig`, toutes les valeurs sensibles via variables d'environnement (`.env`, jamais commité).
3. Factory pattern Flask (`create_app(config_name)`) permettant l'instanciation pour les tests avec une base isolée.
4. Configuration CORS restreinte au domaine du frontend (pas de wildcard en production).
5. Configuration Alembic pour les migrations, script `flask db upgrade` documenté dans le README.
6. Endpoint `/health` retournant l'état de la connexion DB et Redis (utile pour le monitoring Uptime Robot prévu en Phase 5).

**Livrable attendu :** `docker-compose up` démarre l'ensemble de la stack backend localement en une commande.

---

## BLOC 2 — Modèle de données (SQLAlchemy)

**Objectif :** implémenter le modèle relationnel défini dans le plan de projet (section 4.2), en anticipant les extensions V2 sans les développer.

**Entités à créer**

| Modèle | Champs clés | Notes |
|---|---|---|
| `User` | id (UUID), role (enum: medecin/secretaire/patient), phone (unique), email, password_hash, first_name, last_name, created_at | table racine des 3 rôles |
| `DoctorProfile` | id, user_id (FK), specialty, cabinet_name, address, bio, languages, fee, photo_url, cancellation_delay_hours | `cancellation_delay_hours` = délai N paramétrable pour l'annulation patient |
| `PatientProfile` | id, user_id (FK), date_of_birth, phone_secondary, address | |
| `SecretaryDoctor` | secretary_id (FK), doctor_id (FK), invited_at, status (enum: active/revoked) | relation many-to-many secrétaire↔médecins |
| `AvailabilitySlot` | id, doctor_id (FK), day_of_week, start_time, end_time, consultation_type (enum: presentiel/video), duration_min, is_recurring | modèle des créneaux récurrents type |
| `BlockedSlot` | id, doctor_id (FK), start_datetime, end_datetime, reason | congés/formations |
| `Appointment` | id (UUID), doctor_id (FK), patient_id (FK), slot_start, slot_end, type (enum), status (enum: confirme/annule/effectue/manque), reason, video_url, version_token | `version_token` pour le verrou optimiste |
| `NotificationLog` | id, appointment_id (FK), type (sms/email), trigger (confirm/j1/h1/j7), sent_at, status (sent/failed) | traçabilité RGPD des envois |

**Contraintes techniques**
1. Toutes les FK avec `ondelete` explicite (pas de suppression en cascade non maîtrisée sur les données de santé).
2. Index sur `Appointment.doctor_id + slot_start` (requêtes agenda fréquentes) et sur `Appointment.status`.
3. Contrainte d'unicité applicative (pas seulement DB) empêchant deux RDV actifs sur le même créneau d'un même médecin — cf. Bloc 5 pour la gestion de concurrence.
4. Migrations Alembic versionnées, une migration par entité pour garder un historique lisible.
5. Prévoir les colonnes/tables nécessaires en V2 (paiement, dossier médical) **dans le schéma seulement si mentionné par le plan de projet** — sinon ne rien développer au-delà du MVP, conformément à la section 4 "Hors périmètre MVP" du cahier des charges.

**Livrable attendu :** migrations Alembic appliquées, modèles testés unitairement (création, contraintes de clé étrangère, enum invalides rejetés).

---

## BLOC 3 — Authentification & rôles (Module 1)

**Objectif :** implémenter le module `auth` complet.

**Endpoints**
- `POST /api/v1/auth/register` — inscription (payload différent selon `role`)
- `POST /api/v1/auth/login` — téléphone + mot de passe → access token + refresh token (cookie httpOnly)
- `POST /api/v1/auth/refresh` — renouvellement de l'access token
- `POST /api/v1/auth/reset-password` — envoi du lien de réinitialisation (email, expiration 1h)
- `POST /api/v1/auth/reset-password/confirm` — validation du nouveau mot de passe via token
- `POST /api/v1/secretary/invite` — génération d'un code d'invitation par un médecin
- `POST /api/v1/secretary/join` — rattachement d'une secrétaire via le code

**Règles métier**
1. Mot de passe : hash bcrypt, jamais stocké/loggé en clair. Politique min 8 caractères + complexité, validée côté serveur (ne pas se fier uniquement au frontend).
2. Access token JWT courte durée (15 min), refresh token en cookie `httpOnly`, `Secure`, `SameSite=Strict` en production.
3. Chaque token embarque `user_id` et `role` — tous les endpoints protégés vérifient le rôle via un décorateur `@require_role("medecin", "secretaire")`.
4. Token de réinitialisation : à usage unique, expiration stricte 1h, invalidé après utilisation.
5. Test de sécurité prioritaire (aligné TC-020/TC-021 du plan de projet) : un token valide d'un médecin A ne doit jamais donner accès à l'agenda du médecin B → 403 Forbidden.

**Livrable attendu :** module `auth` avec tests d'intégration Pytest couvrant login/refresh/reset/rôles croisés.

---

## BLOC 4 — Profils utilisateurs (Module 1 suite)

**Objectif :** module `users`.

**Endpoints**
- `GET /api/v1/users/me` / `PUT /api/v1/users/me`
- `GET /api/v1/doctors` — recherche (query params : `specialty`, `city`, `lat`/`lng`)
- `GET /api/v1/doctors/:id` — profil public
- `PUT /api/v1/doctors/:id/settings` — disponibilités récurrentes, types de consultation, durées, `cancellation_delay_hours` (accès médecin uniquement)

**Règles métier**
1. La recherche de médecins ne retourne que les profils actifs, avec leurs prochains créneaux disponibles calculés à la volée (lecture des `AvailabilitySlot` moins les `Appointment`/`BlockedSlot` déjà posés).
2. Recherche géographique : accepter soit `city` (recherche texte), soit `lat`/`lng` (rayon de recherche configurable, défaut 15km).
3. La secrétaire n'a **aucun accès en écriture** aux champs médicaux sensibles du profil médecin (bio, spécialité) — uniquement lecture pour affichage agenda.

**Livrable attendu :** endpoints de recherche et profils testés, pagination sur `GET /doctors`.

---

## BLOC 5 — Agenda & disponibilités (Module 2)

**Objectif :** module `agenda`, cœur fonctionnel du système. **Priorité maximale sur la gestion de la concurrence.**

**Endpoints**
- `GET/POST/PUT/DELETE /api/v1/slots` — créneaux récurrents
- `POST /api/v1/slots/block` — blocage d'une plage
- `GET /api/v1/doctors/:id/availability?from=&to=` — disponibilités réelles calculées (recurrents − appointments − blocked_slots), mises en cache Redis TTL 30s

**Règles métier critiques (section 5.4 du plan de projet)**
1. **Verrou optimiste** : chaque `Appointment` porte un `version_token`, incrémenté à chaque update. Toute écriture concurrente sur une version périmée est rejetée (409 Conflict).
2. **Transaction PostgreSQL avec `SELECT ... FOR UPDATE`** lors de la réservation d'un créneau, pour garantir l'atomicité même sous forte charge.
3. **Invalidation du cache Redis** des disponibilités du médecin concerné à chaque création/annulation/blocage de créneau (ne pas attendre le TTL de 30s).
4. Un créneau ne peut être associé qu'à un seul RDV actif — contrainte vérifiée en base ET en code applicatif (double sécurité).
5. Test prioritaire à couvrir (TC-001 du plan de projet) : deux requêtes de réservation simultanées sur le même créneau → une seule doit réussir, l'autre reçoit une erreur explicite exploitable par le frontend.

**Livrable attendu :** module `agenda` avec test de concurrence reproduisant TC-001 à TC-005 du plan de projet (utiliser `pytest` + threads/`concurrent.futures` ou un test de charge k6 ciblé).

---

## BLOC 6 — Rendez-vous (Module 3)

**Objectif :** module `appointments`, orchestrant réservation, annulation, report côté patient et gestion manuelle côté secrétaire.

**Endpoints**
- `POST /api/v1/appointments` — création (patient ou secrétaire pour un patient donné)
- `GET /api/v1/appointments/:id`
- `GET /api/v1/appointments?patient_id=&doctor_id=&status=` — listes filtrées
- `PATCH /api/v1/appointments/:id/status` — changement de statut (annulation, report, marquage "effectué"/"patient absent")
- `DELETE /api/v1/appointments/:id` — annulation dure (usage secrétaire/admin uniquement, sinon préférer PATCH status=annule)

**Règles métier**
1. Annulation par le patient : vérifier `now < slot_start - doctor.cancellation_delay_hours` sinon retour `422` avec code d'erreur explicite (aligné TC-004).
2. Toute création de RDV de type `video` déclenche la génération d'une room Daily.co (voir Bloc 7) et la planification des jobs Celery de rappel (voir Bloc 8) **dans la même transaction logique** — en cas d'échec Daily.co, le RDV ne doit pas rester dans un état incohérent (rollback ou statut "en attente de lien vidéo" à retenter).
3. Toute annulation, quelle qu'en soit l'origine (patient, médecin, secrétaire), déclenche immédiatement les notifications à toutes les parties concernées (job Celery en file prioritaire).
4. Historique des statuts horodaté (table `NotificationLog` + colonne de suivi sur `Appointment` ou table d'audit dédiée si besoin de plus de granularité que ce qui est listé au 4.2).

**Livrable attendu :** cycle de vie complet d'un RDV testé (création → confirmation → annulation/report → notifications déclenchées).

---

## BLOC 7 — Téléconsultation (Module 4)

**Objectif :** module `teleconsult`, intégration Daily.co (ou Whereby).

**Endpoints**
- `POST /api/v1/teleconsult/create-room` — appelé en interne à la création d'un RDV vidéo (pas nécessairement exposé au frontend directement)
- `GET /api/v1/teleconsult/:appointmentId/token` — génère un token d'accès à la room, scoping strict (le patient ne peut obtenir un token que pour SES rendez-vous)
- Webhook Daily.co (`POST /api/v1/teleconsult/webhook`) pour recevoir les événements de fin de session

**Règles métier**
1. Génération de l'URL de session unique **à la création du RDV**, transmise ensuite par email et SMS (Module 5).
2. Salle d'attente : le patient rejoint la room mais la session ne démarre réellement (côté logique métier / statut) que lorsque le médecin ouvre sa session — exposer un endpoint ou un statut de room consultable par polling léger par le frontend.
3. À la fermeture de la session (webhook ou action explicite du médecin), déclencher l'email de récapitulatif post-consultation (sans données médicales, cf. Module 5).
4. Sécuriser les tokens Daily.co pour qu'ils ne soient valables que pour le créneau horaire du RDV (pas de token réutilisable indéfiniment).

**Livrable attendu :** génération de room fonctionnelle avec un compte Daily.co de test, cycle complet salle d'attente → session → fermeture testé manuellement puis en E2E avec le frontend.

---

## BLOC 8 — Notifications & rappels automatiques (Module 5)

**Objectif :** module `notifications`, entièrement asynchrone via Celery.

**Jobs Celery à implémenter**
- `send_confirmation(appointment_id)` — déclenché immédiatement après réservation (email + SMS, patient ET médecin/secrétaire)
- `send_reminder_j1(appointment_id)` — planifié à `slot_start - 24h`
- `send_reminder_h1_video(appointment_id)` — planifié à `slot_start - 1h`, uniquement si `type=video`, contient le lien direct
- `send_cancellation(appointment_id)` — immédiat, toutes parties
- `send_reminder_j7(appointment_id)` — optionnel, seulement si activé par le médecin pour 1ère consultation/consultation longue
- `send_post_consultation_summary(appointment_id)` — après fermeture de session, sans données médicales

**Règles métier**
1. Chaque job logue son résultat dans `NotificationLog` (`sent`/`failed`).
2. En cas d'échec (Twilio ou SendGrid indisponible) : retry automatique × 3 avec backoff exponentiel (config native Celery `autoretry_for` + `retry_backoff`).
3. Planification précise via `celery beat` ou `apply_async(eta=...)` calculé sur `slot_start`.
4. Si un RDV est annulé après planification des jobs J-1/H-1, les jobs doivent être révoqués (`celery.control.revoke`) — sinon un patient recevrait un rappel pour un RDV annulé.
5. Intégration Twilio (SMS) et SendGrid/Mailgun (email) isolées dans des clients dédiés (`app/notifications/providers/twilio_client.py`, `sendgrid_client.py`) pour pouvoir les mocker facilement en test.

**Livrable attendu :** worker Celery opérationnel, tests couvrant TC-010 à TC-013 du plan de projet (rappel J-1 à l'heure exacte, contenu du lien vidéo H-1, notification annulation immédiate, retry SMS).

---

## BLOC 9 — Tableau de bord & statistiques (Module 6)

**Objectif :** module `dashboard`.

**Endpoints**
- `GET /api/v1/dashboard/doctor` — taux de remplissage, nombre de RDV de la semaine, nombre d'annulations, nombre de téléconsultations
- `GET /api/v1/appointments/export?from=&to=&format=csv` — export CSV (accès médecin/secrétaire uniquement)

**Règles métier**
1. Calculs agrégés côté SQL (pas de calcul lourd en Python sur de grands volumes) — utiliser des requêtes SQLAlchemy avec `func.count`, `func.avg`.
2. L'export CSV ne doit contenir que les colonnes non sensibles nécessaires (pas de champ médical libre si jugé sensible).

**Livrable attendu :** endpoint dashboard renvoyant des chiffres corrects sur un jeu de données de test, export CSV valide.

---

## BLOC 10 — Sécurité, conformité RGPD & exigences non fonctionnelles

**Objectif :** répondre à la section 5 du cahier des charges.

**Tâches**
1. TLS 1.3 en production (configuration Nginx, pas dans Flask directement).
2. Chiffrement au repos AES-256 pour les champs sensibles si le SGBD/hébergeur ne le fournit pas nativement (a minima chiffrer les colonnes les plus sensibles, sinon s'appuyer sur le chiffrement disque du provider).
3. Logs d'accès aux données de santé : middleware Flask journalisant qui a consulté quelle fiche patient/RDV, avec horodatage (table d'audit dédiée, conservation définie avec le client).
4. Consentement explicite RGPD à l'inscription patient (case à cocher obligatoire, horodatée en base).
5. Droit à l'oubli : endpoint `DELETE /api/v1/users/me` (soft-delete + anonymisation des données personnelles, conservation des données statistiques agrégées uniquement).
6. Rate limiting sur les endpoints sensibles (`/auth/login`, `/auth/reset-password`) via `Flask-Limiter` pour limiter le brute-force.
7. Protection injection SQL : usage exclusif de l'ORM SQLAlchemy paramétré (aucune requête SQL brute concaténée) — test TC-022 du plan de projet.
8. Audit sécurité OWASP Top 10 avant recette (scan OWASP ZAP en CI/CD, cf. plan de projet section 6.1 et 7.2).

**Livrable attendu :** checklist sécurité cochée, rapport de scan OWASP ZAP sans vulnérabilité critique ou haute (Definition of Done, section 7.1 du plan de projet).

---

## BLOC 11 — Tests, performance & mise en production

**Objectif :** couvrir la Phase 4 (Tests & QA) et la Phase 5 (Déploiement) du planning.

**Tâches**
1. Tests unitaires Pytest sur les services métier, cible > 80% de couverture du code métier (Definition of Done).
2. Tests d'intégration Pytest + client de test Flask sur tous les endpoints, avec base de données de test isolée (transaction rollback après chaque test).
3. Tests de charge k6 : scénario 100 VUs (consultation disponibilités) puis 500 VUs (réservations concurrentes), objectif p95 < 3s, taux d'erreur < 0.1%.
4. Dockerfile de production pour l'API (`apps/api/Dockerfile`, image multi-stage, utilisateur non-root).
5. Migrations Alembic exécutées automatiquement au déploiement (script `run_migrations.sh` appelé avant le démarrage du conteneur).
6. Monitoring : intégration Sentry (erreurs applicatives) et exposition de métriques pour Uptime Robot via `/health`.
7. Documentation technique : schéma de base de données à jour, collection Swagger/OpenAPI exportée, guide de déploiement Docker dans le README.

**Livrable attendu :** API prête pour la recette client (Semaine 10 du planning), avec rapport de tests (unitaires, intégration, charge, sécurité) consolidé.

---

## Récapitulatif de l'ordre d'exécution

| Ordre | Bloc | Dépend de |
|---|---|---|
| 1 | Bloc 0 — Contexte & conventions | — |
| 2 | Bloc 1 — Setup & Docker | Bloc 0 |
| 3 | Bloc 2 — Modèle de données | Bloc 1 |
| 4 | Bloc 3 — Authentification | Bloc 2 |
| 5 | Bloc 4 — Profils utilisateurs | Bloc 3 |
| 6 | Bloc 5 — Agenda & disponibilités | Bloc 4 |
| 7 | Bloc 6 — Rendez-vous | Bloc 5 |
| 8 | Bloc 7 — Téléconsultation | Bloc 6 |
| 9 | Bloc 8 — Notifications | Bloc 6, Bloc 7 |
| 10 | Bloc 9 — Tableau de bord | Bloc 6 |
| 11 | Bloc 10 — Sécurité & RGPD | Tous les modules métier |
| 12 | Bloc 11 — Tests & mise en production | Tous les précédents |

*Fin du prompt BACKEND — voir le fichier `MediRDV_CI_Prompt_Implementation_FRONTEND.md` pour la partie client Next.js.*
