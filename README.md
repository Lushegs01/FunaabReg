# ScanMark OS

Production blueprint and starter implementation for a Nigerian university academic records and departmental registration platform.

ScanMark OS is designed as a modular monolith that can later split into services without rewriting core domain logic. It supports multi-tenancy, verified student records, departmental registration, QR/manual attendance, course enrollment, results/GPA, transcript generation, and FG verification exports.

## Repository Layout

```text
backend/                 Node.js TypeScript API starter
frontend/                Next.js product shell and UI notes
docs/                    Architecture, schema, API, UX, and MVP plan
infra/                   Docker Compose and deployment notes
```

## Primary Decisions

- Backend: Node.js, TypeScript, Fastify, PostgreSQL, Redis, BullMQ, S3-compatible object storage.
- Frontend: Next.js, mobile-first, low-bandwidth UI, lazy-loaded heavy workflows.
- Architecture: modular monolith with tenant-aware modules and clean service boundaries.
- Database: PostgreSQL with UUID keys, tenant scoping, audit logging, focused indexes, and partition-ready large tables.
- Storage: documents in object storage, metadata and cryptographic hashes in PostgreSQL.
- Security: JWT access tokens, rotating refresh tokens, RBAC, audit logs, checksummed uploads.

## Key Documents

- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.sql)
- [API Structure](docs/api.md)
- [Folder Structure](docs/folder-structure.md)
- [UI Wireframes](docs/ui-wireframes.md)
- [MVP Build Plan](docs/mvp-plan.md)
- [Deployment Notes](docs/deployment.md)

## Local Development Shape

This starter is intentionally lean. It is not a full generated app, but the backend code shows production-grade implementation patterns for authentication, registration, and document upload.

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Use `infra/docker-compose.yml` for local PostgreSQL, Redis, and MinIO.

## Vercel Deployment

Deploy the frontend to Vercel. The root `vercel.json` builds only the `frontend` workspace and outputs `frontend/out` as a static export, so the current UI does not require a Vercel Serverless Function.

The backend should be deployed separately as a container service because it depends on PostgreSQL, Redis, object storage, and long-running BullMQ workers. Good targets include Render, Railway, Fly.io, AWS ECS, Google Cloud Run, or Azure Container Apps.

If you configure the Vercel project manually, set:

```text
Framework: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: out
```
