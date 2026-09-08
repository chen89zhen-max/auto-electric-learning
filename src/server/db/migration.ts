import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppDatabase } from './database';
import { hashPassword } from '../auth/crypto';
import { createBaseUserProgress } from '@/src/types/progress';

interface LegacyUser {
  username: string;
  password?: string;
  realName: string;
  className?: string;
  role?: 'student' | 'admin';
  createdAt?: number;
}

interface LegacyDatabase {
  version: number;
  users: Record<string, LegacyUser>;
  progress: Record<string, unknown>;
}

/**
 * Migrates legacy data/users.json into SQLite database transactionally.
 * Creates an immutable backup file before performing any data transformation.
 */
export function migrateLegacyJsonIfNeeded(db: AppDatabase): {
  migrated: boolean;
  usersCount: number;
  backupFile?: string;
} {
  const dataDir = process.env.APP_DATA_DIR || path.join(process.cwd(), 'data');
  const legacyFile = path.join(dataDir, 'users.json');

  if (!fs.existsSync(legacyFile)) {
    // No legacy file, check if initial admin bootstrap is needed
    bootstrapInitialAdminIfNeeded(db);
    return { migrated: false, usersCount: 0 };
  }

  let legacyContent = '';
  try {
    legacyContent = fs.readFileSync(legacyFile, 'utf-8');
  } catch (err) {
    console.error('[migration] Failed to read legacy users.json:', err);
    return { migrated: false, usersCount: 0 };
  }

  // Create immutable timestamped backup
  const timestamp = Date.now();
  const backupFile = path.join(dataDir, `users.json.bak.${timestamp}`);
  try {
    fs.writeFileSync(backupFile, legacyContent, 'utf-8');
  } catch (err) {
    console.error('[migration] Failed to create backup file, aborting migration:', err);
    throw new Error('Migration aborted: Unable to create backup of legacy data.');
  }

  let legacyDb: LegacyDatabase;
  try {
    legacyDb = JSON.parse(legacyContent) as LegacyDatabase;
  } catch (err) {
    console.error('[migration] Failed to parse legacy JSON:', err);
    return { migrated: false, usersCount: 0, backupFile };
  }

  let count = 0;
  db.transaction(() => {
    const insertUser = db.prepare(
      `INSERT OR IGNORE INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
    );

    const insertProgress = db.prepare(
      `INSERT OR REPLACE INTO user_progress (user_id, progress_data, version, last_updated)
       VALUES (?, ?, 1, ?)`
    );

    const users = legacyDb.users || {};
    const progressMap = legacyDb.progress || {};

    for (const [username, user] of Object.entries(users)) {
      const cleanUsername = username.trim().toLowerCase();
      const userId = `usr_${crypto.createHash('md5').update(cleanUsername).digest('hex')}`;
      const plainPass = user.password || '123456';
      const passwordHash = hashPassword(plainPass);
      const realName = user.realName || cleanUsername;
      const role = user.role === 'admin' ? 'admin' : 'student';
      const className = user.className || '';
      const createdAt = user.createdAt || Date.now();

      insertUser.run(
        userId,
        cleanUsername,
        passwordHash,
        realName,
        role,
        className,
        createdAt,
        createdAt
      );

      if (role === 'student') {
        const prog = progressMap[cleanUsername] || createBaseUserProgress(realName);
        insertProgress.run(
          userId,
          JSON.stringify(prog),
          Date.now()
        );
      }

      count++;
    }
  });

  // Rename migrated file to avoid re-migration
  try {
    fs.renameSync(legacyFile, path.join(dataDir, 'users.json.migrated'));
  } catch {}

  bootstrapInitialAdminIfNeeded(db);

  return { migrated: true, usersCount: count, backupFile };
}

/**
 * Ensures at least one admin account exists in the database.
 */
export function bootstrapInitialAdminIfNeeded(
  db: AppDatabase,
  options: { initialPassword?: string; username?: string } = {}
): boolean {
  const checkAdmin = db.prepare<Record<string, unknown>>(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  const existing = checkAdmin.get();

  if (existing) return false;

  const initialPass = options.initialPassword || process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPass) {
    return false;
  }

  if (!existing) {
    const adminId = `usr_admin_${Date.now()}`;
    const username = (options.username || process.env.ADMIN_INITIAL_USERNAME || 'admin').trim().toLowerCase();
    const passwordHash = hashPassword(initialPass);
    const now = Date.now();

    const insertAdmin = db.prepare(
      `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, '系统管理员', 'admin', '', 'active', 1, ?, ?)`
    );
    insertAdmin.run(adminId, username, passwordHash, now, now);
    return true;
  }

  return false;
}
