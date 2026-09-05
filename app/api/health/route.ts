import { NextResponse } from 'next/server';
import { getDatabase } from '@/src/server/db/database';
import { LATEST_SCHEMA_VERSION } from '@/src/server/db/migrationRunner';

export async function GET() {
  try {
    const db = getDatabase();
    const integrity = db.prepare<{ quick_check: string }>('PRAGMA quick_check').get();
    const schema = db.prepare<{ version: number }>('SELECT COALESCE(MAX(version),0) version FROM schema_migrations').get();
    if (integrity?.quick_check !== 'ok' || schema?.version !== LATEST_SCHEMA_VERSION) {
      return NextResponse.json({ status: 'unavailable', database: 'not_ready' }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok', database: 'ready', schemaVersion: schema.version });
  } catch {
    return NextResponse.json({ status: 'unavailable', database: 'not_ready' }, { status: 503 });
  }
}
