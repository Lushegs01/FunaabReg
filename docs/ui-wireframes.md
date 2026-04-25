# UI Wireframe Descriptions

## Product Principles

- Mobile-first, because many students use phones.
- Core tasks are reachable in three clicks or fewer.
- Status is always visible: draft, submitted, pending, verified, rejected, needs correction.
- Avoid dashboard clutter; show the next action first.
- Pages must work acceptably on slow internet with optimistic UI and retry states.

## Student Dashboard

```text
+------------------------------------------------+
| ScanMark OS            Profile  Notifications  |
+------------------------------------------------+
| Registration Status: Pending Verification       |
| [Continue Registration]                         |
+------------------------------------------------+
| Required Documents                              |
| WAEC              Uploaded        Pending       |
| JAMB              Missing         Upload        |
| Admission Letter  Verified        View          |
+------------------------------------------------+
| This Semester                                    |
| Courses: 8        Attendance: 82%   GPA: 4.12   |
+------------------------------------------------+
| Quick actions: Register | Courses | Results     |
+------------------------------------------------+
```

Behavior:

- Show one primary action: continue registration, fix rejected document, or view verified record.
- Uploads display progress, resume state, and clear failure reason.
- Student can save draft even with missing documents.

## Admin Verification Dashboard

```text
+--------------------------------------------------------------+
| Verification Queue       Pending 142 | Rejected 18 | Done 904 |
+--------------------------------------------------------------+
| Filters: Department  Session  Status  Search                  |
+--------------------------------------------------------------+
| Student             Dept      Status          Submitted       |
| Ada Okafor          CSC       Pending         2h ago          |
| Musa Ibrahim        EEE       Needs Review    4h ago          |
+--------------------------------------------------------------+
| Selected Record                                               |
| Bio Data | Documents | Duplicate Checks | Audit               |
| [Verify] [Reject] [Request Correction]                        |
+--------------------------------------------------------------+
```

Behavior:

- Admin can verify a student without leaving the queue.
- Duplicate checks flag same JAMB number, phone, name/date of birth similarity, or document hash reuse.
- Rejection requires a reason and optional document-specific note.

## Lecturer Attendance Screen

```text
+----------------------------------------------+
| CSC 302 Attendance             Online/Offline |
+----------------------------------------------+
| [Start Session]  [Manual Mark]                |
+----------------------------------------------+
| QR Code Area                                  |
| Rotates every 30 seconds                      |
+----------------------------------------------+
| Synced 84 | Offline 12 | Failed 1 [Retry]     |
+----------------------------------------------+
```

Behavior:

- Lecturer can start QR attendance online.
- If offline, manual records are stored locally and synced later.
- Sync uses device ID and client event IDs to prevent duplicates.

## Results Entry Screen

```text
+------------------------------------------------------+
| CSC 302 Results       Draft       [Save] [Submit]     |
+------------------------------------------------------+
| Student        Matric No     CA /40   Exam /60 Total  |
| Ada Okafor     CSC/20/001    34       51       85     |
| Musa Ibrahim   CSC/20/002    28       43       71     |
+------------------------------------------------------+
| Validation: 2 missing exam scores                     |
+------------------------------------------------------+
```

Behavior:

- Inline validation prevents scores outside allowed ranges.
- Save draft is fast and does not require full completion.
- Submit locks sheet pending admin approval.

## Transcript Screen

```text
+------------------------------------------------+
| Transcript: Ada Okafor                         |
+------------------------------------------------+
| Current Version: v3   Generated: 24 Apr 2026    |
| [Generate New Version] [Download PDF] [Email]   |
+------------------------------------------------+
| Versions                                        |
| v3 Official  Verified hash                      |
| v2 Reissued   Name correction                   |
| v1 Original   Graduation clearance              |
+------------------------------------------------+
```

Behavior:

- Each transcript version is immutable.
- Download links expire.
- Hash and generation reason are visible to authorized staff.

## Low-Bandwidth UX Rules

- Use server-rendered or streamed pages where possible.
- Keep mobile dashboards compact.
- Lazy-load PDF previews, charts, exports, and audit log panels.
- Do not block form progress on slow uploads; show resumable state.
- Cache department/course/session lists locally.
