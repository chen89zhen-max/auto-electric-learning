CREATE UNIQUE INDEX IF NOT EXISTS uq_progress_correction_requested
ON progress_corrections(student_id, ifnull(attempt_id, ''))
WHERE status = 'requested';
