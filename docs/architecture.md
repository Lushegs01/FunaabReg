# ScanMark OS Architecture

## Text-Based System Diagram

```text
                           Nigerian Universities, Colleges, Departments
                                             |
                                             v
        +-------------------+     HTTPS      +----------------------------+
        | Student Phones    | <------------> | CDN / Edge Cache / WAF     |
        | Staff Laptops     |                +-------------+--------------+
        | Lecturer Devices  |                              |
        +-------------------+                              v
                                          +----------------+---------------+
                                          | Load Balancer                  |
                                          | TLS, health checks, autoscale  |
                                          +----------------+---------------+
                                                           |
                                                           v
                    +--------------------------------------+--------------------------------------+
                    | Stateless API Layer: Node.js TypeScript Fastify Modular Monolith            |
                    | Auth | Registration | Records | Attendance | Courses | Results | Transcript |
                    | FG Export | Audit | Notifications | Admin                                   |
                    +----------+--------------------+--------------------+------------------------+
                               |                    |                    |
                               v                    v                    v
                    +----------+-----+    +---------+------+   +---------+----------------+
                    | PostgreSQL     |    | Redis          |   | BullMQ Workers           |
                    | primary system |    | cache, rate    |   | email, PDF, exports,     |
                    | of record      |    | limit, session |   | verification jobs        |
                    +----------+-----+    +---------+------+   +---------+----------------+
                               |                                      |
                               v                                      v
                    +----------+----------------+          +----------+------------------+
                    | Read Replicas / Backups   |          | S3-Compatible Object Store |
                    | PITR, analytics replica   |          | WAEC, JAMB, transcripts    |
                    +---------------------------+          +-----------------------------+
```

## Architecture Style

ScanMark OS starts as a modular monolith. Each domain owns routes, validation, services, repository queries, jobs, and tests. Shared infrastructure stays in `src/common`. This keeps deployment cheap and simple for early universities while preserving a path to service extraction when national volume requires it.

Service extraction candidates:

- `attendance-service`: high-write offline sync and QR validation.
- `transcript-service`: PDF rendering, signing, versioning, and email delivery.
- `fg-export-service`: secure government integrations and scheduled exports.
- `notification-service`: email, SMS, and push messaging.

## Core Runtime Components

Backend:

- Fastify for low overhead request handling.
- Zod for request validation.
- Prisma or SQL repository layer for typed database access; raw SQL migrations for partitioning/indexing.
- JWT access tokens with short TTL.
- Rotating refresh tokens stored hashed in PostgreSQL or Redis.
- RBAC checked at route and service boundaries.
- Tenant context resolved from authenticated user, host, or explicit university code.

Database:

- PostgreSQL as system of record.
- PgBouncer for connection pooling.
- UUID primary keys.
- Tenant-scoped tables with `university_id`.
- Partition large append-heavy tables by academic session or month: `attendance_records`, `audit_logs`, `verification_export_rows`.
- Partial and composite indexes for dashboard queries.

Storage:

- S3-compatible storage such as AWS S3, Cloudflare R2, Wasabi, Backblaze B2, or MinIO.
- API issues presigned upload URLs instead of proxying large files.
- Store file hash, MIME type, size, object key, and verification status in PostgreSQL.
- Documents are immutable after upload; replacement creates a new document version.

Caching:

- Redis caches permissions, active sessions, academic structures, course catalogs, and dashboard counts.
- Redis rate limits login, upload presign, QR attendance sync, and export endpoints.

Queue:

- BullMQ workers process email, transcript PDF generation, document OCR/pre-checks, duplicate detection, and FG export packaging.
- API returns fast and exposes job status endpoints.

## Multi-Tenancy

Recommended model: shared database, shared schema, tenant key on every domain table.

Why:

- Lower cost for Nigerian institutions.
- Easier nationwide reporting.
- Simpler operations than per-tenant databases.
- Can move very large institutions into dedicated clusters later.

Rules:

- Every tenant-owned table has `university_id`.
- All queries include tenant filters.
- Composite unique constraints include `university_id`.
- Audit logs include `university_id`, actor, action, target, IP, and request ID.
- Optional PostgreSQL Row Level Security can be introduced after repository patterns stabilize.

## Reliability

- API containers are stateless and horizontally scalable.
- Health checks cover PostgreSQL, Redis, queue lag, and object storage availability.
- Read replicas support reporting and transcript preview workloads.
- Daily backups plus point-in-time recovery.
- At least two API instances and two worker instances in production.
- BullMQ jobs are idempotent and retry with exponential backoff.
- Outbox pattern is recommended for critical notifications and FG export events.

## Security Model

Authentication:

- Passwords hashed with Argon2id or bcrypt with strong cost.
- Access JWT: 10-15 minute TTL.
- Refresh token: 7-30 day TTL, rotated on each refresh, stored hashed.
- Device/session records can be revoked by user or admin.

Authorization:

- Roles: `student`, `lecturer`, `admin`, `super_admin`.
- Permissions are action-based, for example `registration.verify`, `result.submit`, `transcript.generate`.
- Lecturers only access assigned course offerings.
- Students only access their own records.
- Admins are scoped to their university unless `super_admin`.

Data protection:

- TLS everywhere.
- Database encryption at rest via managed disk encryption.
- Object storage server-side encryption.
- Sensitive exports encrypted before transmission.
- Checksums and immutable object keys detect tampering.
- Audit trails are append-only from the application perspective.

## Performance Design

- Pagination on all list endpoints.
- Cursor pagination for high-volume tables.
- Avoid N+1 queries by batching dashboard counts and loading relations explicitly.
- Cache stable academic structures such as faculties, departments, sessions, and courses.
- Use read replicas for reporting dashboards and exports.
- Presigned direct uploads reduce API bandwidth cost.
- Background jobs handle PDF generation, export packaging, document pre-checks, and notifications.

## Nigeria-Focused Constraints

Slow internet:

- Mobile-first pages under 200 KB initial JS target for common student flows.
- Chunk heavy admin dashboards and transcript previews.
- Use resumable uploads for documents.
- Save partial registration progress locally.
- Retry-safe API design with idempotency keys.

Inconsistent connectivity:

- Attendance supports offline session capture on lecturer device.
- Attendance sync endpoint accepts batches with device IDs and monotonic client event IDs.
- Conflict handling records both original client timestamp and server timestamp.

Non-technical staff:

- Dashboards are status-driven: pending, verified, rejected, needs correction.
- Admin verification surfaces one decision at a time.
- Every rejection requires a plain-language reason visible to students.

Minimal server cost:

- Start with one PostgreSQL primary, one Redis instance, object storage, two API containers, one worker.
- Keep modular monolith until operational need justifies services.
- Use object storage and queues to avoid over-sizing API servers.

## Deployment Topology

Minimum production:

- CDN/WAF
- Load balancer
- 2 API containers
- 1-2 worker containers
- Managed PostgreSQL with automated backups
- Redis
- S3-compatible object storage
- Centralized logs and metrics

Scale-out path:

- Add API replicas.
- Add worker replicas per queue.
- Add PostgreSQL read replicas.
- Partition high-write tables.
- Move attendance/transcript/export modules into dedicated services only when necessary.
