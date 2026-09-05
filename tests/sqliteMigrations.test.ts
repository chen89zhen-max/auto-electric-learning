import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runPendingMigrations } from '@/src/server/db/migrationRunner';
import { createTestDatabase } from '@/src/server/db/testDatabase';

const temporaryDirectories: string[] = [];

function migrations(files: Record<string, string>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-electric-migrations-'));
  temporaryDirectories.push(directory);
  for (const [name, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), sql, 'utf8');
  }
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('immutable SQLite migration runner', () => {
  it('applies numbered migrations in order and is idempotent', () => {
    const directory = migrations({
      '0002_second.sql': 'CREATE TABLE second_table (id TEXT PRIMARY KEY);',
      '0001_first.sql': 'CREATE TABLE first_table (id TEXT PRIMARY KEY);',
    });
    const db = createTestDatabase();

    const first = runPendingMigrations(db, directory);
    const second = runPendingMigrations(db, directory);

    expect(first).toMatchObject({ fromVersion: 0, toVersion: 2 });
    expect(first.applied).toEqual(['0001_first.sql', '0002_second.sql']);
    expect(second).toMatchObject({ fromVersion: 2, toVersion: 2, applied: [] });
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='first_table'").get()
    ).toBeDefined();
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='second_table'").get()
    ).toBeDefined();
    db.close();
  });

  it('rolls back the entire migration when one statement fails', () => {
    const directory = migrations({
      '0001_broken.sql': 'CREATE TABLE must_rollback (id TEXT); INVALID SQL;',
    });
    const db = createTestDatabase();

    expect(() => runPendingMigrations(db, directory)).toThrow();
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='must_rollback'").get()
    ).toBeUndefined();
    db.close();
  });

  it('rejects a changed migration that has already been applied', () => {
    const directory = migrations({
      '0001_locked.sql': 'CREATE TABLE locked_table (id TEXT);',
    });
    const db = createTestDatabase();
    runPendingMigrations(db, directory);
    fs.writeFileSync(path.join(directory, '0001_locked.sql'), 'CREATE TABLE changed_table (id TEXT);');

    expect(() => runPendingMigrations(db, directory)).toThrow(/hash/i);
    db.close();
  });

  it('upgrades legacy migration metadata once without replaying applied versions', () => {
    const directory = migrations({
      '0001_init.sql': 'CREATE TABLE should_not_replay (id TEXT);',
    });
    const db = createTestDatabase();
    db.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL);');
    db.prepare('INSERT INTO schema_migrations (version,name,applied_at) VALUES (1,?,?)').run('0001_init', 1);

    const result = runPendingMigrations(db, directory);
    const row = db.prepare<{ sha256: string }>('SELECT sha256 FROM schema_migrations WHERE version=1').get();

    expect(result.applied).toEqual([]);
    expect(row?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='should_not_replay'").get()).toBeUndefined();
    db.close();
  });
});
