# Deployment Notes

## Environments

```text
development -> local Docker Compose
staging     -> production-like cloud environment with sample tenants
production  -> multi-instance API, managed PostgreSQL, Redis, object storage
```

## Required Services

- Load balancer with TLS.
- API containers from `backend/Dockerfile`.
- Worker containers using the same image with worker entrypoints.
- Managed PostgreSQL with automated backups and point-in-time recovery.
- Redis for cache, sessions, rate limiting, and BullMQ.
- S3-compatible object storage with server-side encryption.
- Central logs, metrics, and alerting.

## Production Configuration

```text
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=<random-32-byte-secret>
JWT_REFRESH_SECRET=<random-32-byte-secret>
S3_ENDPOINT=https://...
S3_BUCKET=...
```

## Scaling Rules

- Add API replicas when CPU is sustained above 60% or p95 latency rises.
- Add worker replicas when queue lag exceeds the SLA for transcript/export/email jobs.
- Add PostgreSQL read replicas before moving modules into microservices.
- Partition `attendance_records` and `audit_logs` before they become operational bottlenecks.

## Monitoring

Expose metrics for:

- API request count, latency, status code, and route.
- Database query latency and connection pool usage.
- Redis latency and memory.
- BullMQ queue depth, job duration, retries, and failures.
- Object storage upload failures.
- Login failures and rate-limit events.

Recommended dashboards:

- Executive uptime dashboard.
- Registration operations dashboard.
- Attendance sync dashboard.
- Queue health dashboard.
- Database performance dashboard.
