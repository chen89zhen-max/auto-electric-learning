import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const APP_UID = 10001;
const APP_GID = 10001;
const dataDir = process.env.APP_DATA_DIR;
const backupDir = process.env.BACKUP_DIR;
const migrationDir = process.env.DB_MIGRATIONS_DIR;

try {
  if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('APP_DATA_DIR must be absolute');
  if (!backupDir || !path.isAbsolute(backupDir)) throw new Error('BACKUP_DIR must be absolute');
  if (!migrationDir || !path.isAbsolute(migrationDir)) throw new Error('DB_MIGRATIONS_DIR must be absolute');

  if (process.getuid?.() === 0) {
    assertExpectedRootMount(dataDir, '/app/data');
    assertExpectedRootMount(backupDir, '/app/backups');
    preparePersistentDirectory(dataDir);
    preparePersistentDirectory(backupDir);
    console.log('[startup] persistent directories ready');

    const child = spawn(process.execPath, ['scripts/container-entrypoint.mjs'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      uid: APP_UID,
      gid: APP_GID,
      env: process.env,
    });
    forwardSignals(child);
    child.once('exit', (code) => process.exit(code ?? 1));
  } else {
    runApplication();
  }
} catch (error) {
  console.error('[startup] preflight failed:', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
}

function runApplication() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
  fs.accessSync(backupDir, fs.constants.R_OK | fs.constants.W_OK);
  fs.accessSync(migrationDir, fs.constants.R_OK);

  if (process.env.CONTAINER_LOCK_HELD !== '1') {
    const lockFile = path.join(dataDir, '.app.lock');
    const child = spawn('flock', [
      '-F', '-n', '-E', '73', lockFile,
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
    console.log('[startup] database preflight passed');
    const server = spawn('node', ['server.js'], { cwd: process.cwd(), stdio: 'inherit', env: process.env });
    forwardSignals(server);
    server.once('exit', (code) => process.exit(code ?? 1));
  }
}

function assertExpectedRootMount(actual, expected) {
  if (path.resolve(actual) !== expected) {
    throw new Error(`refusing root permission repair outside ${expected}: ${actual}`);
  }
}

function preparePersistentDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  repairOwnershipAndMode(directory);
}

function repairOwnershipAndMode(target) {
  const stats = fs.lstatSync(target);
  if (stats.isSymbolicLink()) throw new Error(`persistent path must not contain symbolic links: ${target}`);
  if (!stats.isDirectory() && !stats.isFile()) {
    throw new Error(`persistent path contains an unsupported file type: ${target}`);
  }

  fs.chownSync(target, APP_UID, APP_GID);
  fs.chmodSync(target, stats.isDirectory() ? 0o700 : 0o600);
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      repairOwnershipAndMode(path.join(target, entry));
    }
  }
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
    const administrator = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    const legacyAdministrator = legacyDatabaseHasAdministrator(path.join(dataDir, 'users.json'));
    if (!administrator && !legacyAdministrator && !process.env.ADMIN_INITIAL_PASSWORD?.trim()) {
      throw new Error('ADMIN_INITIAL_PASSWORD is required when the database has no administrator');
    }
  } finally {
    database.close();
  }
}

function legacyDatabaseHasAdministrator(legacyPath) {
  if (!fs.existsSync(legacyPath)) return false;
  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  } catch {
    throw new Error('legacy users.json is not valid JSON');
  }
  return Object.values(legacy?.users ?? {}).some((user) => user?.role === 'admin');
}

function forwardSignals(child) {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => child.kill(signal));
  }
}
