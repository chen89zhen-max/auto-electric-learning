import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as healthGet } from '@/app/api/health/route';
import { createSqliteAdapter, setDatabaseInstance } from '@/src/server/db/database';
import { LATEST_SCHEMA_VERSION } from '@/src/server/db/migrationRunner';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

beforeEach(() => setDatabaseInstance(createSqliteAdapter(':memory:')));

describe('Synology single-instance deployment configuration', () => {
  it('builds on pinned Node 24, repairs bind mounts as root, then runs the app as uid 10001', () => {
    const dockerfile = read('Dockerfile');
    const entrypoint = read('scripts/container-entrypoint.mjs');
    expect(dockerfile).toContain('node:24.20.0-bookworm-slim');
    expect(dockerfile).toMatch(/USER\s+root/);
    expect(dockerfile).toContain('dist/standalone');
    expect(dockerfile).toContain('container-entrypoint.mjs');
    expect(entrypoint).toContain('fs.chownSync');
    expect(entrypoint).toContain('fs.chmodSync');
    expect(entrypoint).toContain("assertExpectedRootMount(dataDir, '/app/data')");
    expect(entrypoint).toContain("assertExpectedRootMount(backupDir, '/app/backups')");
    expect(entrypoint).not.toContain('CONTAINER_PRIVILEGES_DROPPED');
    expect(entrypoint).toContain('uid: APP_UID');
    expect(entrypoint).toContain('gid: APP_GID');
  });

  it('defines one app service, persistent volumes, restart, health and bounded logs without secrets', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toMatch(/services:\s*\r?\n\s{2}app:/);
    expect(compose).toContain('./data:/app/data');
    expect(compose).toContain('./backups:/app/backups');
    expect(compose).toContain('restart: unless-stopped');
    expect(compose).toContain('healthcheck:');
    expect(compose).toContain('max-size: "10m"');
    expect(compose).toContain('max-file: "5"');
    expect(compose).not.toMatch(/replicas:\s*[2-9]/);
  });

  it('defaults to the working Synology host port without requiring a local env file', () => {
    const compose = read('docker-compose.yml');
    const exampleEnv = read('.env.production.example');

    expect(compose).toContain('${BIND_ADDRESS:-0.0.0.0}:${APP_PORT:-3001}:3000');
    expect(exampleEnv).toContain('BIND_ADDRESS=0.0.0.0');
    expect(exampleEnv).toContain('APP_PORT=3001');
  });

  it('accepts a missing env file but rejects a fresh database without an administrator password at startup', () => {
    const compose = read('docker-compose.yml');
    const exampleEnv = read('.env.production.example');

    expect(compose).toContain('ADMIN_INITIAL_USERNAME: ${ADMIN_INITIAL_USERNAME:-admin}');
    expect(compose).toContain('ADMIN_INITIAL_PASSWORD: "${ADMIN_INITIAL_PASSWORD:-}"');
    expect(exampleEnv).toContain('ADMIN_INITIAL_PASSWORD=');
    expect(exampleEnv).not.toMatch(/ADMIN_INITIAL_PASSWORD=.+/);
  });

  it('fails a real fresh database preflight with a clear message when the administrator password is absent', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'container-entrypoint-'));
    const dataDir = path.join(sandbox, 'data');
    const backupDir = path.join(sandbox, 'backups');
    fs.mkdirSync(backupDir);

    try {
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/container-entrypoint.mjs')], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          APP_DATA_DIR: dataDir,
          BACKUP_DIR: backupDir,
          DB_MIGRATIONS_DIR: path.join(root, 'src/server/db/migrations'),
          CONTAINER_LOCK_HELD: '1',
          ADMIN_INITIAL_PASSWORD: '',
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('ADMIN_INITIAL_PASSWORD is required when the database has no administrator');
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('allows a legacy users.json containing an administrator to reach the application migration path', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'container-legacy-'));
    const dataDir = path.join(sandbox, 'data');
    const backupDir = path.join(sandbox, 'backups');
    fs.mkdirSync(dataDir);
    fs.mkdirSync(backupDir);
    fs.writeFileSync(path.join(sandbox, 'server.js'), 'process.exit(0);\n');
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify({
      version: 1,
      users: {
        legacy_admin: {
          username: 'legacy_admin',
          password: 'Legacy#2026',
          realName: '旧管理员',
          role: 'admin',
        },
      },
      progress: {},
    }));

    try {
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/container-entrypoint.mjs')], {
        cwd: sandbox,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          APP_DATA_DIR: dataDir,
          BACKUP_DIR: backupDir,
          DB_MIGRATIONS_DIR: path.join(root, 'src/server/db/migrations'),
          CONTAINER_LOCK_HELD: '1',
          ADMIN_INITIAL_PASSWORD: '',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('[startup] database preflight passed');
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('starts an existing SQLite deployment without retaining the initial administrator password', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'container-existing-'));
    const dataDir = path.join(sandbox, 'data');
    const backupDir = path.join(sandbox, 'backups');
    fs.mkdirSync(dataDir);
    fs.mkdirSync(backupDir);
    fs.writeFileSync(path.join(sandbox, 'server.js'), 'process.exit(0);\n');
    const database = createSqliteAdapter(path.join(dataDir, 'app.db'));
    const now = Date.now();
    database.prepare(
      `INSERT INTO users
       (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', '', 'active', 0, ?, ?)`
    ).run('existing-admin', 'admin', 'unused-in-this-test', '管理员', now, now);
    database.close();

    try {
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/container-entrypoint.mjs')], {
        cwd: sandbox,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          APP_DATA_DIR: dataDir,
          BACKUP_DIR: backupDir,
          DB_MIGRATIONS_DIR: path.join(root, 'src/server/db/migrations'),
          CONTAINER_LOCK_HELD: '1',
          ADMIN_INITIAL_PASSWORD: '',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('[startup] database preflight passed');
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('runs maintenance backups as the same non-root uid that owns persistent data', () => {
    const compose = read('docker-compose.yml');
    const backupSection = compose.split(/\r?\n  backup:/)[1] ?? '';

    expect(backupSection).toContain('user: "10001:10001"');
  });

  it('ignores local databases, backups, secrets and repository metadata in the build context', () => {
    const ignore = read('.dockerignore');
    for (const entry of ['data', 'backups', '.env', '.git']) expect(ignore).toContain(entry);
  });

  it('entrypoint obtains flock and validates native SQLite, migrations and quick_check before the server', () => {
    const entrypoint = read('scripts/container-entrypoint.mjs');
    expect(entrypoint).toContain("'flock'");
    expect(entrypoint).toContain("'-F'");
    expect(entrypoint).toContain('DatabaseSync');
    expect(entrypoint).toContain('schema_migrations');
    expect(entrypoint).toContain('quick_check');
    expect(entrypoint).toContain('[startup] persistent directories ready');
    expect(entrypoint).toContain('[startup] database preflight passed');
    expect(entrypoint.indexOf('preflightDatabase(path.join')).toBeLessThan(entrypoint.indexOf("['server.js']"));
  });

  it('health response exposes readiness and schema version but no database path or row counts', async () => {
    const response = await healthGet();
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ready', schemaVersion: LATEST_SCHEMA_VERSION });
    expect(JSON.stringify(body)).not.toMatch(/app\.db|path|rowCount|users/i);
  });
});
