import type { ExportDataDTO } from '@e-shiwake/core';
import { getDatabase } from '../database.js';
import { addJournal, getJournalsByYear } from './journal-repository.js';
import { getAllAccounts } from './account-repository.js';
import { getAllVendors } from './vendor-repository.js';

/**
 * 年度データをエクスポート（JSON用DTO）
 */
export function exportYearData(fiscalYear: number): ExportDataDTO {
	const journals = getJournalsByYear(fiscalYear);
	const accounts = getAllAccounts();
	const vendors = getAllVendors();

	// attachmentsからblobを除外（SQLite版ではblobはないが互換性のため）
	const exportJournals = journals.map((j) => ({
		...j,
		attachments: j.attachments.map((a) => {
			const { blob: _blob, ...rest } = a;
			return rest;
		})
	}));

	return {
		version: '1.0.0',
		exportedAt: new Date().toISOString(),
		fiscalYear,
		journals: exportJournals,
		accounts,
		vendors,
		settings: {} as ExportDataDTO['settings']
	};
}

/**
 * JSONデータをインポート
 */
export function importData(
	data: ExportDataDTO,
	mode: 'merge' | 'overwrite' = 'merge'
): { journalCount: number; accountCount: number; vendorCount: number } {
	const db = getDatabase();

	let journalCount = 0;
	let accountCount = 0;
	let vendorCount = 0;

	const transaction = db.transaction(() => {
		// 上書きモード: 対象年度のデータを削除
		if (mode === 'overwrite' && data.fiscalYear) {
			const startDate = `${data.fiscalYear}-01-01`;
			const endDate = `${data.fiscalYear}-12-31`;
			db.prepare('DELETE FROM journals WHERE date BETWEEN ? AND ?').run(startDate, endDate);
		}

		// 勘定科目のインポート
		const upsertAccount = db.prepare(`
			INSERT OR REPLACE INTO accounts (code, name, type, is_system, default_tax_category,
				business_ratio_enabled, default_business_ratio, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		for (const account of data.accounts ?? []) {
			upsertAccount.run(
				account.code,
				account.name,
				account.type,
				account.isSystem ? 1 : 0,
				account.defaultTaxCategory ?? null,
				account.businessRatioEnabled ? 1 : 0,
				account.defaultBusinessRatio ?? null,
				account.createdAt
			);
			accountCount++;
		}

		// 取引先のインポート
		const upsertVendor = db.prepare(`
			INSERT OR IGNORE INTO vendors (id, name, address, contact_name, email, phone, payment_terms, note, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		for (const vendor of data.vendors ?? []) {
			upsertVendor.run(
				vendor.id,
				vendor.name,
				vendor.address ?? null,
				vendor.contactName ?? null,
				vendor.email ?? null,
				vendor.phone ?? null,
				vendor.paymentTerms ?? null,
				vendor.note ?? null,
				vendor.createdAt,
				vendor.updatedAt ?? null
			);
			vendorCount++;
		}

		// 仕訳のインポート
		for (const journal of data.journals ?? []) {
			try {
				addJournal({
					date: journal.date,
					lines: journal.lines,
					vendor: journal.vendor,
					description: journal.description,
					evidenceStatus: journal.evidenceStatus,
					attachments: []
				});
				journalCount++;
			} catch {
				// 重複IDの場合はスキップ
			}
		}
	});

	transaction();

	return { journalCount, accountCount, vendorCount };
}
