# ===========================================================
# Stage 1 — Build
# ===========================================================
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ===========================================================
# Stage 2 — Runtime
# ===========================================================
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=wsgi.py

# Dépendances légères de production
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Récupération des packages Python et des binaires installés par pip
COPY --from=builder /usr/local /usr/local

# Code source
COPY . .

# Création et configuration de l'utilisateur non-root pour la sécurité
RUN useradd -m -u 10001 appuser && \
    chown -R appuser:appuser /app /home/appuser

USER appuser

EXPOSE 5000

# Commande de démarrage recommandée pour la production (Gunicorn)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "wsgi:app"]
