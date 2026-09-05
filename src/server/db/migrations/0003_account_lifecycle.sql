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
CREATE INDEX IF NOT EXISTS idx_student_activations_lookup ON student_activations(student_id, used_at, expires_at);

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
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_student ON teacher_evaluations(student_id, created_at);

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
