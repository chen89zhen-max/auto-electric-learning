import { expect, test } from 'vitest';
import { getDatabase } from '@/src/server/db/database';
import type { UserProgressData } from '@/src/types/progress';

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

  const row = database.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get('usr_student1');
  expect(row).toBeDefined();
  const progress = JSON.parse(row!.progress_data) as UserProgressData;
  for (const id of ['D03', 'E01', 'E02', 'C03', 'E03', 'E04', 'E05', 'E07']) {
    progress.levels[id] = { status: 'completed', score: 90, attemptCount: 1, completedAt: new Date(now).toISOString() };
  }
  database.prepare('UPDATE user_progress SET progress_data=?,last_updated=? WHERE user_id=?')
    .run(JSON.stringify(progress), now, 'usr_student1');
});
