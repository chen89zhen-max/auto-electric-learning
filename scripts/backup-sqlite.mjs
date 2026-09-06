import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { backup, DatabaseSync } from 'node:sqlite';
import { verifyBackup } from './verify-sqlite-backup.mjs';

export async function createConsistentBackup(options) {
  const sourcePath = path.resolve(options.sourcePath);
  const backupDir = path.resolve(options.backupDir);
  if (!path.isAbsolute(options.sourcePath) || !path.isAbsolute(options.backupDir)) {
    throw new Error('source and backup directories must be absolute');
  }
  fs.mkdirSync(backupDir, { recursive: true });
  fs.accessSync(backupDir, fs.constants.R_OK | fs.constants.W_OK);
  const now = options.now || new Date();
  const stamp = backupTimestamp(now);
  const dailyPath = path.join(backupDir, `app-daily-${stamp}.db`);
  const stagingPath = path.join(backupDir, `.app-${stamp}-${process.pid}.partial`);
  const backupImplementation = options.backupImplementation || ((database, target) => backup(database, target));
  let source;
  try {
    source = new DatabaseSync(sourcePath, { readOnly: true, timeout: 5000, allowExtension: false });
    await backupImplementation(source, stagingPath);
    verifyBackup(stagingPath, { backupDir });
    fs.renameSync(stagingPath, dailyPath);
    if (now.getDay() === 0) fs.copyFileSync(dailyPath, path.join(backupDir, `app-weekly-${stamp}.db`));
    if (now.getDate() === 1) fs.copyFileSync(dailyPath, path.join(backupDir, `app-monthly-${stamp}.db`));
    enforceRetention(backupDir, options.retention || { daily: 7, weekly: 4, monthly: 12 });
    return { dailyPath };
  } catch (error) {
    if (fs.existsSync(stagingPath)) fs.rmSync(stagingPath, { force: true });
    throw error;
  } finally {
    if (source) source.close();
  }
}

export function enforceRetention(backupDir, limits) {
  const directory = path.resolve(backupDir);
  for (const kind of ['daily', 'weekly', 'monthly']) {
    const matching = fs.readdirSync(directory)
      .filter((name) => new RegExp(`^app-${kind}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z\\.db$`).test(name))
      .sort()
      .reverse();
    for (const expired of matching.slice(limits[kind])) {
      const target = path.resolve(directory, expired);
      const relative = path.relative(directory, target);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) fs.rmSync(target, { force: true });
    }
  }
}

export function backupTimestamp(date) {
  return date.toISOString().replaceAll(':', '-').replace('.', '-');
}

async function main() {
  const dataDir = process.env.APP_DATA_DIR;
  const backupDir = process.env.BACKUP_DIR;
  if (!dataDir || !backupDir || !path.isAbsolute(dataDir) || !path.isAbsolute(backupDir)) {
    throw new Error('absolute APP_DATA_DIR and BACKUP_DIR are required');
  }
  const result = await createConsistentBackup({ sourcePath: path.join(dataDir, 'app.db'), backupDir });
  console.log(JSON.stringify({ status: 'ok', backup: path.basename(result.dailyPath) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[backup]', error instanceof Error ? error.message : 'backup failed');
    process.exit(1);
  });
}
