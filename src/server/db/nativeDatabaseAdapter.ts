import type { DatabaseSync } from 'node:sqlite';
import type { AppDatabase, RunResult, StatementAdapter } from './database';

export function adaptNativeDatabase(database: DatabaseSync): AppDatabase {
  return {
    exec(sql: string) {
      database.exec(sql);
    },
    prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T> {
      const statement = database.prepare(sql);
      return {
        run(...params: unknown[]) {
          return (statement.run as (...args: unknown[]) => RunResult)(...params);
        },
        get(...params: unknown[]) {
          return (statement.get as (...args: unknown[]) => T | undefined)(...params);
        },
        all(...params: unknown[]) {
          return (statement.all as (...args: unknown[]) => T[])(...params);
        },
      };
    },
    transaction<R>(operation: () => R): R {
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = operation();
        database.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          database.exec('ROLLBACK');
        } catch {}
        throw error;
      }
    },
    close() {
      database.close();
    },
  };
}
