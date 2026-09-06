-- Schema version 1: Core User, Session, Progress, Security, and Audit Tables
-- Schema version 2: Multi-Teacher, Class Relations, and Learning Attempts

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
  class_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_activation' CHECK(status IN ('pending_activation', 'active', 'suspended', 'locked', 'deleted')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  revoked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY,
  progress_data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL COLLATE NOCASE,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(identifier, ip_hash, attempted_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_username TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  result TEXT NOT NULL,
  details TEXT,
  ip_hash TEXT,
  occurred_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);

-- Phase 2 Tables: Classes and Relationships
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL DEFAULT 'default_school',
  name TEXT UNIQUE NOT NULL COLLATE NOCASE,
  grade TEXT NOT NULL DEFAULT '',
  cohort_year INTEGER NOT NULL DEFAULT 2024,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

CREATE TABLE IF NOT EXISTS teacher_class (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'auto_elec_base',
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_lookup ON teacher_class(teacher_id, class_id, status);

CREATE TABLE IF NOT EXISTS student_class (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK(is_current IN (0, 1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_class_lookup ON student_class(student_id, is_current);
CREATE INDEX IF NOT EXISTS idx_student_class_class ON student_class(class_id, is_current);

CREATE TABLE IF NOT EXISTS course_versions (
  id TEXT PRIMARY KEY,
  course_code TEXT NOT NULL DEFAULT 'auto_elec_base',
  version TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS learning_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  course_version_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  score INTEGER,
  status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'abandoned')),
  mode TEXT NOT NULL DEFAULT 'guided',
  seed TEXT DEFAULT NULL,
  evidence_data TEXT DEFAULT NULL,
  rubric_version TEXT DEFAULT 'v1',
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_student ON learning_attempts(student_id, level_id);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_class ON learning_attempts(class_id);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_replay ON learning_attempts(student_id, level_id, started_at);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_events_attempt ON learning_events(attempt_id);

CREATE TABLE IF NOT EXISTS student_activations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_student_activations_lookup
ON student_activations(student_id, used_at, expires_at);

CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  score INTEGER,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_student
ON teacher_evaluations(student_id, created_at);

CREATE TABLE IF NOT EXISTS progress_corrections (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('requested', 'approved', 'rejected', 'executed')),
  decided_by TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);
