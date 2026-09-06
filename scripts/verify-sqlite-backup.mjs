import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export function verifyBackup(filePath, options = {}) {
  if (!path.isAbsolute(filePath)) throw new Error('backup path must be absolute');
  if (options.backupDir) assertInside(path.resolve(options.backupDir), path.resolve(filePath));
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error('backup file is empty or invalid');
  return inspectDatabase(filePath);
}

export function inspectDatabase(filePath) {
  const database = new DatabaseSync(filePath, { readOnly: true, allowExtension: false });
  try {
    const quickCheck = database.prepare('PRAGMA quick_check').get()?.quick_check;
    if (quickCheck !== 'ok') throw new Error(`SQLite quick_check failed: ${quickCheck || 'no result'}`);
    return { quickCheck };
  } finally {
    database.close();
  }
}

function assertInside(directory, candidate) {
  const relative = path.relative(directory, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('backup file must be inside BACKUP_DIR');
  }
}

async function main() {
  const backupDir = process.env.BACKUP_DIR;
  const filePath = process.argv[2];
  if (!backupDir || !path.isAbsolute(backupDir) || !filePath) {
    throw new Error('BACKUP_DIR and an absolute backup file path are required');
  }
  const result = verifyBackup(filePath, { backupDir });
  console.log(JSON.stringify({ status: 'ok', ...result }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[backup-verify]', error instanceof Error ? error.message : 'verification failed');
    process.exit(1);
  });
}
