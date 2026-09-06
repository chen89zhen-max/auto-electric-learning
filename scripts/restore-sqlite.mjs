import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { backupTimestamp } from './backup-sqlite.mjs';
import { inspectDatabase, verifyBackup } from './verify-sqlite-backup.mjs';

export async function restoreDatabase(options) {
  if (!options.applicationStopped) throw new Error('application must be stopped before restore');
  if (!path.isAbsolute(options.dataDir) || !path.isAbsolute(options.backupDir) || !path.isAbsolute(options.backupPath)) {
    throw new Error('restore paths must be absolute');
  }
  const dataDir = path.resolve(options.dataDir);
  const backupDir = path.resolve(options.backupDir);
  const backupPath = path.resolve(options.backupPath);
  assertInside(backupDir, backupPath);
  verifyBackup(backupPath, { backupDir });
  const currentPath = path.join(dataDir, 'app.db');
  if (!fs.existsSync(currentPath)) throw new Error('current app.db does not exist');
  const stamp = backupTimestamp(options.now || new Date());
  const preservedPath = path.join(backupDir, `app-pre-restore-${stamp}.db`);
  const stagingPath = path.join(dataDir, '.app.db.restore.partial');
  if (fs.existsSync(stagingPath)) fs.rmSync(stagingPath, { force: true });
  fs.copyFileSync(backupPath, stagingPath);
  inspectDatabase(stagingPath);

  const current = new DatabaseSync(currentPath, { timeout: 5000, allowExtension: false });
  try { current.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } finally { current.close(); }
  fs.renameSync(currentPath, preservedPath);
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${currentPath}${suffix}`;
    if (fs.existsSync(sidecar)) fs.renameSync(sidecar, `${preservedPath}${suffix}`);
  }
  try {
    fs.renameSync(stagingPath, currentPath);
    inspectDatabase(currentPath);
  } catch (error) {
    if (!fs.existsSync(currentPath) && fs.existsSync(preservedPath)) fs.renameSync(preservedPath, currentPath);
    throw error;
  }
  return { restoredPath: currentPath, preservedPath };
}

function assertInside(directory, candidate) {
  const relative = path.relative(directory, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('restore source must be inside BACKUP_DIR');
  }
}

async function main() {
  const dataDir = process.env.APP_DATA_DIR;
  const backupDir = process.env.BACKUP_DIR;
  const backupPath = process.argv[2];
  const applicationStopped = process.env.APP_STOPPED === 'true';
  if (!dataDir || !backupDir || !backupPath) throw new Error('APP_DATA_DIR, BACKUP_DIR and backup file are required');
  const result = await restoreDatabase({ dataDir, backupDir, backupPath, applicationStopped });
  console.log(JSON.stringify({ status: 'ok', preserved: path.basename(result.preservedPath) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[restore]', error instanceof Error ? error.message : 'restore failed');
    process.exit(1);
  });
}
