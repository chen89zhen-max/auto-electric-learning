import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as healthGet } from '@/app/api/health/route';
import { createSqliteAdapter, setDatabaseInstance } from '@/src/server/db/database';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

beforeEach(() => setDatabaseInstance(createSqliteAdapter(':memory:')));

describe('Synology single-instance deployment configuration', () => {
  it('builds on pinned Node 24 and runs as a non-root user with the standalone artifact', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toContain('node:24.20.0-bookworm-slim');
    expect(dockerfile).toMatch(/USER\s+app/);
    expect(dockerfile).toContain('dist/standalone');
    expect(dockerfile).toContain('container-entrypoint.mjs');
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
    expect(compose).not.toMatch(/password\s*:/i);
    expect(compose).not.toMatch(/replicas:\s*[2-9]/);
  });

  it('ignores local databases, backups, secrets and repository metadata in the build context', () => {
    const ignore = read('.dockerignore');
    for (const entry of ['data', 'backups', '.env', '.git']) expect(ignore).toContain(entry);
  });

  it('entrypoint obtains flock and validates native SQLite, migrations and quick_check before the server', () => {
    const entrypoint = read('scripts/container-entrypoint.mjs');
    expect(entrypoint).toContain("'flock'");
    expect(entrypoint).toContain('DatabaseSync');
    expect(entrypoint).toContain('schema_migrations');
    expect(entrypoint).toContain('quick_check');
    expect(entrypoint.indexOf('preflightDatabase(path.join')).toBeLessThan(entrypoint.indexOf("['server.js']"));
  });

  it('health response exposes readiness and schema version but no database path or row counts', async () => {
    const response = await healthGet();
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ready', schemaVersion: 6 });
    expect(JSON.stringify(body)).not.toMatch(/app\.db|path|rowCount|users/i);
  });
});
