# Folder Structure

## Backend

```text
backend/
  prisma/
    schema.prisma
  src/
    app.ts
    server.ts
    config/
      env.ts
    common/
      audit/
        audit.service.ts
      auth/
        jwt.ts
        middleware.ts
        permissions.ts
      db/
        prisma.ts
      storage/
        s3.ts
      errors.ts
      redis.ts
    modules/
      auth/
        auth.routes.ts
        auth.schema.ts
        auth.service.ts
      documents/
        document-upload.schema.ts
        document-upload.service.ts
      jobs/
        queues.ts
        transcript.worker.ts
      registration/
        registration.routes.ts
        registration.schema.ts
        registration.service.ts
    utils/
      time.ts
```

Backend module rule:

- Each module owns route registration, DTO validation, service logic, repository queries, tests, and jobs.
- Cross-cutting concerns live in `common`.
- Large future modules should follow the same pattern: `attendance`, `courses`, `results`, `transcripts`, `fg-export`.

## Frontend

```text
frontend/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    status-pill.tsx
  next.config.mjs
  tailwind.config.ts
```

Frontend growth path:

```text
frontend/
  app/
    (auth)/
      login/
    student/
      dashboard/
      registration/
      courses/
      attendance/
      results/
    admin/
      dashboard/
      registrations/
      results/
      transcripts/
      fg-exports/
    lecturer/
      courses/
      attendance/
      results/
  components/
    forms/
    layout/
    status/
    tables/
    upload/
  lib/
    api-client.ts
    auth.ts
    offline-store.ts
```

Frontend module rule:

- Keep first-load pages small.
- Lazy-load audit logs, transcript PDF previews, charts, and export screens.
- Store offline attendance batches in IndexedDB.
- Use optimistic form saves for low-bandwidth student workflows.
