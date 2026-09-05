import { DatabaseSync } from 'node:sqlite';
import type { AppDatabase } from './database';
import { adaptNativeDatabase } from './nativeDatabaseAdapter';

export function createTestDatabase(filePath: string = ':memory:'): AppDatabase {
  const nativeDatabase = new DatabaseSync(filePath, {
    timeout: 5000,
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  const database = adaptNativeDatabase(nativeDatabase);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return database;
}
