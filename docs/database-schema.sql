-- ScanMark OS PostgreSQL schema blueprint.
-- Use this as the baseline for migrations; large production tables should be partitioned in dedicated migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_status AS ENUM ('active', 'disabled', 'invited');
CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'admin', 'super_admin');
CREATE TYPE verification_status AS ENUM ('draft', 'submitted', 'pending', 'verified', 'rejected', 'needs_correction');
CREATE TYPE attendance_source AS ENUM ('qr', 'manual', 'offline_sync');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'dropped', 'completed');
CREATE TYPE result_status AS ENUM ('draft', 'submitted', 'approved', 'published', 'rejected');
CREATE TYPE export_status AS ENUM ('queued', 'processing', 'completed', 'failed');

CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  faculty_id UUID NOT NULL REFERENCES faculties(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (university_id, name)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id),
  email CITEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, email)
);

CREATE UNIQUE INDEX idx_users_global_email ON users (email) WHERE university_id IS NULL;

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university_id UUID REFERENCES universities(id),
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  user_id UUID UNIQUE REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  matric_no TEXT,
  jamb_registration_no TEXT,
  surname TEXT NOT NULL,
  first_name TEXT NOT NULL,
  other_names TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 100 AND 900),
  admission_year INTEGER NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  record_status verification_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, matric_no),
  UNIQUE (university_id, jamb_registration_no)
);

CREATE INDEX idx_students_university_department ON students (university_id, department_id, level);
CREATE INDEX idx_students_name_search ON students USING gin (to_tsvector('simple', surname || ' ' || first_name || ' ' || coalesce(matric_no, '')));

CREATE TABLE student_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  student_id UUID NOT NULL REFERENCES students(id),
  academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
  status verification_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, student_id, academic_session_id)
);

CREATE INDEX idx_registrations_dashboard ON student_registrations (university_id, academic_session_id, status, submitted_at DESC);

CREATE TABLE registration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  registration_id UUID NOT NULL REFERENCES student_registrations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status verification_status NOT NULL DEFAULT 'pending',
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  UNIQUE (registration_id, document_type, version)
);

CREATE INDEX idx_registration_documents_review ON registration_documents (university_id, status, uploaded_at DESC);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  credit_units INTEGER NOT NULL CHECK (credit_units BETWEEN 1 AND 12),
  level INTEGER NOT NULL,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (university_id, code)
);

CREATE TABLE lecturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  staff_no TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, staff_no)
);

CREATE TABLE course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
  lecturer_id UUID REFERENCES lecturers(id),
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, course_id, academic_session_id)
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  student_id UUID NOT NULL REFERENCES students(id),
  course_offering_id UUID NOT NULL REFERENCES course_offerings(id),
  status enrollment_status NOT NULL DEFAULT 'enrolled',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dropped_at TIMESTAMPTZ,
  UNIQUE (student_id, course_offering_id)
);

CREATE INDEX idx_enrollments_student ON enrollments (university_id, student_id, status);
CREATE INDEX idx_enrollments_offering ON enrollments (university_id, course_offering_id, status);

CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  course_offering_id UUID NOT NULL REFERENCES course_offerings(id),
  opened_by UUID NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  qr_nonce_hash TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_sessions_course ON attendance_sessions (university_id, course_offering_id, starts_at DESC);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  source attendance_source NOT NULL,
  marked_by UUID REFERENCES users(id),
  device_id TEXT,
  client_event_id TEXT,
  client_recorded_at TIMESTAMPTZ,
  server_recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_batch_id UUID,
  notes TEXT,
  UNIQUE (attendance_session_id, student_id),
  UNIQUE (university_id, device_id, client_event_id)
);

CREATE INDEX idx_attendance_records_student ON attendance_records (university_id, student_id, server_recorded_at DESC);

CREATE TABLE result_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  course_offering_id UUID NOT NULL REFERENCES course_offerings(id),
  status result_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, course_offering_id)
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  result_sheet_id UUID NOT NULL REFERENCES result_sheets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  ca_score NUMERIC(5,2) NOT NULL CHECK (ca_score BETWEEN 0 AND 40),
  exam_score NUMERIC(5,2) NOT NULL CHECK (exam_score BETWEEN 0 AND 60),
  total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade TEXT,
  grade_point NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (result_sheet_id, student_id)
);

CREATE INDEX idx_results_student ON results (university_id, student_id);

CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  student_id UUID NOT NULL REFERENCES students(id),
  current_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, student_id)
);

CREATE TABLE transcript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256_hash TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  UNIQUE (transcript_id, version)
);

CREATE TABLE verification_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  status export_status NOT NULL DEFAULT 'queued',
  object_key TEXT,
  sha256_hash TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_verification_exports_status ON verification_exports (university_id, status, created_at DESC);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  request_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_time ON audit_logs (university_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING gin (metadata);

-- Large-table production notes:
-- 1. Partition audit_logs monthly once writes become large.
-- 2. Partition attendance_records by academic session or month for very large schools.
-- 3. Use read replicas for reporting/transcript preview queries.
-- 4. Add PostgreSQL Row Level Security after repository-level tenant filters are stable.
