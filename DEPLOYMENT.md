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

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `FRONTEND_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `DAILY_API_KEY`
- `DAILY_API_URL`
- `SENTRY_DSN`

## Notes

- In production, the API cookie configuration must allow cross-site refresh cookies between Render and Vercel.
- Make sure the Render API URL is publicly reachable over HTTPS.
- Run database migrations from your local machine against the Render `DATABASE_URL` before the first production deploy, or after any schema change.
- After the first deploy, verify `GET /health` returns `200`.
