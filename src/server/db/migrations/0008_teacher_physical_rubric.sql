-- Migration 0008: Teacher Physical Rubric for E07
ALTER TABLE teacher_evaluations ADD COLUMN evaluation_type TEXT NOT NULL DEFAULT 'FORMATIVE';
ALTER TABLE teacher_evaluations ADD COLUMN rubric_version TEXT DEFAULT NULL;
ALTER TABLE teacher_evaluations ADD COLUMN rubric_data TEXT DEFAULT NULL;
ALTER TABLE teacher_evaluations ADD COLUMN signed_at INTEGER DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_eval_physical_attempt
ON teacher_evaluations(attempt_id, evaluation_type)
WHERE evaluation_type = 'PHYSICAL_RUBRIC' AND attempt_id IS NOT NULL;
