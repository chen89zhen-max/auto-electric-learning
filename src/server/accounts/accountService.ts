import { createBaseUserProgress } from '@/src/types/progress';
import { hashPassword, verifyPassword } from '../auth/crypto';
import { revokeAllUserSessions } from '../auth/session';
import { getDatabase, type AppDatabase } from '../db/database';

export type AccountServiceErrorCode =
  | 'INVALID_CURRENT_PASSWORD'
  | 'WEAK_PASSWORD'
  | 'INVALID_ACTIVATION'
  | 'MISSING_CLASS_RELATION';

export class AccountServiceError extends Error {
  constructor(
    public readonly code: AccountServiceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AccountServiceError';
  }
}

interface AccountRow {
  id: string;
  username: string;
  password_hash: string;
  real_name: string;
  role: 'student' | 'teacher' | 'admin';
  class_name: string;
  status: string;
  must_change_password: number;
}

interface ActivationRow {
  id: string;
  code_hash: string;
}

export function validateNewPassword(password: string): boolean {
  return (
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function changeAccountPassword(
  params: { userId: string; currentPassword: string; newPassword: string },
  db: AppDatabase = getDatabase()
): AccountRow {
  const account = db.prepare<AccountRow>('SELECT * FROM users WHERE id = ?').get(params.userId);
  if (!account || !verifyPassword(params.currentPassword, account.password_hash)) {
    throw new AccountServiceError('INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }
  if (!validateNewPassword(params.newPassword)) {
    throw new AccountServiceError(
      'WEAK_PASSWORD',
      '新密码至少10位，并同时包含字母、数字和特殊字符'
    );
  }

  const now = Date.now();
  const passwordHash = hashPassword(params.newPassword);
  db.transaction(() => {
    db.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?'
    ).run(passwordHash, now, account.id);
    revokeAllUserSessions(account.id, db);
  });

  return { ...account, password_hash: passwordHash, must_change_password: 0 };
}

export function activateStudentAccount(
  params: { username: string; activationCode: string; newPassword: string },
  db: AppDatabase = getDatabase()
): AccountRow {
  if (!validateNewPassword(params.newPassword)) {
    throw new AccountServiceError(
      'WEAK_PASSWORD',
      '新密码至少10位，并同时包含字母、数字和特殊字符'
    );
  }

  const username = params.username.trim().toLowerCase();
  const account = db.prepare<AccountRow>(
    `SELECT * FROM users
     WHERE username = ? AND role = 'student' AND status = 'pending_activation'`
  ).get(username);
  if (!account) {
    throw new AccountServiceError('INVALID_ACTIVATION', '学号或激活码无效');
  }

  const classRow = db.prepare<{ class_name: string }>(
    `SELECT c.name as class_name
     FROM student_class sc
     INNER JOIN classes c ON sc.class_id = c.id
     WHERE sc.student_id = ? AND sc.is_current = 1 AND c.status = 'active'
     LIMIT 1`
  ).get(account.id);
  if (!classRow) {
    throw new AccountServiceError('MISSING_CLASS_RELATION', '账号尚未完成正式归班');
  }

  const now = Date.now();
  const activations = db.prepare<ActivationRow>(
    `SELECT id, code_hash FROM student_activations
     WHERE student_id = ? AND used_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC`
  ).all(account.id, now);
  const activation = activations.find((item) => verifyPassword(params.activationCode, item.code_hash));
  if (!activation) {
    throw new AccountServiceError('INVALID_ACTIVATION', '学号或激活码无效');
  }

  const passwordHash = hashPassword(params.newPassword);
  db.transaction(() => {
    const consume = db.prepare(
      'UPDATE student_activations SET used_at = ? WHERE id = ? AND used_at IS NULL'
    ).run(now, activation.id);
    if (consume.changes !== 1) {
      throw new AccountServiceError('INVALID_ACTIVATION', '学号或激活码无效');
    }

    db.prepare(
      `UPDATE users
       SET password_hash = ?, status = 'active', must_change_password = 0,
           class_name = ?, updated_at = ?
       WHERE id = ? AND status = 'pending_activation'`
    ).run(passwordHash, classRow.class_name, now, account.id);

    const progress = createBaseUserProgress(account.real_name);
    db.prepare(
      `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(user_id) DO NOTHING`
    ).run(account.id, JSON.stringify(progress), now);
    revokeAllUserSessions(account.id, db);
  });

  return {
    ...account,
    password_hash: passwordHash,
    status: 'active',
    class_name: classRow.class_name,
    must_change_password: 0,
  };
}
