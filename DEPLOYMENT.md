# Deployment Guide

## Target setup

- Frontend: Vercel
- Backend API: Render
- Free blueprint: Render web + Postgres + Key Value only

## Frontend on Vercel

The repository now includes a small root `package.json` so Vercel can build the monorepo from the repo root.

Set these environment variables in the Vercel project:

- `NEXT_PUBLIC_API_URL` = your Render API URL, for example `https://medirdv-api.onrender.com`
- `NEXT_PUBLIC_SITE_URL` = your Vercel URL, for example `https://medirdv.vercel.app`

Build command:

```bash
npm run build
```

The Vercel project should use the repository root and the `vercel.json` preset at the root. The frontend already rewrites `/api/v1/*` to the backend URL via `apps/web/next.config.ts`.

## Backend on Render

Use the repository root `render.yaml` Blueprint.

This blueprint is intentionally free-tier only:

- no background worker
- no pre-deploy migration job
- Postgres and Key Value run on free instances

If you need Celery/background jobs later, switch the worker back on with a paid Render plan.

Required production variables:

| Variable | Where to get it | Free blueprint |
|---|---|---|
| `SECRET_KEY` | Generate it yourself locally, for example with `openssl rand -hex 32` | Required |
| `JWT_SECRET_KEY` | Generate it yourself locally, for example with `openssl rand -hex 32` | Required |
| `FRONTEND_URL` | Your Vercel production URL, for example `https://medirdv.vercel.app` | Required |
| `DATABASE_URL` | Render Postgres connection string from the Render dashboard | Required |
| `REDIS_URL` | Render Key Value connection string from the Render dashboard | Required only if Redis is used |
| `CELERY_BROKER_URL` | Render Key Value connection string from the Render dashboard | Optional in free blueprint |
| `CELERY_RESULT_BACKEND` | Render Key Value connection string from the Render dashboard | Optional in free blueprint |
| `MINIO_ENDPOINT` | Your MinIO or S3-compatible storage endpoint | Optional |
| `MINIO_ACCESS_KEY` | MinIO or S3 access key | Optional |
| `MINIO_SECRET_KEY` | MinIO or S3 secret key | Optional |
| `MINIO_BUCKET` | Storage bucket name | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio console | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio console | Optional |
| `TWILIO_PHONE_NUMBER` | Twilio console | Optional |
| `SENDGRID_API_KEY` | SendGrid dashboard | Optional |
| `SENDGRID_FROM_EMAIL` | Verified sender address in SendGrid | Optional |
| `DAILY_API_KEY` | Daily.co dashboard | Optional |
| `DAILY_API_URL` | Daily.co API base URL, usually `https://api.daily.co/v1` | Optional |
| `SENTRY_DSN` | Sentry project settings | Optional |

## Notes

- In production, the API cookie configuration must allow cross-site refresh cookies between Render and Vercel.
- Make sure the Render API URL is publicly reachable over HTTPS.
- On first deploy, the API bootstraps any missing database tables automatically if the database is empty.
- For later schema changes, continue using Alembic migrations.
- After the first deploy, verify `GET /health` returns `200`.
