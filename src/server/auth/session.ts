import { getDatabase, type AppDatabase } from '../db/database';
import { generateSecureToken, hashToken, hashIp } from './crypto';

export const SESSION_COOKIE_NAME = 'nev_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedUser {
  id: string;
  username: string;
  realName: string;
  role: 'student' | 'teacher' | 'admin';
  className: string;
  mustChangePassword: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  role: string;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
}

interface UserRow {
  id: string;
  username: string;
  real_name: string;
  role: 'student' | 'teacher' | 'admin';
  class_name: string;
  status: string;
  must_change_password: number;
  sess_id: string;
  sess_created_at: number;
  sess_expires_at: number;
  sess_last_active_at: number;
}

/**
 * Creates a new secure server-side session and returns token and cookie header.
 */
export function createSession(
  userId: string,
  role: string,
  options?: { ip?: string; userAgent?: string; db?: AppDatabase }
): { token: string; cookieHeader: string; expiresAt: number; sessionId: string } {
  const db = options?.db || getDatabase();
  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  const sessionId = `sess_${generateSecureToken(12)}`;
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const ipHash = options?.ip ? hashIp(options.ip) : null;
  const userAgent = options?.userAgent ? options.userAgent.slice(0, 255) : null;

  const insertSession = db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, role, created_at, expires_at, last_active_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertSession.run(sessionId, userId, tokenHash, role, now, expiresAt, now, ipHash, userAgent);

  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const cookieHeader = `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;

  return { token, cookieHeader, expiresAt, sessionId };
}

/**
 * Validates a session token against the database.
 * Returns the authenticated user and session details if valid, or null.
 */
export function validateSession(
  token: string,
  db: AppDatabase = getDatabase()
): { user: AuthenticatedUser; session: SessionRecord } | null {
  if (!token || typeof token !== 'string') return null;

  const tokenHash = hashToken(token);
  const query = db.prepare<UserRow>(
    `SELECT 
       u.id, u.username, u.real_name, u.role, u.class_name, u.status, u.must_change_password,
       s.id as sess_id, s.created_at as sess_created_at, s.expires_at as sess_expires_at, s.last_active_at as sess_last_active_at
     FROM sessions s
     INNER JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL
     LIMIT 1`
  );

  const row = query.get(tokenHash);
  if (!row) return null;

  const now = Date.now();
  if (row.sess_expires_at <= now || row.status !== 'active') {
    return null;
  }

  // Update last active time (sliding window, max once per minute)
  if (now - row.sess_last_active_at > 60_000) {
    try {
      const updateActive = db.prepare(
        'UPDATE sessions SET last_active_at = ? WHERE id = ?'
      );
      updateActive.run(now, row.sess_id);
    } catch {}
  }

  return {
    user: {
      id: row.id,
      username: row.username,
      realName: row.real_name,
      role: row.role,
      className: row.class_name,
      mustChangePassword: row.must_change_password === 1,
    },
    session: {
      id: row.sess_id,
      userId: row.id,
      tokenHash,
      role: row.role,
      createdAt: row.sess_created_at,
      expiresAt: row.sess_expires_at,
      lastActiveAt: now,
    },
  };
}

/**
 * Revokes a specific session (e.g. user logout).
 */
export function revokeSession(token: string, db: AppDatabase = getDatabase()): void {
  if (!token) return;
  const tokenHash = hashToken(token);
  const now = Date.now();
  const revokeStmt = db.prepare(
    'UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
  );
  revokeStmt.run(now, tokenHash);
}

/**
 * Revokes all sessions for a user (e.g. password change, admin termination).
 */
export function revokeAllUserSessions(userId: string, db: AppDatabase = getDatabase()): void {
  const now = Date.now();
  const revokeStmt = db.prepare(
    'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
  );
  revokeStmt.run(now, userId);
}

/**
 * Generates an HTTP Set-Cookie header to clear the session cookie.
 */
export function createClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
