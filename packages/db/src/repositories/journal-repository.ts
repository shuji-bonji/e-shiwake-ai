import type { JournalEntry, JournalLine, TaxCategory } from '@e-shiwake/core';
import type Database from 'better-sqlite3';
import { getDatabase } from '../database.js';

// ==================== Prepared Statement キャッシュ ====================

/**
 * DB インスタンスに紐づく Prepared Statement キャッシュ
 * resetDatabase() でインスタンスが変わった場合に自動再生成
 */
let _cachedDb: Database.Database | null = null;
let _stmts: ReturnType<typeof createStatements> | null = null;

function createStatements(db: Database.Database) {
	return {
		getJournalsByYear: db.prepare(
			'SELECT * FROM journals WHERE date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC'
		),
		getAllJournals: db.prepare('SELECT * FROM journals ORDER BY date DESC, created_at DESC'),
		getJournalById: db.prepare('SELECT * FROM journals WHERE id = ?'),
		getLinesByJournalId: db.prepare('SELECT * FROM journal_lines WHERE journal_id = ?'),
		getAvailableYears: db.prepare(
			'SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) as year FROM journals ORDER BY year DESC'
		),
		insertJournal: db.prepare(
			`INSERT INTO journals (id, date, vendor, description, evidence_status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`
		),
		insertLine: db.prepare(
			`INSERT INTO journal_lines (id, journal_id, type, account_code, amount, tax_category, memo,
				_business_ratio_applied, _original_amount, _business_ratio, _business_ratio_generated)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		),
		deleteJournal: db.prepare('DELETE FROM journals WHERE id = ?'),
		deleteLinesByJournalId: db.prepare('DELETE FROM journal_lines WHERE journal_id = ?'),
		countLinesByAccountCode: db.prepare(
			'SELECT COUNT(*) as count FROM journal_lines WHERE account_code = ?'
		),
		deleteJournalsByDateRange: db.prepare('DELETE FROM journals WHERE date BETWEEN ? AND ?'),
		countAttachmentsByDateRange: db.prepare(
			`SELECT COUNT(*) as count FROM attachments WHERE journal_id IN
			(SELECT id FROM journals WHERE date BETWEEN ? AND ?)`
		)
	};
}

function getStmts() {
	const db = getDatabase();
	if (_cachedDb !== db) {
		_stmts = createStatements(db);
		_cachedDb = db;
	}
	return { db, stmts: _stmts! };
}

// ==================== 内部ヘルパー ====================

interface JournalRow {
	id: string;
	date: string;
	vendor: string;
	description: string;
	evidence_status: string;
	created_at: string;
	updated_at: string;
}

interface JournalLineRow {
	id: string;
	journal_id: string;
	type: string;
	account_code: string;
	amount: number;
	tax_category: string | null;
	memo: string | null;
	_business_ratio_applied: number;
	_original_amount: number | null;
	_business_ratio: number | null;
	_business_ratio_generated: number;
}

function rowToJournalLine(row: JournalLineRow): JournalLine {
	return {
		id: row.id,
		type: row.type as 'debit' | 'credit',
		accountCode: row.account_code,
		amount: row.amount,
		taxCategory: (row.tax_category as TaxCategory) ?? undefined,
		memo: row.memo ?? undefined,
		_businessRatioApplied: row._business_ratio_applied === 1 ? true : undefined,
		_originalAmount: row._original_amount ?? undefined,
		_businessRatio: row._business_ratio ?? undefined,
		_businessRatioGenerated: row._business_ratio_generated === 1 ? true : undefined
	};
}

function assembleJournal(row: JournalRow, lines: JournalLineRow[]): JournalEntry {
	return {
		id: row.id,
		date: row.date,
		vendor: row.vendor,
		description: row.description,
		evidenceStatus: row.evidence_status as JournalEntry['evidenceStatus'],
		lines: lines.map(rowToJournalLine),
		attachments: [], // 添付ファイルは別途ロード
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/**
 * 仕訳行を一括取得し journal_id でグループ化するヘルパー
 * N+1 クエリを回避するため、IN句で一括取得する
 */
function bulkLoadLines(
	db: ReturnType<typeof getDatabase>,
	journalIds: string[]
): Map<string, JournalLineRow[]> {
	const lineMap = new Map<string, JournalLineRow[]>();
	if (journalIds.length === 0) return lineMap;

	// SQLite のバインドパラメータ上限（999）を考慮してチャンク分割
	const CHUNK_SIZE = 500;
	for (let i = 0; i < journalIds.length; i += CHUNK_SIZE) {
		const chunk = journalIds.slice(i, i + CHUNK_SIZE);
		const placeholders = chunk.map(() => '?').join(',');
		const rows = db
			.prepare(`SELECT * FROM journal_lines WHERE journal_id IN (${placeholders})`)
			.all(...chunk) as JournalLineRow[];

		for (const row of rows) {
			const arr = lineMap.get(row.journal_id);
			if (arr) {
				arr.push(row);
			} else {
				lineMap.set(row.journal_id, [row]);
			}
		}
	}

	return lineMap;
}

// ==================== CRUD ====================

/**
 * 仕訳の取得（年度別、日付降順）
 */
export function getJournalsByYear(year: number): JournalEntry[] {
	const { db, stmts } = getStmts();
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const journals = stmts.getJournalsByYear.all(startDate, endDate) as JournalRow[];

	const lineMap = bulkLoadLines(
		db,
		journals.map((j) => j.id)
	);

	return journals.map((j) => assembleJournal(j, lineMap.get(j.id) ?? []));
}

/**
 * 全仕訳を取得（日付降順）
 */
export function getAllJournals(): JournalEntry[] {
	const { db, stmts } = getStmts();

	const journals = stmts.getAllJournals.all() as JournalRow[];

	const lineMap = bulkLoadLines(
		db,
		journals.map((j) => j.id)
	);

	return journals.map((j) => assembleJournal(j, lineMap.get(j.id) ?? []));
}

/**
 * 仕訳を検索（摘要・取引先のテキスト部分一致、年度フィルタ対応）
 */
export function searchJournals(query: string, year?: number): JournalEntry[] {
	const { db } = getStmts();
	const like = `%${query}%`;

	let sql = 'SELECT DISTINCT j.* FROM journals j WHERE (j.description LIKE ? OR j.vendor LIKE ?)';
	const params: unknown[] = [like, like];

	if (year !== undefined) {
		const startDate = `${year}-01-01`;
		const endDate = `${year}-12-31`;
		sql += ' AND j.date BETWEEN ? AND ?';
		params.push(startDate, endDate);
	}

	sql += ' ORDER BY j.date DESC, j.created_at DESC';

	const journals = db.prepare(sql).all(...params) as JournalRow[];

	const lineMap = bulkLoadLines(
		db,
		journals.map((j) => j.id)
	);

	return journals.map((j) => assembleJournal(j, lineMap.get(j.id) ?? []));
}

/**
 * 利用可能な年度の取得
 */
export function getAvailableYears(): number[] {
	const { stmts } = getStmts();
	const currentYear = new Date().getFullYear();

	const rows = stmts.getAvailableYears.all() as { year: number }[];

	const years = new Set<number>([currentYear]);
	for (const row of rows) {
		years.add(row.year);
	}

	return Array.from(years).sort((a, b) => b - a);
}

/**
 * 仕訳の取得（ID指定）
 */
export function getJournalById(id: string): JournalEntry | null {
	const { stmts } = getStmts();

	const row = stmts.getJournalById.get(id) as JournalRow | undefined;
	if (!row) return null;

	const lines = stmts.getLinesByJournalId.all(id) as JournalLineRow[];
	return assembleJournal(row, lines);
}

/**
 * 仕訳の追加
 */
export function addJournal(journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): string {
	const { db, stmts } = getStmts();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();

	const transaction = db.transaction(() => {
		stmts.insertJournal.run(
			id,
			journal.date,
			journal.vendor,
			journal.description,
			journal.evidenceStatus,
			now,
			now
		);

		for (const line of journal.lines) {
			stmts.insertLine.run(
				line.id || crypto.randomUUID(),
				id,
				line.type,
				line.accountCode,
				line.amount,
				line.taxCategory ?? null,
				line.memo ?? null,
				line._businessRatioApplied ? 1 : 0,
				line._originalAmount ?? null,
				line._businessRatio ?? null,
				line._businessRatioGenerated ? 1 : 0
			);
		}
	});

	transaction();

	return id;
}

/**
 * 仕訳の更新
 */
export function updateJournal(
	id: string,
	updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>
): void {
	const { db, stmts } = getStmts();
	const now = new Date().toISOString();

	const transaction = db.transaction(() => {
		// ヘッダー更新（動的SQLのためキャッシュ対象外）
		const sets: string[] = ['updated_at = ?'];
		const values: unknown[] = [now];

		if (updates.date !== undefined) {
			sets.push('date = ?');
			values.push(updates.date);
		}
		if (updates.vendor !== undefined) {
			sets.push('vendor = ?');
			values.push(updates.vendor);
		}
		if (updates.description !== undefined) {
			sets.push('description = ?');
			values.push(updates.description);
		}
		if (updates.evidenceStatus !== undefined) {
			sets.push('evidence_status = ?');
			values.push(updates.evidenceStatus);
		}

		values.push(id);
		db.prepare(`UPDATE journals SET ${sets.join(', ')} WHERE id = ?`).run(...values);

		// 明細行更新（全置換）
		if (updates.lines) {
			stmts.deleteLinesByJournalId.run(id);

			for (const line of updates.lines) {
				stmts.insertLine.run(
					line.id || crypto.randomUUID(),
					id,
					line.type,
					line.accountCode,
					line.amount,
					line.taxCategory ?? null,
					line.memo ?? null,
					line._businessRatioApplied ? 1 : 0,
					line._originalAmount ?? null,
					line._businessRatio ?? null,
					line._businessRatioGenerated ? 1 : 0
				);
			}
		}
	});

	transaction();
}

/**
 * 仕訳の削除
 */
export function deleteJournal(id: string): void {
	const { stmts } = getStmts();
	// CASCADE で journal_lines, attachments も自動削除
	stmts.deleteJournal.run(id);
}

/**
 * 特定の勘定科目を使用している仕訳行の数を取得
 */
export function countJournalLinesByAccountCode(accountCode: string): number {
	const { stmts } = getStmts();
	const row = stmts.countLinesByAccountCode.get(accountCode) as { count: number };
	return row.count;
}

/**
 * 特定の勘定科目の消費税区分を一括更新
 */
export function updateTaxCategoryByAccountCode(
	accountCode: string,
	newTaxCategory: TaxCategory
): number {
	const { db } = getStmts();

	const result = db
		.prepare(
			'UPDATE journal_lines SET tax_category = ? WHERE account_code = ? AND (tax_category IS NULL OR tax_category != ?)'
		)
		.run(newTaxCategory, accountCode, newTaxCategory);

	// 更新された行を持つ仕訳の updated_at も更新
	const now = new Date().toISOString();
	db.prepare(`
		UPDATE journals SET updated_at = ?
		WHERE id IN (SELECT DISTINCT journal_id FROM journal_lines WHERE account_code = ?)
	`).run(now, accountCode);

	return result.changes;
}

/**
 * 年度の全データを削除
 */
export function deleteYearData(year: number): { journalCount: number; attachmentCount: number } {
	const { stmts } = getStmts();
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const attachmentCount = (
		stmts.countAttachmentsByDateRange.get(startDate, endDate) as { count: number }
	).count;

	const result = stmts.deleteJournalsByDateRange.run(startDate, endDate);

	return { journalCount: result.changes, attachmentCount };
}
