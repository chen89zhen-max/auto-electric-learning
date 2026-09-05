import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AppDatabase } from './database';
import { adaptNativeDatabase } from './nativeDatabaseAdapter';

export interface ProductionDatabaseConfig {
  dataDir: string;
  filename: 'app.db';
  busyTimeoutMs: 5000;
}

export function openProductionDatabase(config: ProductionDatabaseConfig): AppDatabase {
  if (!path.isAbsolute(config.dataDir)) {
    throw new Error('APP_DATA_DIR must be an absolute path');
  }
  const stat = fs.statSync(config.dataDir);
  if (!stat.isDirectory()) {
    throw new Error('APP_DATA_DIR must identify a directory');
  }
  fs.accessSync(config.dataDir, fs.constants.R_OK | fs.constants.W_OK);

  const resolvedDataDir = path.resolve(config.dataDir);
  const databasePath = path.resolve(resolvedDataDir, config.filename);
  const relative = path.relative(resolvedDataDir, databasePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Database path must remain inside APP_DATA_DIR');
  }

  const nativeDatabase = new DatabaseSync(databasePath, {
    timeout: config.busyTimeoutMs,
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  const database = adaptNativeDatabase(nativeDatabase);
  try {
    database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = ${config.busyTimeoutMs};
      PRAGMA wal_autocheckpoint = 1000;
    `);
    const result = database.prepare<{ quick_check: string }>('PRAGMA quick_check').get();
    if (result?.quick_check !== 'ok') {
      throw new Error(`SQLite quick_check failed: ${result?.quick_check ?? 'no result'}`);
    }
    return database;
  } catch (error) {
    try {
      database.close();
    } catch {}
    throw error;
  }
}
