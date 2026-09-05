import { NextRequest, NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/src/server/admin/adminHttp';
import { getDatabase } from '@/src/server/db/database';

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  result: string;
  details: string | null;
  occurred_at: number;
}

export async function GET(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_AUDIT_LOGS_READ');
  if ('response' in auth) return auth.response;
  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '100', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
  const before = Number.parseInt(url.searchParams.get('before') || String(Number.MAX_SAFE_INTEGER), 10);
  const action = url.searchParams.get('action')?.trim();
  const conditions = ['occurred_at < ?'];
  const params: unknown[] = [Number.isFinite(before) ? before : Number.MAX_SAFE_INTEGER];
  if (action) {
    conditions.push('action=?');
    params.push(action);
  }
  params.push(limit);
  const rows = getDatabase().prepare<AuditRow>(
    `SELECT id,actor_id,actor_username,actor_role,action,target_type,target_id,result,details,occurred_at
     FROM audit_logs WHERE ${conditions.join(' AND ')}
     ORDER BY occurred_at DESC,id DESC LIMIT ?`
  ).all(...params);
  return NextResponse.json({
    success: true,
    logs: rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actorUsername: row.actor_username,
      actorRole: row.actor_role,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      result: row.result,
      details: parseDetails(row.details),
      occurredAt: row.occurred_at,
    })),
  });
}

function parseDetails(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
