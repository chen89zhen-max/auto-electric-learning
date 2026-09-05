import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const dataDir = process.env.APP_DATA_DIR;
const migrationDir = process.env.DB_MIGRATIONS_DIR;

try {
  if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('APP_DATA_DIR must be absolute');
  if (!migrationDir || !path.isAbsolute(migrationDir)) throw new Error('DB_MIGRATIONS_DIR must be absolute');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
  fs.accessSync(migrationDir, fs.constants.R_OK);

  if (process.env.CONTAINER_LOCK_HELD !== '1') {
    const lockFile = path.join(dataDir, '.app.lock');
    const child = spawn('flock', [
      '-n', '-E', '73', lockFile,
      'node', 'scripts/container-entrypoint.mjs',
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, CONTAINER_LOCK_HELD: '1' },
    });
    forwardSignals(child);
    child.once('exit', (code) => {
      if (code === 73) console.error('[startup] another application instance holds the SQLite lock');
      process.exit(code ?? 1);
    });
  } else {
    preflightDatabase(path.join(dataDir, 'app.db'), migrationDir);
    const server = spawn('node', ['server.js'], { cwd: process.cwd(), stdio: 'inherit', env: process.env });
    forwardSignals(server);
    server.once('exit', (code) => process.exit(code ?? 1));
  }
} catch (error) {
  console.error('[startup] preflight failed:', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
}

function preflightDatabase(databasePath, migrationsPath) {
  const database = new DatabaseSync(databasePath, {
    timeout: 5000,
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  try {
    database.exec(`
      PRAGMA foreign_keys=ON;
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=FULL;
      PRAGMA busy_timeout=5000;
      PRAGMA wal_autocheckpoint=1000;
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        sha256 TEXT,
        applied_at INTEGER NOT NULL
      );
    `);
    const metadataColumns = database.prepare('PRAGMA table_info(schema_migrations)').all();
    if (!metadataColumns.some((column) => column.name === 'sha256')) {
      database.exec('ALTER TABLE schema_migrations ADD COLUMN sha256 TEXT');
    }
    const files = fs.readdirSync(migrationsPath)
      .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(name))
      .sort();
    const appliedVersion = database.prepare(
      'SELECT COALESCE(MAX(version),0) version FROM schema_migrations'
    ).get()?.version ?? 0;
    if (appliedVersion > files.length) {
      throw new Error(`database schema ${appliedVersion} is newer than this application (${files.length})`);
    }
    files.forEach((filename, index) => {
      const version = Number.parseInt(filename.slice(0, 4), 10);
      if (version !== index + 1) throw new Error(`non-contiguous migration: ${filename}`);
      const sql = fs.readFileSync(path.join(migrationsPath, filename), 'utf8');
      const name = filename.replace(/\.sql$/i, '');
      const sha256 = crypto.createHash('sha256').update(sql).digest('hex');
      const applied = database.prepare(
        'SELECT name,sha256 FROM schema_migrations WHERE version=?'
      ).get(version);
      if (applied) {
        if (applied.name !== name || (applied.sha256 && applied.sha256 !== sha256)) {
          throw new Error(`immutable migration mismatch: ${filename}`);
        }
        if (!applied.sha256) {
          database.prepare('UPDATE schema_migrations SET sha256=? WHERE version=? AND sha256 IS NULL')
            .run(sha256, version);
        }
        return;
      }
      database.exec('BEGIN IMMEDIATE');
      try {
        database.exec(sql);
        database.prepare(
          'INSERT INTO schema_migrations(version,name,sha256,applied_at) VALUES(?,?,?,?)'
        ).run(version, name, sha256, Date.now());
        database.exec('COMMIT');
      } catch (error) {
        try { database.exec('ROLLBACK'); } catch {}
        throw error;
      }
    });
    const quickCheck = database.prepare('PRAGMA quick_check').get();
    if (quickCheck?.quick_check !== 'ok') throw new Error('SQLite quick_check failed');
  } finally {
    database.close();
  }
}

function forwardSignals(child) {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => child.kill(signal));
  }
}
