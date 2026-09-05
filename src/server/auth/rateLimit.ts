import { getDatabase, type AppDatabase } from '../db/database';
import { hashIp, generateSecureToken } from './crypto';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

/**
 * Checks if a login attempt is rate limited due to too many recent failures.
 */
export function checkLoginRateLimit(
  identifier: string,
  ip: string,
  options?: {
    maxAttempts?: number;
    windowMs?: number;
    db?: AppDatabase;
  }
): RateLimitResult {
  const db = options?.db || getDatabase();
  const maxAttempts = options?.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const windowMs = options?.windowMs || DEFAULT_WINDOW_MS;

  const cleanIdentifier = identifier.trim().toLowerCase();
  const ipHash = hashIp(ip);
  const now = Date.now();
  const windowStart = now - windowMs;

  const query = db.prepare<{ failed_count: number; oldest_attempt: number }>(
    `SELECT COUNT(*) as failed_count, MIN(attempted_at) as oldest_attempt
     FROM login_attempts
     WHERE (identifier = ? OR ip_hash = ?) AND attempted_at > ? AND success = 0`
  );

  const row = query.get(cleanIdentifier, ipHash, windowStart);
  const failedCount = row?.failed_count || 0;

  if (failedCount >= maxAttempts) {
    const oldest = row?.oldest_attempt || windowStart;
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - failedCount,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a login attempt (success or failure) for brute-force auditing and defense.
 */
export function recordLoginAttempt(
  identifier: string,
  ip: string,
  success: boolean,
  db: AppDatabase = getDatabase()
): void {
  const id = `att_${generateSecureToken(12)}`;
  const cleanIdentifier = identifier.trim().toLowerCase();
  const ipHash = hashIp(ip);
  const now = Date.now();

  const insertStmt = db.prepare(
    `INSERT INTO login_attempts (id, identifier, ip_hash, success, attempted_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  insertStmt.run(id, cleanIdentifier, ipHash, success ? 1 : 0, now);

  // Optional: clear consecutive failure count on successful login
  if (success) {
    try {
      const deleteStmt = db.prepare(
        'DELETE FROM login_attempts WHERE identifier = ? AND success = 0'
      );
      deleteStmt.run(cleanIdentifier);
    } catch {}
  }
}
