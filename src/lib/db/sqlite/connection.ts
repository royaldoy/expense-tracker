import { Capacitor } from '@capacitor/core';
import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection
} from '@capacitor-community/sqlite';
import { runSqliteMigrations } from './schemaMigrations';

export interface ISqliteDriver {
	execute(sql: string, params?: unknown[]): Promise<void>;
	query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
	runTransaction<T>(callback: (driver: ISqliteDriver) => Promise<T>): Promise<T>;
	close(): Promise<void>;
}

export class CapacitorSqliteDriver implements ISqliteDriver {
	private sqlite: SQLiteConnection;
	private db: SQLiteDBConnection | null = null;
	private dbName = 'money_tracker_db';

	constructor() {
		this.sqlite = new SQLiteConnection(CapacitorSQLite);
	}

	async init(): Promise<void> {
		if (this.db) return;
		try {
			await this.sqlite.checkConnectionsConsistency();
			const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
			if (isConn) {
				this.db = await this.sqlite.retrieveConnection(this.dbName, false);
			} else {
				this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
			}
			await this.db.open();
			await runSqliteMigrations(this);
		} catch (error) {
			console.error('Failed to initialize Capacitor SQLite connection:', error);
			throw error;
		}
	}

	async execute(sql: string, params?: unknown[]): Promise<void> {
		if (!this.db) await this.init();
		if (!params || params.length === 0) {
			await this.db!.execute(sql);
		} else {
			await this.db!.run(sql, params as (string | number | null)[]);
		}
	}

	async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
		if (!this.db) await this.init();
		const result = await this.db!.query(sql, (params as (string | number | null)[]) ?? []);
		return (result.values as T[]) ?? [];
	}

	async runTransaction<T>(callback: (driver: ISqliteDriver) => Promise<T>): Promise<T> {
		if (!this.db) await this.init();
		await this.execute('BEGIN TRANSACTION;');
		try {
			const res = await callback(this);
			await this.execute('COMMIT;');
			return res;
		} catch (error) {
			await this.execute('ROLLBACK;');
			throw error;
		}
	}

	async close(): Promise<void> {
		if (this.db) {
			await this.sqlite.closeConnection(this.dbName, false);
			this.db = null;
		}
	}
}

/**
 * In-memory Mock SQLite Driver untuk pengujian unit Vitest dan browser fallback
 * Mendukung parameterized SQL dasar (SELECT, INSERT, UPDATE, DELETE).
 */
export class InMemorySqliteDriver implements ISqliteDriver {
	private tables = new Map<string, Map<string, Record<string, unknown>>>();
	private inTransaction = false;
	private snapshot: string | null = null;

	constructor() {
		this.initTables();
	}

	private initTables() {
		this.tables.set('wallets', new Map());
		this.tables.set('categories', new Map());
		this.tables.set('transactions', new Map());
		this.tables.set('budgets', new Map());
		this.tables.set('settings', new Map());
		this.tables.set('recurring_rules', new Map());
		this.tables.set('notifications', new Map());
		this.tables.set('schema_version', new Map());
	}

	async execute(sql: string, params?: unknown[]): Promise<void> {
		const trimmed = sql.trim();
		if (
			trimmed.startsWith('CREATE TABLE') ||
			trimmed.startsWith('CREATE INDEX') ||
			trimmed.startsWith('PRAGMA')
		) {
			return;
		}

		if (trimmed.startsWith('BEGIN')) {
			this.inTransaction = true;
			this.snapshot = this.serializeState();
			return;
		}

		if (trimmed.startsWith('COMMIT')) {
			this.inTransaction = false;
			this.snapshot = null;
			return;
		}

		if (trimmed.startsWith('ROLLBACK')) {
			this.inTransaction = false;
			if (this.snapshot) {
				this.restoreState(this.snapshot);
				this.snapshot = null;
			}
			return;
		}

		if (trimmed.startsWith('INSERT INTO')) {
			this.handleInsert(trimmed, params ?? []);
			return;
		}

		if (trimmed.startsWith('UPDATE')) {
			this.handleUpdate(trimmed, params ?? []);
			return;
		}

		if (trimmed.startsWith('DELETE FROM')) {
			this.handleDelete(trimmed, params ?? []);
			return;
		}
	}

	async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
		const cleanSql = sql.trim().replace(/;+$/, '');
		const match = cleanSql.match(
			/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?$/i
		);
		if (!match) return [];

		const [, , tableName, whereClause, orderClause] = match;
		let table = this.tables.get(tableName.toLowerCase());
		if (!table) {
			table = new Map();
			this.tables.set(tableName.toLowerCase(), table);
		}

		let rows = Array.from(table.values());

		if (whereClause) {
			rows = rows.filter((row) => this.evalWhere(row, whereClause, params ?? []));
		}

		if (orderClause) {
			const orderParts = orderClause.trim().split(/\s+/);
			const field = orderParts[0];
			const isDesc = orderParts[1]?.toUpperCase() === 'DESC';
			rows.sort((a, b) => {
				const valA = a[field];
				const valB = b[field];
				if (typeof valA === 'number' && typeof valB === 'number') {
					return isDesc ? valB - valA : valA - valB;
				}
				return isDesc
					? String(valB ?? '').localeCompare(String(valA ?? ''))
					: String(valA ?? '').localeCompare(String(valB ?? ''));
			});
		}

		return rows as T[];
	}

	async runTransaction<T>(callback: (driver: ISqliteDriver) => Promise<T>): Promise<T> {
		await this.execute('BEGIN TRANSACTION');
		try {
			const res = await callback(this);
			await this.execute('COMMIT');
			return res;
		} catch (error) {
			await this.execute('ROLLBACK');
			throw error;
		}
	}

	async close(): Promise<void> {
		this.initTables();
	}

	private handleInsert(sql: string, params: unknown[]) {
		const cleanSql = sql.trim().replace(/;+$/, '');
		const match = cleanSql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
		if (!match) return;
		const [, tableName, colsStr] = match;
		let table = this.tables.get(tableName.toLowerCase());
		if (!table) {
			table = new Map();
			this.tables.set(tableName.toLowerCase(), table);
		}

		const cols = colsStr.split(',').map((c) => c.trim());
		const row: Record<string, unknown> = {};

		cols.forEach((col, idx) => {
			row[col] = params[idx];
		});

		const primaryKey = String(row.id ?? row.key ?? row.version ?? table.size + 1);
		table.set(primaryKey, row);
	}

	private handleUpdate(sql: string, params: unknown[]) {
		const cleanSql = sql.trim().replace(/;+$/, '');
		const match = cleanSql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
		if (!match) return;
		const [, tableName, setClause, whereClause] = match;
		const table = this.tables.get(tableName.toLowerCase());
		if (!table) return;

		const setParts = setClause.split(',').map((s) => s.trim());
		let pIdx = 0;
		const setAssignments: { col: string; type: 'set' | 'add' | 'sub'; valIndex: number }[] = [];
		for (const part of setParts) {
			const addMatch = part.match(/^(\w+)\s*=\s*\1\s*\+\s*\?$/i);
			const subMatch = part.match(/^(\w+)\s*=\s*\1\s*-\s*\?$/i);
			const plainMatch = part.match(/^(\w+)\s*=\s*\?$/i);
			if (addMatch) {
				setAssignments.push({ col: addMatch[1], type: 'add', valIndex: pIdx++ });
			} else if (subMatch) {
				setAssignments.push({ col: subMatch[1], type: 'sub', valIndex: pIdx++ });
			} else if (plainMatch) {
				setAssignments.push({ col: plainMatch[1], type: 'set', valIndex: pIdx++ });
			}
		}

		const whereParams = params.slice(pIdx);

		for (const [id, row] of table.entries()) {
			if (this.evalWhere(row, whereClause, whereParams)) {
				for (const assign of setAssignments) {
					const paramVal = params[assign.valIndex];
					if (assign.type === 'add') {
						row[assign.col] = (Number(row[assign.col]) || 0) + Number(paramVal);
					} else if (assign.type === 'sub') {
						row[assign.col] = (Number(row[assign.col]) || 0) - Number(paramVal);
					} else {
						row[assign.col] = paramVal;
					}
				}
				table.set(id, { ...row });
			}
		}
	}

	private handleDelete(sql: string, params: unknown[]) {
		const cleanSql = sql.trim().replace(/;+$/, '');
		const match = cleanSql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
		if (!match) return;
		const [, tableName, whereClause] = match;
		const table = this.tables.get(tableName.toLowerCase());
		if (!table) return;

		if (!whereClause) {
			table.clear();
			return;
		}

		for (const [id, row] of Array.from(table.entries())) {
			if (this.evalWhere(row, whereClause, params)) {
				table.delete(id);
			}
		}
	}

	private evalWhere(row: Record<string, unknown>, whereClause: string, params: unknown[]): boolean {
		let pIdx = 0;
		// Evaluasi sederhana: condition AND condition
		const conditions = whereClause.split(/\s+AND\s+/i);

		for (const cond of conditions) {
			const eqMatch = cond.match(/(\w+)\s*=\s*\?/);
			if (eqMatch) {
				const col = eqMatch[1];
				const target = params[pIdx++];
				if (row[col] !== target) return false;
				continue;
			}

			const isNullMatch = cond.match(/(\w+)\s+IS\s+NULL/i);
			if (isNullMatch) {
				const col = isNullMatch[1];
				if (row[col] !== null && row[col] !== undefined) return false;
				continue;
			}

			const isNotNullMatch = cond.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
			if (isNotNullMatch) {
				const col = isNotNullMatch[1];
				if (row[col] === null || row[col] === undefined) return false;
				continue;
			}

			const gteMatch = cond.match(/(\w+)\s*>=\s*\?/);
			if (gteMatch) {
				const col = gteMatch[1];
				const target = params[pIdx++];
				if ((row[col] as number | string) < (target as number | string)) return false;
				continue;
			}

			const lteMatch = cond.match(/(\w+)\s*<=\s*\?/);
			if (lteMatch) {
				const col = lteMatch[1];
				const target = params[pIdx++];
				if ((row[col] as number | string) > (target as number | string)) return false;
				continue;
			}
		}

		return true;
	}

	private serializeState(): string {
		const out: Record<string, Record<string, unknown>[]> = {};
		for (const [name, map] of this.tables.entries()) {
			out[name] = Array.from(map.values());
		}
		return JSON.stringify(out);
	}

	private restoreState(json: string) {
		const parsed = JSON.parse(json) as Record<string, Record<string, unknown>[]>;
		for (const [name, rows] of Object.entries(parsed)) {
			const map = new Map<string, Record<string, unknown>>();
			for (const r of rows) {
				const pk = (r.id ?? r.key) as string;
				if (pk) map.set(pk, r);
			}
			this.tables.set(name, map);
		}
	}
}

/**
 * Driver singleton yang otomatis memilih driver berdasarkan lingkungan
 */
export function createSqliteDriver(): ISqliteDriver {
	if (Capacitor.isNativePlatform()) {
		return new CapacitorSqliteDriver();
	}
	return new InMemorySqliteDriver();
}

export const sqliteDriver: ISqliteDriver = createSqliteDriver();
