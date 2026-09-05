CREATE UNIQUE INDEX IF NOT EXISTS uq_course_version
ON course_versions(course_code, version);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_active
ON learning_attempts(student_id, level_id, status, started_at);

INSERT OR IGNORE INTO course_versions (id, course_code, version, published_at, status)
VALUES ('cv_auto_elec_sprint_0_2_v1', 'auto_elec_base', 'sprint-0-2-v1', 0, 'active');
