import { expect, test } from 'vitest';
import { getDatabase } from '@/src/server/db/database';

test('initializes only the configured browser database through the existing bootstrap', () => {
  const database = getDatabase();
  const teacher = database.prepare<{ role: string }>('SELECT role FROM users WHERE username = ?').get('teacher');

  expect(teacher?.role).toBe('teacher');

  const now = Date.now();
  const insertE07Attempt = database.prepare(
    `INSERT OR IGNORE INTO learning_attempts
      (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, rubric_version)
     VALUES (?, 'usr_student1', 'class_24new1', 'cv_auto_elec_p1_v1', 'E07', ?, ?, 90, 'completed', 'guided', 'v2')`
  );
  insertE07Attempt.run('browser_e07_chrome', now - 120_000, now);
  insertE07Attempt.run('browser_e07_edge', now - 60_000, now);
});
