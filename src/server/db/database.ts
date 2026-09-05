import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js';
import { bootstrapDefaultDataIfNeeded } from './bootstrap';
import { MemorySqlDatabase } from './memorySqlStore';

let sqlJsModule: SqlJsStatic | null = null;
try {
  sqlJsModule = await initSqlJs();
} catch {
  // sql.js top-level await fallback notice
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementAdapter<T = Record<string, unknown>> {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}

export interface AppDatabase {
  exec(sql: string): void;
  prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T>;
  transaction<R>(fn: () => R): R;
  close(): void;
}

let dbInstance: AppDatabase | null = null;

const SCHEMA_V1_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
  class_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_activation' CHECK(status IN ('pending_activation', 'active', 'suspended', 'locked', 'deleted')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  revoked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY,
  progress_data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL COLLATE NOCASE,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(identifier, ip_hash, attempted_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_username TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  result TEXT NOT NULL,
  details TEXT,
  ip_hash TEXT,
  occurred_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
`;

const SCHEMA_V2_SQL = `
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL DEFAULT 'default_school',
  name TEXT UNIQUE NOT NULL COLLATE NOCASE,
  grade TEXT NOT NULL DEFAULT '',
  cohort_year INTEGER NOT NULL DEFAULT 2024,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

CREATE TABLE IF NOT EXISTS teacher_class (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'auto_elec_base',
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_lookup ON teacher_class(teacher_id, class_id, status);

CREATE TABLE IF NOT EXISTS student_class (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK(is_current IN (0, 1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_class_lookup ON student_class(student_id, is_current);
CREATE INDEX IF NOT EXISTS idx_student_class_class ON student_class(class_id, is_current);

CREATE TABLE IF NOT EXISTS course_versions (
  id TEXT PRIMARY KEY,
  course_code TEXT NOT NULL DEFAULT 'auto_elec_base',
  version TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS learning_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  course_version_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  score INTEGER,
  status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'abandoned')),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_student ON learning_attempts(student_id, level_id);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_class ON learning_attempts(class_id);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_events_attempt ON learning_events(attempt_id);

CREATE TABLE IF NOT EXISTS student_activations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_student_activations_lookup
ON student_activations(student_id, used_at, expires_at);

CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  score INTEGER,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_student
ON teacher_evaluations(student_id, created_at);

CREATE TABLE IF NOT EXISTS progress_corrections (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('requested', 'approved', 'rejected', 'executed')),
  decided_by TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);
`;

// Transitional local SQLite migration. Production schema is migrated to D1 in the next work package.
const SCHEMA_V3_SQL = `
CREATE TABLE IF NOT EXISTS student_activations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_student_activations_lookup
ON student_activations(student_id, used_at, expires_at);

CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  score INTEGER,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_student
ON teacher_evaluations(student_id, created_at);

CREATE TABLE IF NOT EXISTS progress_corrections (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  attempt_id TEXT,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('requested', 'approved', 'rejected', 'executed')),
  decided_by TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);
`;

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DB_PATH) {
    return process.env.TEST_DB_PATH;
  }
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, 'app.db');
}

function applyMigrations(db: AppDatabase): void {
  try {
    const checkMigrationTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    );
    const exists = checkMigrationTable.get();
    if (!exists) {
      db.exec(SCHEMA_V1_SQL);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(1, '0001_init', Date.now());
    }
  } catch {
    db.exec(SCHEMA_V1_SQL);
  }

  try {
    const checkV2 = db.prepare(
      'SELECT version FROM schema_migrations WHERE version = 2'
    ).get();
    if (!checkV2) {
      db.exec(SCHEMA_V2_SQL);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(2, '0002_class_relations', Date.now());
    }
  } catch {}

  try {
    const checkV3 = db.prepare(
      'SELECT version FROM schema_migrations WHERE version = 3'
    ).get();
    if (!checkV3) {
      db.exec(SCHEMA_V3_SQL);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(3, '0003_account_lifecycle', Date.now());
    }
  } catch {}
}

function createSqlJsAdapter(db: SqlJsDatabase, filePath?: string): AppDatabase {
  function persist() {
    if (filePath && filePath !== ':memory:') {
      try {
        const data = db.export();
        fs.writeFileSync(filePath, Buffer.from(data));
      } catch {}
    }
  }

  return {
    exec(sql: string) {
      db.run(sql);
      persist();
    },
    prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T> {
      return {
        run(...params: unknown[]) {
          const cleanParams = params.map((p) => (p === undefined ? null : p)) as unknown as Array<
            number | string | Uint8Array | null
          >;
          db.run(sql, cleanParams);
          const changes = db.getRowsModified();
          persist();
          return { changes, lastInsertRowid: 0 };
        },
        get(...params: unknown[]) {
          const cleanParams = params.map((p) => (p === undefined ? null : p)) as unknown as Array<
            number | string | Uint8Array | null
          >;
          const stmt = db.prepare(sql);
          stmt.bind(cleanParams);
          const hasRow = stmt.step();
          const row = hasRow ? (stmt.getAsObject() as T) : undefined;
          stmt.free();
          return row;
        },
        all(...params: unknown[]) {
          const cleanParams = params.map((p) => (p === undefined ? null : p)) as unknown as Array<
            number | string | Uint8Array | null
          >;
          const stmt = db.prepare(sql);
          stmt.bind(cleanParams);
          const rows: T[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject() as T);
          }
          stmt.free();
          return rows;
        },
      };
    },
    transaction<R>(fn: () => R): R {
      db.run('BEGIN TRANSACTION');
      try {
        const result = fn();
        db.run('COMMIT');
        persist();
        return result;
      } catch (err) {
        try {
          db.run('ROLLBACK');
        } catch {}
        throw err;
      }
    },
    close() {
      try {
        db.close();
      } catch {}
    },
  };
}

export function createSqliteAdapter(filePath: string): AppDatabase {
  let nativeSyncDb: DatabaseSync | null = null;
  try {
    nativeSyncDb = new DatabaseSync(filePath);
  } catch {
    nativeSyncDb = null;
  }

  let adapter: AppDatabase;

  if (nativeSyncDb) {
    if (filePath !== ':memory:') {
      try {
        nativeSyncDb.exec('PRAGMA journal_mode = WAL;');
      } catch {}
    }
    nativeSyncDb.exec('PRAGMA foreign_keys = ON;');
    try {
      nativeSyncDb.exec('PRAGMA busy_timeout = 5000;');
    } catch {}

    adapter = {
      exec(sql: string) {
        nativeSyncDb!.exec(sql);
      },
      prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T> {
        const stmt = nativeSyncDb!.prepare(sql);
        return {
          run(...params: unknown[]) {
            return (stmt.run as (...args: unknown[]) => RunResult)(...params);
          },
          get(...params: unknown[]) {
            return (stmt.get as (...args: unknown[]) => T | undefined)(...params);
          },
          all(...params: unknown[]) {
            return (stmt.all as (...args: unknown[]) => T[])(...params);
          },
        };
      },
      transaction<R>(fn: () => R): R {
        nativeSyncDb!.exec('BEGIN IMMEDIATE');
        try {
          const result = fn();
          nativeSyncDb!.exec('COMMIT');
          return result;
        } catch (err) {
          try {
            nativeSyncDb!.exec('ROLLBACK');
          } catch {}
          throw err;
        }
      },
      close() {
        try {
          nativeSyncDb!.close();
        } catch {}
      },
    };
  } else if (sqlJsModule) {
    let sqlDb: SqlJsDatabase;
    if (filePath !== ':memory:' && fs.existsSync(filePath)) {
      try {
        const buf = fs.readFileSync(filePath);
        sqlDb = new sqlJsModule.Database(buf);
      } catch {
        sqlDb = new sqlJsModule.Database();
      }
    } else {
      sqlDb = new sqlJsModule.Database();
    }
    adapter = createSqlJsAdapter(sqlDb, filePath);
  } else {
    const jsonPath = filePath === ':memory:' ? ':memory:' : filePath.replace(/\.db$/, '.json');
    adapter = new MemorySqlDatabase(jsonPath);
  }

  applyMigrations(adapter);
  return adapter;
}

export function getDatabase(): AppDatabase {
  if (dbInstance) return dbInstance;
  const dbPath = getDatabasePath();
  dbInstance = createSqliteAdapter(dbPath);
  if (dbPath !== ':memory:') {
    try {
      bootstrapDefaultDataIfNeeded(dbInstance);
    } catch (err) {
      console.error('[database] bootstrap notice:', err);
    }
  }
  return dbInstance;
}

export function setDatabaseInstance(db: AppDatabase | null): void {
  if (dbInstance && dbInstance !== db) {
    try {
      dbInstance.close();
    } catch {}
  }
  dbInstance = db;
}
