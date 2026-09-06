import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AppDatabase } from './database';

export const LATEST_SCHEMA_VERSION = 8;

interface MigrationFile {
  version: number;
  filename: string;
  name: string;
  sql: string;
  sha256: string;
}

interface AppliedMigrationRow {
  version: number;
  name: string;
  sha256: string | null;
}

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  applied: string[];
}

function loadMigrationFiles(directory: string): MigrationFile[] {
  if (!path.isAbsolute(directory)) {
    throw new Error('Migration directory must be absolute');
  }
  const files = fs.readdirSync(directory)
    .filter((filename) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(filename))
    .sort();
  const migrations = files.map((filename) => {
    const version = Number.parseInt(filename.slice(0, 4), 10);
    const sql = fs.readFileSync(path.join(directory, filename), 'utf8');
    return {
      version,
      filename,
      name: filename.replace(/\.sql$/i, ''),
      sql,
      sha256: crypto.createHash('sha256').update(sql, 'utf8').digest('hex'),
    };
  });
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(`Migration versions must be contiguous from 0001; found ${migration.filename}`);
    }
  });
  return migrations;
}

function ensureMetadataSchema(db: AppDatabase): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sha256 TEXT,
    applied_at INTEGER NOT NULL
  );`);
  const columns = db.prepare<{ name: string }>('PRAGMA table_info(schema_migrations)').all();
  if (!columns.some((column) => column.name === 'sha256')) {
    db.exec('ALTER TABLE schema_migrations ADD COLUMN sha256 TEXT;');
  }
}

export function runPendingMigrations(db: AppDatabase, directory: string): MigrationResult {
  const migrations = loadMigrationFiles(path.resolve(directory));
  ensureMetadataSchema(db);
  const appliedRows = db.prepare<AppliedMigrationRow>(
    'SELECT version,name,sha256 FROM schema_migrations ORDER BY version'
  ).all();
  const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]));
  const fromVersion = appliedRows.at(-1)?.version ?? 0;
  const latestAvailableVersion = migrations.at(-1)?.version ?? 0;
  if (fromVersion > latestAvailableVersion) {
    throw new Error(`Database schema ${fromVersion} is newer than application schema ${latestAvailableVersion}`);
  }
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    const existing = appliedByVersion.get(migration.version);
    if (existing) {
      if (existing.name !== migration.name) {
        throw new Error(`Migration name mismatch at version ${migration.version}`);
      }
      if (existing.sha256 && existing.sha256 !== migration.sha256) {
        throw new Error(`Migration hash mismatch for ${migration.filename}`);
      }
      if (!existing.sha256) {
        db.prepare('UPDATE schema_migrations SET sha256=? WHERE version=? AND sha256 IS NULL')
          .run(migration.sha256, migration.version);
      }
      continue;
    }

    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version,name,sha256,applied_at) VALUES (?,?,?,?)'
      ).run(migration.version, migration.name, migration.sha256, Date.now());
    });
    newlyApplied.push(migration.filename);
  }

  const toVersion = latestAvailableVersion || fromVersion;
  return { fromVersion, toVersion, applied: newlyApplied };
}
