import type Database from 'better-sqlite3';

/**
 * データベーススキーマの初期化
 * e-shiwake のデータ構造を SQLite テーブルとして作成
 */
export function initializeSchema(db: Database.Database): void {
	db.exec(`
		-- 勘定科目マスタ
		CREATE TABLE IF NOT EXISTS accounts (
			code TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
			is_system INTEGER NOT NULL DEFAULT 0,
			default_tax_category TEXT,
			business_ratio_enabled INTEGER DEFAULT 0,
			default_business_ratio REAL,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- 取引先マスタ
		CREATE TABLE IF NOT EXISTS vendors (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			address TEXT,
			contact_name TEXT,
			email TEXT,
			phone TEXT,
			payment_terms TEXT,
			note TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT
		);

		-- 仕訳ヘッダー
		CREATE TABLE IF NOT EXISTS journals (
			id TEXT PRIMARY KEY,
			date TEXT NOT NULL,
			vendor TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			evidence_status TEXT NOT NULL DEFAULT 'none'
				CHECK(evidence_status IN ('none', 'paper', 'digital')),
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- 仕訳明細行
		CREATE TABLE IF NOT EXISTS journal_lines (
			id TEXT PRIMARY KEY,
			journal_id TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
			account_code TEXT NOT NULL,
			amount REAL NOT NULL DEFAULT 0,
			tax_category TEXT,
			memo TEXT,
			_business_ratio_applied INTEGER DEFAULT 0,
			_original_amount REAL,
			_business_ratio REAL,
			_business_ratio_generated INTEGER DEFAULT 0,
			FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
			FOREIGN KEY (account_code) REFERENCES accounts(code)
		);

		-- 証憑
		CREATE TABLE IF NOT EXISTS attachments (
			id TEXT PRIMARY KEY,
			journal_id TEXT NOT NULL,
			document_date TEXT NOT NULL,
			document_type TEXT NOT NULL DEFAULT 'other'
				CHECK(document_type IN ('invoice', 'bill', 'receipt', 'contract', 'estimate', 'other')),
			original_name TEXT NOT NULL,
			generated_name TEXT NOT NULL,
			mime_type TEXT NOT NULL DEFAULT 'application/pdf',
			size INTEGER NOT NULL DEFAULT 0,
			description TEXT NOT NULL DEFAULT '',
			amount REAL NOT NULL DEFAULT 0,
			vendor TEXT NOT NULL DEFAULT '',
			storage_type TEXT NOT NULL DEFAULT 'filesystem'
				CHECK(storage_type IN ('filesystem', 'indexeddb')),
			file_path TEXT,
			exported_at TEXT,
			blob_purged_at TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
		);

		-- 固定資産
		CREATE TABLE IF NOT EXISTS fixed_assets (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			category TEXT NOT NULL
				CHECK(category IN ('building', 'structure', 'machinery', 'vehicle', 'equipment', 'other')),
			acquisition_date TEXT NOT NULL,
			acquisition_cost REAL NOT NULL,
			useful_life INTEGER NOT NULL,
			depreciation_method TEXT NOT NULL DEFAULT 'straight-line'
				CHECK(depreciation_method IN ('straight-line', 'declining-balance')),
			depreciation_rate REAL NOT NULL,
			business_ratio REAL NOT NULL DEFAULT 100,
			status TEXT NOT NULL DEFAULT 'active'
				CHECK(status IN ('active', 'sold', 'disposed')),
			disposal_date TEXT,
			memo TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- 請求書
		CREATE TABLE IF NOT EXISTS invoices (
			id TEXT PRIMARY KEY,
			invoice_number TEXT NOT NULL,
			issue_date TEXT NOT NULL,
			due_date TEXT NOT NULL,
			vendor_id TEXT NOT NULL,
			subtotal REAL NOT NULL DEFAULT 0,
			tax_amount REAL NOT NULL DEFAULT 0,
			total REAL NOT NULL DEFAULT 0,
			taxable_10 REAL NOT NULL DEFAULT 0,
			tax_10 REAL NOT NULL DEFAULT 0,
			taxable_8 REAL NOT NULL DEFAULT 0,
			tax_8 REAL NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'draft'
				CHECK(status IN ('draft', 'issued', 'paid')),
			note TEXT,
			journal_id TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (vendor_id) REFERENCES vendors(id),
			FOREIGN KEY (journal_id) REFERENCES journals(id)
		);

		-- 請求書明細行
		CREATE TABLE IF NOT EXISTS invoice_items (
			id TEXT PRIMARY KEY,
			invoice_id TEXT NOT NULL,
			date TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			quantity REAL NOT NULL DEFAULT 1,
			unit_price REAL NOT NULL DEFAULT 0,
			amount REAL NOT NULL DEFAULT 0,
			tax_rate INTEGER NOT NULL DEFAULT 10 CHECK(tax_rate IN (10, 8)),
			FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
		);

		-- 設定
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- インデックス
		CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(date);
		CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id ON journal_lines(journal_id);
		CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON journal_lines(account_code);
		CREATE INDEX IF NOT EXISTS idx_attachments_journal_id ON attachments(journal_id);
		CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
		CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

		-- WAL モードを有効化（パフォーマンス向上）
		PRAGMA journal_mode = WAL;
		PRAGMA foreign_keys = ON;
	`);
}
