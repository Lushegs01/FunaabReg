# MVP Build Plan

## Phase 0: Foundation

1. Set up monorepo, CI, linting, tests, Docker Compose, and environment templates.
2. Implement PostgreSQL schema migrations, Redis, object storage, and structured logging.
3. Build auth: login, refresh rotation, logout, RBAC, tenant context, rate limiting.
4. Add audit logging middleware for all critical writes.

Exit criteria:

- API deploys to staging.
- Health checks work.
- Login and tenant-scoped authorization pass integration tests.

## Phase 1: Departmental Registration

1. Student profile creation and draft registration.
2. Required document configuration per university/department.
3. Presigned document upload flow with hash validation.
4. Student status dashboard.
5. Admin verification queue with approve, reject, and correction request.
6. Duplicate detection: matric number, JAMB number, phone/email, document hash, fuzzy name/date of birth.

Exit criteria:

- One university can onboard a full department.
- Admins can verify records with complete audit trail.
- Upload flow handles slow connection retries.

## Phase 2: Course Enrollment

1. Course catalog, course offerings, lecturer assignment.
2. Add/drop workflow with level, semester, prerequisite, and credit-unit validation.
3. Student enrollment dashboard.
4. Lecturer course roster.

Exit criteria:

- Students enroll in valid courses only.
- Lecturers see accurate class lists.

## Phase 3: Attendance

1. Lecturer-created attendance sessions.
2. QR attendance with nonce rotation.
3. Manual fallback.
4. Offline-first local capture and batch sync.
5. Attendance reports per course and student.

Exit criteria:

- Attendance can be taken during poor internet and synced later.
- Duplicate sync events are rejected safely.

## Phase 4: Results and GPA

1. Score sheet creation from enrollment.
2. Draft save, validation, submit, approve, publish.
3. GPA/CGPA calculation from approved results.
4. Student result view.

Exit criteria:

- GPA matches university grading rules.
- Result changes are auditable.

## Phase 5: Transcripts and FG Export

1. Transcript PDF worker.
2. Immutable transcript versions.
3. Secure expiring downloads.
4. FG export job with structured JSON/CSV output.
5. Export hash and audit trail.

Exit criteria:

- Authorized admin can generate a verified transcript.
- FG export payload is reproducible and tamper-evident.

## Phase 6: Scale and Hardening

1. Load tests for login, registration dashboard, upload presign, attendance sync, and result entry.
2. Add query-level performance monitoring.
3. Add read replicas for reporting.
4. Partition audit and attendance tables.
5. Add Prometheus/Grafana dashboards and alerting.

Target baseline:

- p95 API latency under 250 ms for common reads.
- p95 write latency under 500 ms excluding file upload.
- 99.9% uptime with multi-instance API and managed database backups.
