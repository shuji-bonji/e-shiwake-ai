import type { JournalEntry, JournalLine, TaxCategory } from '@e-shiwake/core';
import { getDatabase } from '../database.js';

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

// ==================== CRUD ====================

/**
 * 仕訳の取得（年度別、日付降順）
 */
export function getJournalsByYear(year: number): JournalEntry[] {
	const db = getDatabase();
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const journals = db
		.prepare('SELECT * FROM journals WHERE date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC')
		.all(startDate, endDate) as JournalRow[];

	const lineStmt = db.prepare('SELECT * FROM journal_lines WHERE journal_id = ?');

	return journals.map((j) => {
		const lines = lineStmt.all(j.id) as JournalLineRow[];
		return assembleJournal(j, lines);
	});
}

/**
 * 全仕訳を取得（日付降順）
 */
export function getAllJournals(): JournalEntry[] {
	const db = getDatabase();

	const journals = db
		.prepare('SELECT * FROM journals ORDER BY date DESC, created_at DESC')
		.all() as JournalRow[];

	const lineStmt = db.prepare('SELECT * FROM journal_lines WHERE journal_id = ?');

	return journals.map((j) => {
		const lines = lineStmt.all(j.id) as JournalLineRow[];
		return assembleJournal(j, lines);
	});
}

/**
 * 利用可能な年度の取得
 */
export function getAvailableYears(): number[] {
	const db = getDatabase();
	const currentYear = new Date().getFullYear();

	const rows = db
		.prepare("SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) as year FROM journals ORDER BY year DESC")
		.all() as { year: number }[];

	const years = new Set<number>([currentYear]);
	for (const row of rows) {
		years.add(row.year);
	}

	return Array.from(years).sort((a, b) => b - a);
}

/**
 * 仕訳の取得（ID指定）
 */
export function getJournalById(id: string): JournalEntry | undefined {
	const db = getDatabase();

	const row = db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as JournalRow | undefined;
	if (!row) return undefined;

	const lines = db.prepare('SELECT * FROM journal_lines WHERE journal_id = ?').all(id) as JournalLineRow[];
	return assembleJournal(row, lines);
}

/**
 * 仕訳の追加
 */
export function addJournal(
	journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
): string {
	const db = getDatabase();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();

	const insertJournal = db.prepare(`
		INSERT INTO journals (id, date, vendor, description, evidence_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	const insertLine = db.prepare(`
		INSERT INTO journal_lines (id, journal_id, type, account_code, amount, tax_category, memo,
			_business_ratio_applied, _original_amount, _business_ratio, _business_ratio_generated)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	const transaction = db.transaction(() => {
		insertJournal.run(id, journal.date, journal.vendor, journal.description, journal.evidenceStatus, now, now);

		for (const line of journal.lines) {
			insertLine.run(
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
	const db = getDatabase();
	const now = new Date().toISOString();

	const transaction = db.transaction(() => {
		// ヘッダー更新
		const sets: string[] = ['updated_at = ?'];
		const values: unknown[] = [now];

		if (updates.date !== undefined) { sets.push('date = ?'); values.push(updates.date); }
		if (updates.vendor !== undefined) { sets.push('vendor = ?'); values.push(updates.vendor); }
		if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
		if (updates.evidenceStatus !== undefined) { sets.push('evidence_status = ?'); values.push(updates.evidenceStatus); }

		values.push(id);
		db.prepare(`UPDATE journals SET ${sets.join(', ')} WHERE id = ?`).run(...values);

		// 明細行更新（全置換）
		if (updates.lines) {
			db.prepare('DELETE FROM journal_lines WHERE journal_id = ?').run(id);

			const insertLine = db.prepare(`
				INSERT INTO journal_lines (id, journal_id, type, account_code, amount, tax_category, memo,
					_business_ratio_applied, _original_amount, _business_ratio, _business_ratio_generated)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (const line of updates.lines) {
				insertLine.run(
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
	const db = getDatabase();
	// CASCADE で journal_lines, attachments も自動削除
	db.prepare('DELETE FROM journals WHERE id = ?').run(id);
}

/**
 * 特定の勘定科目を使用している仕訳行の数を取得
 */
export function countJournalLinesByAccountCode(accountCode: string): number {
	const db = getDatabase();
	const row = db
		.prepare('SELECT COUNT(*) as count FROM journal_lines WHERE account_code = ?')
		.get(accountCode) as { count: number };
	return row.count;
}

/**
 * 特定の勘定科目の消費税区分を一括更新
 */
export function updateTaxCategoryByAccountCode(
	accountCode: string,
	newTaxCategory: TaxCategory
): number {
	const db = getDatabase();

	const result = db
		.prepare('UPDATE journal_lines SET tax_category = ? WHERE account_code = ? AND (tax_category IS NULL OR tax_category != ?)')
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
	const db = getDatabase();
	const startDate = `${year}-01-01`;
	const endDate = `${year}-12-31`;

	const attachmentCount = (db
		.prepare(`SELECT COUNT(*) as count FROM attachments WHERE journal_id IN
			(SELECT id FROM journals WHERE date BETWEEN ? AND ?)`)
		.get(startDate, endDate) as { count: number }).count;

	const result = db
		.prepare('DELETE FROM journals WHERE date BETWEEN ? AND ?')
		.run(startDate, endDate);

	return { journalCount: result.changes, attachmentCount };
}
