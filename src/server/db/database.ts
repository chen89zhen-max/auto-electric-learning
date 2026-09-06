import fs from 'node:fs';
import path from 'node:path';
import { bootstrapDefaultDataIfNeeded } from './bootstrap';
import { runPendingMigrations } from './migrationRunner';
import { openProductionDatabase } from './productionDatabase';
import { createTestDatabase } from './testDatabase';

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementAdapter<T = Record<string, unknown>> {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}

export interface AppDatabase {
  exec(sql: string): void;
  prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T>;
  transaction<R>(fn: () => R): R;
  close(): void;
}

let dbInstance: AppDatabase | null = null;

export function setDatabaseInstance(database: AppDatabase | null): void {
  if (dbInstance && dbInstance !== database) {
    try {
      dbInstance.close();
    } catch {}
  }
  dbInstance = database;
}

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DB_PATH) {
    return process.env.TEST_DB_PATH;
  }
  const dataDir = process.env.APP_DATA_DIR || path.join(process.cwd(), 'data');
  if (!path.isAbsolute(dataDir)) throw new Error('APP_DATA_DIR must be an absolute path');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, 'app.db');
}

function applyMigrations(db: AppDatabase): void {
  const directory = process.env.DB_MIGRATIONS_DIR || path.join(process.cwd(), 'src/server/db/migrations');
  runPendingMigrations(db, directory);
}

export function createSqliteAdapter(filePath: string): AppDatabase {
  const adapter = createTestDatabase(filePath);
  applyMigrations(adapter);
  return adapter;
}

export function getDatabase(): AppDatabase {
  if (dbInstance) return dbInstance;
  const dbPath = getDatabasePath();
  if (process.env.NODE_ENV === 'production') {
    const dataDir = process.env.APP_DATA_DIR;
    if (!dataDir) {
      throw new Error('APP_DATA_DIR is required in production');
    }
    dbInstance = openProductionDatabase({ dataDir, filename: 'app.db', busyTimeoutMs: 5000 });
    applyMigrations(dbInstance);
  } else {
    dbInstance = createSqliteAdapter(dbPath);
  }
  if (dbPath !== ':memory:') {
    try {
      bootstrapDefaultDataIfNeeded(dbInstance);
    } catch (err) {
      console.error('[database] bootstrap notice:', err);
    }
  }
  return dbInstance;
}

export function resetDatabaseForTests(): void {
  setDatabaseInstance(null);
}
