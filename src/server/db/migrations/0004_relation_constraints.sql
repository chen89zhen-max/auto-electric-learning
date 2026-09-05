CREATE UNIQUE INDEX IF NOT EXISTS uq_student_class_current
ON student_class(student_id)
WHERE is_current = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_class_active_course
ON teacher_class(teacher_id, class_id, course_id)
WHERE status = 'active';
