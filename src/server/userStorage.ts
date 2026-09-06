import { createBaseUserProgress, type UserProgressData } from '@/src/types/progress';
import { getDatabase } from './db/database';
import { migrateLegacyJsonIfNeeded } from './db/migration';
import { hashPassword } from './auth/crypto';

export type { UserProgressData };
export { createBaseUserProgress };

export interface StoredUser {
  username: string; // 学号或账号
  password: string; // 密码哈希
  realName: string; // 真实姓名
  className: string; // 班级
  role: 'student' | 'admin';
  createdAt: number;
}

export interface UserDatabase {
  version: number;
  users: Record<string, StoredUser>;
  progress: Record<string, UserProgressData>;
}

interface UserDbRow {
  id: string;
  username: string;
  password_hash: string;
  real_name: string;
  class_name: string;
  role: string;
  created_at: number;
}

interface ProgressDbRow {
  user_id: string;
  progress_data: string;
  last_updated: number;
}

let migrationChecked = false;

function ensureInitialized(): void {
  if (!migrationChecked) {
    migrationChecked = true;
    try {
      migrateLegacyJsonIfNeeded(getDatabase());
    } catch (err) {
      console.error('[userStorage] Migration check notice:', err);
    }
  }
}

/**
 * Reads users and progress from the transactional SQLite database.
 */
export async function readDatabase(): Promise<UserDatabase> {
  ensureInitialized();
  const db = getDatabase();

  const userRows = db.prepare<UserDbRow>(
    "SELECT id, username, password_hash, real_name, class_name, role, created_at FROM users WHERE status != 'deleted'"
  ).all();

  const progressRows = db.prepare<ProgressDbRow>(
    'SELECT user_id, progress_data, last_updated FROM user_progress'
  ).all();

  const progressMapByUserId: Record<string, UserProgressData> = {};
  for (const row of progressRows) {
    try {
      progressMapByUserId[row.user_id] = JSON.parse(row.progress_data) as UserProgressData;
    } catch {}
  }

  const users: Record<string, StoredUser> = {};
  const progress: Record<string, UserProgressData> = {};

  for (const row of userRows) {
    const username = row.username.toLowerCase();
    users[username] = {
      username,
      password: row.password_hash,
      realName: row.real_name,
      className: row.class_name,
      role: row.role === 'admin' ? 'admin' : 'student',
      createdAt: row.created_at,
    };

    const userProg = progressMapByUserId[row.id];
    progress[username] = userProg || createBaseUserProgress(row.real_name);
  }

  return {
    version: 1,
    users,
    progress,
  };
}

/**
 * Writes users and progress into the transactional SQLite database.
 */
export async function writeDatabase(data: UserDatabase): Promise<void> {
  ensureInitialized();
  const db = getDatabase();

  db.transaction(() => {
    const upsertUser = db.prepare(
      `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(username) DO UPDATE SET
         password_hash = excluded.password_hash,
         real_name = excluded.real_name,
         role = excluded.role,
         class_name = excluded.class_name,
         updated_at = excluded.updated_at`
    );

    const upsertProgress = db.prepare(
      `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         progress_data = excluded.progress_data,
         last_updated = excluded.last_updated`
    );

    const getUserRow = db.prepare<UserDbRow>(
      'SELECT id, password_hash FROM users WHERE username = ?'
    );

    for (const [rawUsername, user] of Object.entries(data.users)) {
      const cleanUsername = rawUsername.trim().toLowerCase();
      const existing = getUserRow.get(cleanUsername);

      const userId = existing?.id || `usr_${cleanUsername}`;
      // Only re-hash if not already hashed
      let passHash = user.password;
      if (!passHash.startsWith('scrypt$v1$')) {
        passHash = hashPassword(passHash);
      }

      const now = Date.now();
      upsertUser.run(
        userId,
        cleanUsername,
        passHash,
        user.realName,
        user.role,
        user.className || '',
        user.createdAt || now,
        now
      );

      const prog = data.progress[cleanUsername] || createBaseUserProgress(user.realName);
      upsertProgress.run(userId, JSON.stringify(prog), now);
    }
  });
}
