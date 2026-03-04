import type { Account, AccountType, TaxCategory } from '@e-shiwake/core';
import { getDatabase } from '../database.js';

// ==================== 内部ヘルパー ====================

interface AccountRow {
	code: string;
	name: string;
	type: string;
	is_system: number;
	default_tax_category: string | null;
	business_ratio_enabled: number;
	default_business_ratio: number | null;
	created_at: string;
}

function rowToAccount(row: AccountRow): Account {
	return {
		code: row.code,
		name: row.name,
		type: row.type as AccountType,
		isSystem: row.is_system === 1,
		defaultTaxCategory: (row.default_tax_category as TaxCategory) ?? undefined,
		businessRatioEnabled: row.business_ratio_enabled === 1 ? true : undefined,
		defaultBusinessRatio: row.default_business_ratio ?? undefined,
		createdAt: row.created_at
	};
}

// ==================== CRUD ====================

/**
 * 全勘定科目の取得
 */
export function getAllAccounts(): Account[] {
	const db = getDatabase();
	const rows = db.prepare('SELECT * FROM accounts ORDER BY code').all() as AccountRow[];
	return rows.map(rowToAccount);
}

/**
 * 勘定科目の取得（カテゴリ別）
 */
export function getAccountsByType(type: AccountType): Account[] {
	const db = getDatabase();
	const rows = db
		.prepare('SELECT * FROM accounts WHERE type = ? ORDER BY code')
		.all(type) as AccountRow[];
	return rows.map(rowToAccount);
}

/**
 * 勘定科目の取得（コード指定）
 */
export function getAccountByCode(code: string): Account | undefined {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM accounts WHERE code = ?').get(code) as AccountRow | undefined;
	return row ? rowToAccount(row) : undefined;
}

/**
 * 勘定科目の追加
 */
export function addAccount(account: Omit<Account, 'isSystem' | 'createdAt'>): string {
	const db = getDatabase();
	const now = new Date().toISOString();

	db.prepare(`
		INSERT INTO accounts (code, name, type, is_system, default_tax_category,
			business_ratio_enabled, default_business_ratio, created_at)
		VALUES (?, ?, ?, 0, ?, ?, ?, ?)
	`).run(
		account.code,
		account.name,
		account.type,
		account.defaultTaxCategory ?? null,
		account.businessRatioEnabled ? 1 : 0,
		account.defaultBusinessRatio ?? null,
		now
	);

	return account.code;
}

/**
 * 勘定科目の更新
 */
export function updateAccount(
	code: string,
	updates: Partial<Omit<Account, 'code' | 'isSystem' | 'createdAt'>>
): void {
	const db = getDatabase();
	const sets: string[] = [];
	const values: unknown[] = [];

	if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
	if (updates.type !== undefined) { sets.push('type = ?'); values.push(updates.type); }
	if (updates.defaultTaxCategory !== undefined) { sets.push('default_tax_category = ?'); values.push(updates.defaultTaxCategory); }
	if (updates.businessRatioEnabled !== undefined) { sets.push('business_ratio_enabled = ?'); values.push(updates.businessRatioEnabled ? 1 : 0); }
	if (updates.defaultBusinessRatio !== undefined) { sets.push('default_business_ratio = ?'); values.push(updates.defaultBusinessRatio); }

	if (sets.length === 0) return;

	values.push(code);
	db.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE code = ?`).run(...values);
}

/**
 * 勘定科目の削除
 */
export function deleteAccount(code: string): void {
	const db = getDatabase();
	const row = db.prepare('SELECT is_system FROM accounts WHERE code = ?').get(code) as { is_system: number } | undefined;

	if (row?.is_system === 1) {
		throw new Error('システム勘定科目は削除できません');
	}

	db.prepare('DELETE FROM accounts WHERE code = ?').run(code);
}

/**
 * 勘定科目が使用中かチェック
 */
export function isAccountInUse(code: string): boolean {
	const db = getDatabase();
	const row = db
		.prepare('SELECT COUNT(*) as count FROM journal_lines WHERE account_code = ?')
		.get(code) as { count: number };
	return row.count > 0;
}

// ==================== コード採番 ====================

const CATEGORY_PREFIX: Record<AccountType, number> = {
	asset: 1,
	liability: 2,
	equity: 3,
	revenue: 4,
	expense: 5
};

/**
 * 次の勘定科目コードを生成（ユーザー追加用）
 */
export function generateNextCode(type: AccountType): string {
	const db = getDatabase();
	const prefix = CATEGORY_PREFIX[type];
	const minCode = prefix * 1000 + 100;
	const maxCode = prefix * 1000 + 199;

	const row = db
		.prepare('SELECT MAX(CAST(code AS INTEGER)) as max_code FROM accounts WHERE type = ? AND CAST(code AS INTEGER) BETWEEN ? AND ?')
		.get(type, minCode, maxCode) as { max_code: number | null };

	const nextCode = row.max_code ? row.max_code + 1 : minCode;

	if (nextCode > maxCode) {
		throw new Error(`${type} のユーザー追加科目の上限（99件）に達しました`);
	}

	return String(nextCode);
}
