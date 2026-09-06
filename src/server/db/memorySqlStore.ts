import fs from 'node:fs';
import type { AppDatabase, StatementAdapter, RunResult } from './database';

type Row = Record<string, unknown>;

export class MemorySqlDatabase implements AppDatabase {
  private tables: Map<string, Row[]> = new Map();
  private filePath?: string;
  private inTransaction = false;
  private transactionSnapshot?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (this.filePath && this.filePath !== ':memory:' && fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, Row[]>;
        for (const [table, rows] of Object.entries(parsed)) {
          this.tables.set(table, rows);
        }
      } catch {}
    }
  }

  private saveToDisk(): void {
    if (this.inTransaction) return;
    if (this.filePath && this.filePath !== ':memory:') {
      try {
        const obj: Record<string, Row[]> = {};
        for (const [t, r] of this.tables.entries()) {
          obj[t] = r;
        }
        fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
      } catch {}
    }
  }

  private getTable(name: string): Row[] {
    const clean = name.trim().toLowerCase();
    let rows = this.tables.get(clean);
    if (!rows) {
      rows = [];
      this.tables.set(clean, rows);
    }
    return rows;
  }

  exec(sql: string): void {
    const trimmed = sql.trim();
    if (trimmed.startsWith('PRAGMA') || trimmed.startsWith('CREATE INDEX')) {
      return;
    }
    if (trimmed.startsWith('CREATE TABLE')) {
      const match = trimmed.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)/i);
      if (match) {
        this.getTable(match[1]);
      }
      return;
    }
    if (trimmed.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.transactionSnapshot = JSON.stringify(Array.from(this.tables.entries()));
      return;
    }
    if (trimmed.startsWith('COMMIT')) {
      this.inTransaction = false;
      this.transactionSnapshot = undefined;
      this.saveToDisk();
      return;
    }
    if (trimmed.startsWith('ROLLBACK')) {
      if (this.transactionSnapshot) {
        const entries = JSON.parse(this.transactionSnapshot) as Array<[string, Row[]]>;
        this.tables = new Map(entries);
      }
      this.inTransaction = false;
      this.transactionSnapshot = undefined;
      return;
    }
  }

  prepare<T = Record<string, unknown>>(sql: string): StatementAdapter<T> {
    const trimmed = sql.trim();

    return {
      run: (...params: unknown[]): RunResult => {
        const res = this.executeRun(trimmed, params);
        this.saveToDisk();
        return res;
      },
      get: (...params: unknown[]): T | undefined => {
        const rows = this.executeQuery<T>(trimmed, params);
        return rows[0];
      },
      all: (...params: unknown[]): T[] => {
        return this.executeQuery<T>(trimmed, params);
      },
    };
  }

  transaction<R>(fn: () => R): R {
    this.exec('BEGIN IMMEDIATE');
    try {
      const res = fn();
      this.exec('COMMIT');
      return res;
    } catch (err) {
      this.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.saveToDisk();
  }

  private executeRun(sql: string, params: unknown[]): RunResult {
    // 1. INSERT INTO / INSERT OR IGNORE / INSERT OR REPLACE
    const insertMatch = sql.match(
      /^INSERT(?:\s+OR\s+(IGNORE|REPLACE))?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
    );
    if (insertMatch) {
      const mode = (insertMatch[1] || '').toUpperCase();
      const tableName = insertMatch[2];
      const cols = insertMatch[3].split(',').map((c) => c.trim().toLowerCase());
      const rawValues = insertMatch[4].split(',').map((v) => v.trim());
      const table = this.getTable(tableName);

      const row: Row = {};
      let paramIdx = 0;
      for (let i = 0; i < cols.length; i++) {
        const valExpr = rawValues[i];
        if (valExpr === '?') {
          row[cols[i]] = params[paramIdx] !== undefined ? params[paramIdx] : null;
          paramIdx++;
        } else if (valExpr !== undefined) {
          if (valExpr.toUpperCase() === 'NULL') {
            row[cols[i]] = null;
          } else {
            const literal = valExpr.replace(/^'|'$/g, '');
            const num = Number(literal);
            row[cols[i]] = !isNaN(num) && literal !== '' ? num : literal;
          }
        } else {
          row[cols[i]] = null;
        }
      }

      // Check unique key collisions for primary keys or unique columns (id, username, token_hash, name)
      const existingIndex = table.findIndex((r) => {
        if (row.id && r.id === row.id) return true;
        const rUsername = typeof r.username === 'string' ? r.username.toLowerCase() : '';
        const targetUsername = typeof row.username === 'string' ? row.username.toLowerCase() : '';
        if (targetUsername && rUsername === targetUsername) return true;

        if (row.token_hash && r.token_hash === row.token_hash) return true;

        const rName = typeof r.name === 'string' ? r.name.toLowerCase() : '';
        const targetName = typeof row.name === 'string' ? row.name.toLowerCase() : '';
        if (tableName.toLowerCase() === 'classes' && targetName && rName === targetName) return true;
        return false;
      });

      if (existingIndex >= 0) {
        if (mode === 'IGNORE') {
          return { changes: 0, lastInsertRowid: 0 };
        }
        if (mode === 'REPLACE') {
          table[existingIndex] = row;
          return { changes: 1, lastInsertRowid: 0 };
        }
      }

      table.push(row);
      return { changes: 1, lastInsertRowid: table.length };
    }

    // 2. UPDATE
    const updateMatch = sql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3] || '';
      const table = this.getTable(tableName);

      // Parse SET assignments
      const setParts = setClause.split(',').map((p) => p.trim());
      let paramIdx = 0;
      const setters: Array<{ col: string; valGetter: () => unknown }> = [];

      for (const part of setParts) {
        const [col, valExpr] = part.split('=').map((s) => s.trim());
        const cleanCol = col.toLowerCase();
        if (valExpr === '?') {
          const p = params[paramIdx++];
          setters.push({ col: cleanCol, valGetter: () => p });
        } else {
          const literalVal = valExpr.replace(/^'|'$/g, '');
          const num = Number(literalVal);
          const finalVal = !isNaN(num) && literalVal !== '' ? num : literalVal;
          setters.push({ col: cleanCol, valGetter: () => finalVal });
        }
      }

      // Remaining params belong to WHERE
      const whereParams = params.slice(paramIdx);
      let changes = 0;

      for (const row of table) {
        if (this.matchesWhere(row, whereClause, whereParams)) {
          for (const s of setters) {
            row[s.col] = s.valGetter();
          }
          changes++;
        }
      }

      return { changes, lastInsertRowid: 0 };
    }

    // 3. DELETE
    const deleteMatch = sql.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*))?$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2] || '';
      const table = this.getTable(tableName);
      let changes = 0;

      for (let i = table.length - 1; i >= 0; i--) {
        if (this.matchesWhere(table[i], whereClause, params)) {
          table.splice(i, 1);
          changes++;
        }
      }

      return { changes, lastInsertRowid: 0 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }

  private executeQuery<T>(sql: string, params: unknown[]): T[] {
    // 1. sqlite_master query
    if (sql.includes('sqlite_master')) {
      return [{ name: 'schema_migrations' }] as unknown as T[];
    }

    // 2. Aggregate count / max for login_attempts
    if (sql.includes('COUNT(*)') && sql.includes('login_attempts')) {
      const table = this.getTable('login_attempts');
      const identifier = params[0];
      const ipHash = params[1];
      const cutoff = Number(params[2]);

      const filtered = table.filter(
        (r) =>
          r.identifier === identifier &&
          r.ip_hash === ipHash &&
          r.success === 0 &&
          Number(r.attempted_at) > cutoff
      );

      const maxAttempt = filtered.reduce((max, r) => Math.max(max, Number(r.attempted_at)), 0);
      return [
        {
          fail_count: filtered.length,
          last_attempt: filtered.length > 0 ? maxAttempt : null,
        },
      ] as unknown as T[];
    }

    // 3. Count query for students in class
    if (sql.includes('COUNT(DISTINCT student_id)') && sql.includes('student_class')) {
      const table = this.getTable('student_class');
      const classId = params[0];
      const now = params[1] !== undefined ? Number(params[1]) : Date.now();

      const uniqueStudents = new Set<string>();
      for (const r of table) {
        if (
          r.class_id === classId &&
          Number(r.is_current) === 1 &&
          (r.valid_to === null || Number(r.valid_to) > now)
        ) {
          uniqueStudents.add(String(r.student_id));
        }
      }
      return [{ count: uniqueStudents.size }] as unknown as T[];
    }

    // 4. Handle Sessions JOIN Users
    if (sql.includes('FROM sessions s') && sql.includes('INNER JOIN users u')) {
      const tokenHash = params[0];
      const sessions = this.getTable('sessions');
      const users = this.getTable('users');

      const session = sessions.find((s) => s.token_hash === tokenHash && (s.revoked_at === null || s.revoked_at === undefined));
      if (!session) return [];

      const user = users.find((u) => u.id === session.user_id);
      if (!user) return [];

      return [
        {
          id: user.id,
          username: user.username,
          real_name: user.real_name,
          role: user.role,
          class_name: user.class_name,
          status: user.status,
          must_change_password: user.must_change_password,
          session_id: session.id,
          sess_id: session.id,
          token_hash: session.token_hash,
          expires_at: session.expires_at,
          sess_expires_at: session.expires_at,
          created_at: session.created_at,
          sess_created_at: session.created_at,
          last_active_at: session.last_active_at,
          sess_last_active_at: session.last_active_at,
        },
      ] as unknown as T[];
    }

    // 5. Handle Teacher_Class JOIN Users
    if (sql.includes('FROM teacher_class tc') && sql.includes('INNER JOIN users u')) {
      const classId = params[0];
      const now = Number(params[1]);
      const tcTable = this.getTable('teacher_class');
      const users = this.getTable('users');

      const activeLinks = tcTable.filter(
        (tc) =>
          tc.class_id === classId &&
          tc.status === 'active' &&
          (tc.valid_to === null || Number(tc.valid_to) > now)
      );

      const res: T[] = [];
      for (const link of activeLinks) {
        const user = users.find((u) => u.id === link.teacher_id);
        if (user) {
          res.push({
            teacher_id: link.teacher_id,
            username: user.username,
            real_name: user.real_name,
          } as unknown as T);
        }
      }
      return res;
    }

    // 6. Handle Classes JOIN Teacher_Class (any order)
    if (sql.includes('teacher_class') && sql.includes('classes c')) {
      const teacherId = params[0];
      const now = Number(params[1]);
      const tcTable = this.getTable('teacher_class');
      const classes = this.getTable('classes');

      const authorizedClassIds = new Set(
        tcTable
          .filter(
            (tc) =>
              tc.teacher_id === teacherId &&
              tc.status === 'active' &&
              (tc.valid_to === null || tc.valid_to === undefined || Number(tc.valid_to) > now)
          )
          .map((tc) => String(tc.class_id))
      );

      return classes
        .filter((c) => authorizedClassIds.has(String(c.id)) && c.status !== 'deleted')
        .sort((a, b) => String(a.name).localeCompare(String(b.name))) as unknown as T[];
    }

    // 6b. Handle Student List with Classes and Progress
    if (sql.includes('users u') && sql.includes('student_class sc')) {
      const users = this.getTable('users');
      const scTable = this.getTable('student_class');
      const classes = this.getTable('classes');
      const progTable = this.getTable('user_progress');

      const isSingleClass = sql.includes('sc.class_id = ?');
      const isMultiClass = sql.includes('sc.class_id IN');
      let targetClassIds: Set<string> | null = null;

      if (isSingleClass) {
        targetClassIds = new Set([String(params[0])]);
      } else if (isMultiClass) {
        targetClassIds = new Set(params.map(String));
      }

      const res: T[] = [];
      for (const u of users) {
        if (u.role !== 'student' || u.status === 'deleted') continue;

        const currentSc = scTable.find(
          (sc) =>
            sc.student_id === u.id &&
            Number(sc.is_current) === 1 &&
            (sc.valid_to === null || sc.valid_to === undefined || Number(sc.valid_to) > Date.now())
        );

        if (targetClassIds) {
          if (!currentSc || !targetClassIds.has(String(currentSc.class_id))) {
            continue;
          }
        }

        const cls = currentSc ? classes.find((c) => c.id === currentSc.class_id) : null;
        const prog = progTable.find((p) => p.user_id === u.id);

        res.push({
          id: u.id,
          username: u.username,
          realName: u.real_name,
          className: cls ? cls.name : u.class_name,
          classId: cls ? cls.id : '',
          role: u.role,
          status: u.status,
          createdAt: u.created_at,
          progressData: prog ? prog.progress_data : undefined,
        } as unknown as T);
      }

      res.sort((a, b) => Number((b as Row).createdAt) - Number((a as Row).createdAt));
      return res;
    }

    // 7. Handle Student_Class JOIN Classes
    if (sql.includes('FROM student_class sc') && sql.includes('INNER JOIN classes c')) {
      const studentId = params[0];
      const now = Number(params[1]);
      const scTable = this.getTable('student_class');
      const classes = this.getTable('classes');

      const current = scTable.find(
        (sc) =>
          sc.student_id === studentId &&
          Number(sc.is_current) === 1 &&
          (sc.valid_to === null || Number(sc.valid_to) > now)
      );
      if (!current) return [];

      const cls = classes.find((c) => c.id === current.class_id);
      return [
        {
          student_id: current.student_id,
          class_id: current.class_id,
          class_name: cls ? cls.name : '',
        },
      ] as unknown as T[];
    }

    // 8. Standard single table query
    const selectMatch = sql.match(/^SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (selectMatch) {
      const rawCols = selectMatch[1].trim();
      const tableName = selectMatch[2].trim();
      const whereClause = selectMatch[3] || '';
      const orderBy = selectMatch[4] || '';
      const limit = selectMatch[5] ? Number(selectMatch[5]) : undefined;

      const table = this.getTable(tableName);
      let rows = table.filter((r) => this.matchesWhere(r, whereClause, params));

      // Sorting
      if (orderBy) {
        const [orderCol, dir] = orderBy.trim().split(/\s+/);
        const col = orderCol.toLowerCase();
        const desc = dir && dir.toUpperCase() === 'DESC';
        rows.sort((a, b) => {
          const va = a[col];
          const vb = b[col];
          if (va === vb) return 0;
          if (va === undefined || va === null) return 1;
          const sA = typeof va === 'string' ? va : typeof va === 'number' ? String(va) : '';
          const sB = typeof vb === 'string' ? vb : typeof vb === 'number' ? String(vb) : '';
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : sA.localeCompare(sB);
          return desc ? -cmp : cmp;
        });
      }

      if (limit !== undefined) {
        rows = rows.slice(0, limit);
      }

      if (rawCols === '*') {
        return rows as unknown as T[];
      }

      const cols = rawCols.split(',').map((c) => c.trim().toLowerCase());
      return rows.map((r) => {
        const projected: Row = {};
        for (const col of cols) {
          projected[col] = r[col];
        }
        return projected as unknown as T;
      });
    }

    return [];
  }

  private matchesWhere(row: Row, whereClause: string, params: unknown[]): boolean {
    if (!whereClause || whereClause.trim() === '') return true;

    // Simple tokenizer for AND-separated conditions
    const clauses = whereClause.split(/\s+AND\s+/i);
    let paramIdx = 0;

    for (const clause of clauses) {
      const trimmed = clause.trim();

      // Parenthesized group: (valid_to IS NULL OR valid_to > ?)
      const groupMatch = trimmed.match(/\((.*?)\s+OR\s+(.*?)\)/i);
      if (groupMatch) {
        const left = groupMatch[1].trim();
        const right = groupMatch[2].trim();
        const leftMatched = this.matchesSingleCond(row, left, () => params[paramIdx++]);
        const rightMatched = this.matchesSingleCond(row, right, () => params[paramIdx++]);
        if (!leftMatched && !rightMatched) return false;
        continue;
      }

      const matched = this.matchesSingleCond(row, trimmed, () => params[paramIdx++]);
      if (!matched) return false;
    }

    return true;
  }

  private matchesSingleCond(row: Row, cond: string, nextParam: () => unknown): boolean {
    const trimmed = cond.trim();

    // IS NULL
    const isNullMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+IS\s+NULL$/i);
    if (isNullMatch) {
      const col = isNullMatch[1].toLowerCase();
      return row[col] === null || row[col] === undefined;
    }

    // IS NOT NULL
    const isNotNullMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+IS\s+NOT\s+NULL$/i);
    if (isNotNullMatch) {
      const col = isNotNullMatch[1].toLowerCase();
      return row[col] !== null && row[col] !== undefined;
    }

    // col != val
    const neqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*(!=|<>)\s*(.*)$/i);
    if (neqMatch) {
      const col = neqMatch[1].toLowerCase();
      const rhs = neqMatch[3].trim();
      const val = rhs === '?' ? nextParam() : rhs.replace(/^'|'$/g, '');
      return row[col] !== val;
    }

    // col = val (supports COLLATE NOCASE)
    const eqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*?)(?:\s+COLLATE\s+NOCASE)?$/i);
    if (eqMatch) {
      const col = eqMatch[1].toLowerCase();
      const isNoCase = trimmed.toLowerCase().includes('collate nocase');
      const rhs = eqMatch[2].trim();
      const val = rhs === '?' ? nextParam() : rhs.replace(/^'|'$/g, '');
      const rowVal = row[col];

      if (isNoCase) {
        return String(rowVal).toLowerCase() === String(val).toLowerCase();
      }
      return String(rowVal) === String(val);
    }

    // col > val
    const gtMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*>\s*(.*)$/i);
    if (gtMatch) {
      const col = gtMatch[1].toLowerCase();
      const rhs = gtMatch[2].trim();
      const val = Number(rhs === '?' ? nextParam() : rhs);
      return Number(row[col]) > val;
    }

    return true;
  }
}
