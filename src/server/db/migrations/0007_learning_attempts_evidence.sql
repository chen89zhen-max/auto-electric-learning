-- Migration 0007: Learning Attempts Multi-Attempt & Evidence Framework
ALTER TABLE learning_attempts ADD COLUMN mode TEXT NOT NULL DEFAULT 'guided';
ALTER TABLE learning_attempts ADD COLUMN seed TEXT DEFAULT NULL;
ALTER TABLE learning_attempts ADD COLUMN evidence_data TEXT DEFAULT NULL;
ALTER TABLE learning_attempts ADD COLUMN rubric_version TEXT DEFAULT 'v1';

CREATE INDEX IF NOT EXISTS idx_learning_attempts_replay
ON learning_attempts(student_id, level_id, started_at);

INSERT OR IGNORE INTO course_versions (id, course_code, version, published_at, status)
VALUES ('cv_auto_elec_p1_v1', 'auto_elec_base', 'p1-evidence-v1', 0, 'active');
