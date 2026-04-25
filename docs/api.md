# ScanMark OS API Structure

Base URL:

```text
/api/v1
```

All authenticated requests include:

```text
Authorization: Bearer <access-token>
X-Request-Id: <uuid>
Idempotency-Key: <uuid>   # for retry-safe writes
```

## Auth

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/password/forgot
POST   /auth/password/reset
```

## Universities and Academic Structure

```text
GET    /universities/current
GET    /faculties
GET    /departments?facultyId=
GET    /sessions/current
GET    /courses?departmentId=&level=&semester=&cursor=
```

## Student Registration

```text
POST   /registrations
GET    /registrations/me
GET    /registrations/:id
POST   /registrations/:id/submit
POST   /registrations/:id/documents/presign
POST   /registrations/:id/documents/complete
GET    /admin/registrations?status=&departmentId=&cursor=
POST   /admin/registrations/:id/verify
POST   /admin/registrations/:id/reject
```

Presigned upload request:

```json
{
  "documentType": "waec",
  "fileName": "waec-result.pdf",
  "mimeType": "application/pdf",
  "byteSize": 842188,
  "sha256Hash": "hex-encoded-file-hash"
}
```

Response:

```json
{
  "documentId": "uuid",
  "objectKey": "universities/uni-id/registrations/reg-id/waec/v1.pdf",
  "uploadUrl": "https://object-storage.example/presigned-url",
  "requiredHeaders": {
    "Content-Type": "application/pdf",
    "x-amz-checksum-sha256": "base64-checksum"
  },
  "expiresInSeconds": 900
}
```

## Student Records

```text
GET    /students/me
GET    /students/:id
GET    /admin/students?departmentId=&level=&q=&cursor=
PATCH  /admin/students/:id
GET    /students/:id/course-history
GET    /students/:id/registration-history
```

## Courses and Enrollment

```text
GET    /course-offerings?sessionId=&departmentId=&level=&semester=
POST   /enrollments
DELETE /enrollments/:id
GET    /students/me/enrollments?sessionId=
POST   /admin/course-offerings
PATCH  /admin/course-offerings/:id
POST   /admin/course-offerings/:id/assign-lecturer
```

## Attendance

```text
POST   /attendance/sessions
POST   /attendance/sessions/:id/qr/rotate
POST   /attendance/sessions/:id/mark
POST   /attendance/sync
GET    /attendance/sessions/:id/records?cursor=
GET    /students/me/attendance?courseOfferingId=
```

Offline sync request:

```json
{
  "deviceId": "lecturer-phone-123",
  "courseOfferingId": "uuid",
  "events": [
    {
      "clientEventId": "offline-000001",
      "attendanceSessionId": "uuid",
      "studentId": "uuid",
      "source": "offline_sync",
      "clientRecordedAt": "2026-04-24T09:20:00Z"
    }
  ]
}
```

## Results and GPA

```text
POST   /results/sheets
PUT    /results/sheets/:id/scores
POST   /results/sheets/:id/submit
POST   /admin/results/sheets/:id/approve
POST   /admin/results/sheets/:id/reject
GET    /students/me/results
GET    /students/:id/gpa-summary
```

Score input is validated against enrollment records and course ownership. GPA is recomputed server-side from approved/published results only.

## Transcripts

```text
POST   /students/:id/transcripts/generate
GET    /students/:id/transcripts
GET    /transcripts/:id/versions
GET    /transcripts/:id/versions/:version/download
```

Transcript generation returns a job:

```json
{
  "jobId": "bullmq-job-id",
  "statusUrl": "/api/v1/jobs/bullmq-job-id"
}
```

## FG Verification Export

```text
POST   /fg-exports
GET    /fg-exports
GET    /fg-exports/:id
GET    /fg-exports/:id/download
```

Export payload format:

```json
{
  "universityCode": "UNILAG",
  "generatedAt": "2026-04-24T12:00:00Z",
  "records": [
    {
      "matricNo": "CSC/2020/001",
      "jambRegistrationNo": "12345678AB",
      "surname": "Okafor",
      "firstName": "Ada",
      "departmentCode": "CSC",
      "admissionYear": 2020,
      "graduationYear": 2024,
      "cgpa": 4.52,
      "recordHash": "sha256"
    }
  ]
}
```

## Admin Dashboards

```text
GET    /admin/dashboard/summary
GET    /admin/dashboard/registrations
GET    /admin/dashboard/results
GET    /admin/audit-logs?actor=&action=&targetType=&cursor=
```

## API Rules

- Use cursor pagination for high-volume lists.
- Every write is audited.
- Every tenant-owned request is checked against `university_id`.
- Heavy work returns `202 Accepted` with a job status URL.
- All write DTOs are validated with Zod.
- Public error responses use safe messages; internal detail goes to structured logs.
