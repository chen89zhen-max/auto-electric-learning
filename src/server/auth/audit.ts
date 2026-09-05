import { getDatabase, type AppDatabase } from '../db/database';
import { hashIp, generateSecureToken } from './crypto';

export interface AuditEntry {
  actorId?: string | null;
  actorUsername?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: Record<string, unknown> | string | null;
  ip?: string | null;
}

/**
 * Records a structured audit event into audit_logs table.
 */
export function recordAudit(entry: AuditEntry, db: AppDatabase = getDatabase()): void {
  try {
    const id = `aud_${generateSecureToken(12)}`;
    const ipHash = entry.ip ? hashIp(entry.ip) : null;
    const detailsStr = entry.details
      ? typeof entry.details === 'string'
        ? entry.details
        : JSON.stringify(entry.details)
      : null;
    const now = Date.now();

    const insertStmt = db.prepare(
      `INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_type, target_id, result, details, ip_hash, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertStmt.run(
      id,
      entry.actorId || null,
      entry.actorUsername || null,
      entry.actorRole || null,
      entry.action,
      entry.targetType || null,
      entry.targetId || null,
      entry.result,
      detailsStr,
      ipHash,
      now
    );
  } catch (err) {
    console.error('[Audit Error] Failed to write audit log:', err);
  }
}
