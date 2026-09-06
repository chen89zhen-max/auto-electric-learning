import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { createConsistentBackup, enforceRetention } from '@/scripts/backup-sqlite.mjs';
import { restoreDatabase } from '@/scripts/restore-sqlite.mjs';
import { verifyBackup } from '@/scripts/verify-sqlite-backup.mjs';

const temporaryDirectories: string[] = [];
function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-electric-backup-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('verified SQLite backup and restore', () => {
  it('captures committed WAL data and produces a quick_check-clean backup', async () => {
    const root = temporaryDirectory();
    const dataDir = path.join(root, 'data');
    const backupDir = path.join(root, 'backups');
    fs.mkdirSync(dataDir);
    const sourcePath = path.join(dataDir, 'app.db');
    const writer = new DatabaseSync(sourcePath);
    writer.exec('PRAGMA journal_mode=WAL; CREATE TABLE evidence(id TEXT PRIMARY KEY,value TEXT);');
    writer.prepare('INSERT INTO evidence VALUES(?,?)').run('one', 'committed-in-wal');

    const result = await createConsistentBackup({ sourcePath, backupDir, now: new Date('2026-09-05T01:02:03.000Z') });
    writer.close();

    expect(result.dailyPath).toMatch(/app-daily-2026-09-05T01-02-03-000Z\.db$/);
    expect(verifyBackup(result.dailyPath, { backupDir }).quickCheck).toBe('ok');
    const backup = new DatabaseSync(result.dailyPath, { readOnly: true });
    expect((backup.prepare('SELECT value FROM evidence WHERE id=?').get('one') as { value: string } | undefined)?.value).toBe('committed-in-wal');
    backup.close();
  });

  it('removes staging output and never publishes a formal name when backup fails', async () => {
    const root = temporaryDirectory();
    const sourcePath = path.join(root, 'app.db');
    new DatabaseSync(sourcePath).close();
    const backupDir = path.join(root, 'backups');

    await expect(createConsistentBackup({
      sourcePath,
      backupDir,
      backupImplementation: async (_source: DatabaseSync, target: string) => {
        fs.writeFileSync(target, 'incomplete');
        throw new Error('interrupted');
      },
    })).rejects.toThrow('interrupted');
    expect(fs.readdirSync(backupDir)).toEqual([]);
  });

  it('keeps exactly 7 daily, 4 weekly and 12 monthly backups', () => {
    const backupDir = temporaryDirectory();
    for (let i = 0; i < 15; i += 1) {
      const stamp = `2026-${String(i + 1).padStart(2, '0')}-01T00-00-00-000Z`;
      for (const kind of ['daily', 'weekly', 'monthly']) {
        fs.writeFileSync(path.join(backupDir, `app-${kind}-${stamp}.db`), kind);
      }
    }
    fs.writeFileSync(path.join(backupDir, 'app-pre-restore-preserve.db'), 'preserve');

    enforceRetention(backupDir, { daily: 7, weekly: 4, monthly: 12 });

    const files = fs.readdirSync(backupDir);
    expect(files.filter((name) => name.startsWith('app-daily-'))).toHaveLength(7);
    expect(files.filter((name) => name.startsWith('app-weekly-'))).toHaveLength(4);
    expect(files.filter((name) => name.startsWith('app-monthly-'))).toHaveLength(12);
    expect(files).toContain('app-pre-restore-preserve.db');
  });

  it('requires an explicit stopped-app guard and preserves the current database before restore', async () => {
    const root = temporaryDirectory();
    const dataDir = path.join(root, 'data');
    const backupDir = path.join(root, 'backups');
    fs.mkdirSync(dataDir);
    fs.mkdirSync(backupDir);
    const currentPath = path.join(dataDir, 'app.db');
    const backupPath = path.join(backupDir, 'app-daily-2026-09-05T00-00-00-000Z.db');
    const current = new DatabaseSync(currentPath);
    current.exec("CREATE TABLE marker(value TEXT); INSERT INTO marker VALUES('current')");
    current.close();
    const desired = new DatabaseSync(backupPath);
    desired.exec("CREATE TABLE marker(value TEXT); INSERT INTO marker VALUES('backup')");
    desired.close();

    await expect(restoreDatabase({ dataDir, backupDir, backupPath, applicationStopped: false })).rejects.toThrow(/stopped/i);
    const result = await restoreDatabase({ dataDir, backupDir, backupPath, applicationStopped: true, now: new Date('2026-09-05T02:00:00Z') });
    expect(fs.existsSync(result.preservedPath)).toBe(true);
    const restored = new DatabaseSync(currentPath, { readOnly: true });
    expect((restored.prepare('SELECT value FROM marker').get() as { value: string } | undefined)?.value).toBe('backup');
    restored.close();
  });
});
