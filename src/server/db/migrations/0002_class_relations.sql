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
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_student ON learning_attempts(student_id, level_id);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_class ON learning_attempts(class_id);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_events_attempt ON learning_events(attempt_id);
