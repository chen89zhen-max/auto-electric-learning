import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openProductionDatabase } from '@/src/server/db/productionDatabase';

const temporaryDirectories: string[] = [];

function makeTempDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-electric-sqlite-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('native SQLite production boundary', () => {
  it('rejects a relative production data directory', () => {
    expect(() =>
      openProductionDatabase({ dataDir: './data', filename: 'app.db', busyTimeoutMs: 5000 })
    ).toThrow(/absolute/i);
  });

  it('rejects a data directory that is not a directory', () => {
    const directory = makeTempDirectory();
    const file = path.join(directory, 'not-a-directory');
    fs.writeFileSync(file, 'x');

    expect(() =>
      openProductionDatabase({ dataDir: file, filename: 'app.db', busyTimeoutMs: 5000 })
    ).toThrow(/directory/i);
  });

  it('opens native SQLite with durable production pragmas and integrity checking', () => {
    const directory = makeTempDirectory();
    const db = openProductionDatabase({ dataDir: directory, filename: 'app.db', busyTimeoutMs: 5000 });

    expect(db.prepare<{ journal_mode: string }>('PRAGMA journal_mode').get()?.journal_mode).toBe('wal');
    expect(db.prepare<{ synchronous: number }>('PRAGMA synchronous').get()?.synchronous).toBe(2);
    expect(db.prepare<{ foreign_keys: number }>('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
    expect(db.prepare<{ timeout: number }>('PRAGMA busy_timeout').get()?.timeout).toBe(5000);
    expect(db.prepare<{ quick_check: string }>('PRAGMA quick_check').get()?.quick_check).toBe('ok');
    db.close();
  });

  it('keeps WASM and JSON fallback imports out of the production factory', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/server/db/productionDatabase.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/sql\.js/);
    expect(source).not.toMatch(/memorySqlStore/);
    expect(source).toContain("from 'node:sqlite'");
  });
});
