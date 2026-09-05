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

function insertAudit(entry: AuditEntry, db: AppDatabase): void {
  const id = `aud_${generateSecureToken(12)}`;
  const ipHash = entry.ip ? hashIp(entry.ip) : null;
  const detailsStr = entry.details
    ? typeof entry.details === 'string'
      ? entry.details
      : JSON.stringify(entry.details)
    : null;

  db.prepare(
    `INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_type, target_id, result, details, ip_hash, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
    Date.now()
  );
}

/** Records best-effort audit events for paths where logging must not hide the primary result. */
export function recordAudit(entry: AuditEntry, db: AppDatabase = getDatabase()): void {
  try {
    insertAudit(entry, db);
  } catch (err) {
    console.error('[Audit Error] Failed to write audit log:', err);
  }
}

/** Records a mandatory audit event and propagates failures to the surrounding transaction. */
export function recordAuditStrict(entry: AuditEntry, db: AppDatabase = getDatabase()): void {
  insertAudit(entry, db);
}
