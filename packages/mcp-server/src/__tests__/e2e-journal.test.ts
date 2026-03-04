/**
 * e2e-journal.test.ts
 *
 * Journal workflow end-to-end tests
 *
 * Tests the complete journal CRUD workflow with real data imported from fixture:
 * 1. Import fixture data (76 journals, 66 accounts, 27 vendors, FY2025)
 * 2. List fiscal years
 * 3. List journals for 2025
 * 4. Get individual journal details
 * 5. Create a new journal
 * 6. Update that journal
 * 7. Delete that journal
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExportDataDTO } from '@e-shiwake/core';
import {
	addJournal,
	deleteJournal,
	getAllAccounts,
	getAvailableYears,
	getDatabase,
	getJournalById,
	getJournalsByYear,
	importData,
	resetDatabase,
	seedDefaultAccounts,
	updateJournal
} from '@e-shiwake/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_PATH = join(__dirname, '../../../db/test/fixtures/export-2025.json');

describe('E2E: Journal Workflow', () => {
	beforeEach(() => {
		// Reset and initialize database
		resetDatabase();
		getDatabase();
		seedDefaultAccounts();
	});

	afterEach(() => {
		// Clean up
		resetDatabase();
	});

	describe('Setup: Import fixture data', () => {
		it('should load fixture file', () => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			expect(data.version).toBe('1.0.0');
			expect(data.fiscalYear).toBe(2025);
			expect(data.journals.length).toBe(76);
			expect(data.accounts.length).toBe(66);
			expect(data.vendors.length).toBe(27);
		});

		it('should import fixture data into database', () => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);

			const result = importData(data, 'merge');
			expect(result.journalCount).toBe(76);
			expect(result.accountCount).toBe(66);
			expect(result.vendorCount).toBe(27);
		});
	});

	describe('List fiscal years', () => {
		it('should return 2025 as available year after importing fixture', () => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');

			const years = getAvailableYears();
			expect(years).toContain(2025);
		});

		it('should return current year even before import', () => {
			const years = getAvailableYears();
			const currentYear = new Date().getFullYear();
			expect(years).toContain(currentYear);
			// Only current year should be present (no journal data yet)
			expect(years).toHaveLength(1);
		});
	});

	describe('List journals for fiscal year', () => {
		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');
		});

		it('should return 76 journals for 2025', () => {
			const journals = getJournalsByYear(2025);
			expect(journals).toHaveLength(76);
		});

		it('should return empty array for non-existent year', () => {
			const journals = getJournalsByYear(2024);
			expect(journals).toHaveLength(0);
		});

		it('should have valid structure for all journals', () => {
			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				expect(journal.id).toBeDefined();
				expect(journal.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(journal.vendor).toBeDefined();
				expect(journal.description).toBeTruthy();
				expect(journal.lines.length).toBeGreaterThanOrEqual(2);
				expect(['none', 'paper', 'digital']).toContain(journal.evidenceStatus);
			}
		});

		it('should have debit/credit balance for all journals', () => {
			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				const debitSum = journal.lines
					.filter((l) => l.type === 'debit')
					.reduce((s, l) => s + l.amount, 0);
				const creditSum = journal.lines
					.filter((l) => l.type === 'credit')
					.reduce((s, l) => s + l.amount, 0);
				expect(debitSum).toBe(creditSum);
			}
		});

		it('should contain journals sorted by date (newest first)', () => {
			const journals = getJournalsByYear(2025);
			for (let i = 0; i < journals.length - 1; i++) {
				const current = new Date(journals[i].date);
				const next = new Date(journals[i + 1].date);
				expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
			}
		});
	});

	describe('Get journal by ID', () => {
		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');
		});

		it('should retrieve journal by ID', () => {
			const journals = getJournalsByYear(2025);
			const targetJournal = journals[0];

			const retrieved = getJournalById(targetJournal.id);
			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(targetJournal.id);
			expect(retrieved?.date).toBe(targetJournal.date);
			expect(retrieved?.vendor).toBe(targetJournal.vendor);
			expect(retrieved?.description).toBe(targetJournal.description);
		});

		it('should return null for non-existent ID', () => {
			const retrieved = getJournalById('00000000-0000-0000-0000-000000000000');
			expect(retrieved).toBeNull();
		});

		it('should have complete line details', () => {
			const journals = getJournalsByYear(2025);
			const targetJournal = journals[0];

			const retrieved = getJournalById(targetJournal.id);
			expect(retrieved?.lines).toHaveLength(targetJournal.lines.length);

			for (const line of retrieved?.lines ?? []) {
				expect(line.id).toBeDefined();
				expect(['debit', 'credit']).toContain(line.type);
				expect(line.accountCode).toMatch(/^\d{4}$/);
				expect(line.amount).toBeGreaterThan(0);
			}
		});
	});

	describe('Create journal', () => {
		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');
		});

		it('should create a new simple journal', () => {
			const countBefore = getJournalsByYear(2025).length;

			const journalId = addJournal({
				date: '2025-03-10',
				vendor: 'テスト取引先',
				description: 'テスト仕訳',
				evidenceStatus: 'none',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 10000, taxCategory: 'na' },
					{ type: 'credit', accountCode: '1003', amount: 10000, taxCategory: 'na' }
				],
				attachments: []
			});

			expect(journalId).toBeDefined();

			const created = getJournalById(journalId);
			expect(created).toBeDefined();
			expect(created?.date).toBe('2025-03-10');
			expect(created?.vendor).toBe('テスト取引先');
			expect(created?.description).toBe('テスト仕訳');
			expect(created?.evidenceStatus).toBe('none');
			expect(created?.lines).toHaveLength(2);

			const countAfter = getJournalsByYear(2025).length;
			expect(countAfter).toBe(countBefore + 1);
		});

		it('should create a complex (compound) journal', () => {
			const journalId = addJournal({
				date: '2025-03-10',
				vendor: '家事按分テスト',
				description: '携帯電話代',
				evidenceStatus: 'none',
				lines: [
					{ type: 'debit', accountCode: '5009', amount: 8000, taxCategory: 'purchase_10' }, // 通信費
					{ type: 'debit', accountCode: '3001', amount: 2000, taxCategory: 'na' }, // 事業主貸
					{ type: 'credit', accountCode: '1003', amount: 10000, taxCategory: 'na' } // 普通預金
				],
				attachments: []
			});

			const created = getJournalById(journalId);
			expect(created?.lines).toHaveLength(3);

			const debitSum =
				created?.lines.filter((l) => l.type === 'debit').reduce((s, l) => s + l.amount, 0) ?? 0;
			const creditSum =
				created?.lines.filter((l) => l.type === 'credit').reduce((s, l) => s + l.amount, 0) ?? 0;
			expect(debitSum).toBe(creditSum);
		});

		it('should create journal with tax category', () => {
			const journalId = addJournal({
				date: '2025-03-10',
				vendor: 'テスト',
				description: '売上',
				evidenceStatus: 'digital',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 11000, taxCategory: 'sales_10' },
					{ type: 'credit', accountCode: '4001', amount: 10000, taxCategory: 'sales_10' },
					{ type: 'credit', accountCode: '2011', amount: 1000, taxCategory: 'na' }
				],
				attachments: []
			});

			const created = getJournalById(journalId);
			expect(created?.lines[0].taxCategory).toBe('sales_10');
		});

		it('should create multiple journals and maintain order', () => {
			addJournal({
				date: '2025-03-01',
				vendor: 'A社',
				description: '早い日付',
				evidenceStatus: 'none',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 1000, taxCategory: 'na' },
					{ type: 'credit', accountCode: '1003', amount: 1000, taxCategory: 'na' }
				],
				attachments: []
			});

			addJournal({
				date: '2025-03-20',
				vendor: 'B社',
				description: '遅い日付',
				evidenceStatus: 'none',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 2000, taxCategory: 'na' },
					{ type: 'credit', accountCode: '1003', amount: 2000, taxCategory: 'na' }
				],
				attachments: []
			});

			const journals = getJournalsByYear(2025);
			const recentJournals = journals.filter((j) => j.date.startsWith('2025-03'));
			expect(recentJournals[0].date).toBe('2025-03-20'); // Newest first
			expect(recentJournals[1].date).toBe('2025-03-01');
		});
	});

	describe('Update journal', () => {
		let targetJournalId: string;

		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');

			const journals = getJournalsByYear(2025);
			targetJournalId = journals[0].id;
		});

		it('should update journal description', () => {
			updateJournal(targetJournalId, {
				date: '2025-03-10',
				vendor: 'Updated Vendor',
				description: 'Updated Description',
				evidenceStatus: 'paper',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 5000, taxCategory: 'na' },
					{ type: 'credit', accountCode: '1003', amount: 5000, taxCategory: 'na' }
				],
				attachments: []
			});

			const updated = getJournalById(targetJournalId);
			expect(updated?.description).toBe('Updated Description');
			expect(updated?.vendor).toBe('Updated Vendor');
			expect(updated?.evidenceStatus).toBe('paper');
		});

		it('should update journal lines while maintaining balance', () => {
			const originalJournal = getJournalById(targetJournalId);
			expect(originalJournal).toBeDefined();

			updateJournal(targetJournalId, {
				date: originalJournal!.date,
				vendor: originalJournal!.vendor,
				description: originalJournal!.description,
				evidenceStatus: originalJournal!.evidenceStatus,
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 50000, taxCategory: 'na' },
					{ type: 'debit', accountCode: '1003', amount: 50000, taxCategory: 'na' },
					{ type: 'credit', accountCode: '2001', amount: 100000, taxCategory: 'na' }
				],
				attachments: []
			});

			const updated = getJournalById(targetJournalId);
			expect(updated?.lines).toHaveLength(3);

			const debitSum =
				updated?.lines.filter((l) => l.type === 'debit').reduce((s, l) => s + l.amount, 0) ?? 0;
			const creditSum =
				updated?.lines.filter((l) => l.type === 'credit').reduce((s, l) => s + l.amount, 0) ?? 0;
			expect(debitSum).toBe(creditSum);
		});

		it('should update only specified fields', () => {
			const originalJournal = getJournalById(targetJournalId);
			const originalVendor = originalJournal?.vendor;
			const originalLines = originalJournal?.lines;

			updateJournal(targetJournalId, {
				date: '2025-01-01',
				vendor: originalVendor ?? 'Unknown',
				description: 'Only description changed',
				evidenceStatus: originalJournal?.evidenceStatus ?? 'none',
				lines: originalLines ?? []
			});

			const updated = getJournalById(targetJournalId);
			expect(updated?.date).toBe('2025-01-01');
			expect(updated?.description).toBe('Only description changed');
			expect(updated?.vendor).toBe(originalVendor);
		});
	});

	describe('Delete journal', () => {
		let targetJournalId: string;

		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');

			const journals = getJournalsByYear(2025);
			targetJournalId = journals[0].id;
		});

		it('should delete journal by ID', () => {
			const countBefore = getJournalsByYear(2025).length;

			deleteJournal(targetJournalId);

			const countAfter = getJournalsByYear(2025).length;
			expect(countAfter).toBe(countBefore - 1);

			const deleted = getJournalById(targetJournalId);
			expect(deleted).toBeNull();
		});

		it('should not affect other journals when deleting', () => {
			const journals = getJournalsByYear(2025);
			const otherJournalId = journals[1].id;

			deleteJournal(targetJournalId);

			const remaining = getJournalById(otherJournalId);
			expect(remaining).toBeDefined();
			expect(remaining?.id).toBe(otherJournalId);
		});

		it('should handle deletion of non-existent journal gracefully', () => {
			expect(() => {
				deleteJournal('00000000-0000-0000-0000-000000000000');
			}).not.toThrow();
		});
	});

	describe('Comprehensive workflow', () => {
		it('should execute complete CRUD workflow', () => {
			// Import fixture
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			const importResult = importData(data, 'merge');
			expect(importResult.journalCount).toBe(76);

			// List years
			const years = getAvailableYears();
			expect(years).toContain(2025);

			// List journals
			const journalsBefore = getJournalsByYear(2025);
			expect(journalsBefore.length).toBe(76);

			// Get a journal
			const targetJournal = journalsBefore[0];
			const retrieved = getJournalById(targetJournal.id);
			expect(retrieved?.id).toBe(targetJournal.id);

			// Create new journal
			const newJournalId = addJournal({
				date: '2025-03-15',
				vendor: 'New Test Vendor',
				description: 'Complete workflow test',
				evidenceStatus: 'digital',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 15000, taxCategory: 'sales_10' },
					{ type: 'credit', accountCode: '4001', amount: 15000, taxCategory: 'sales_10' }
				],
				attachments: []
			});
			expect(newJournalId).toBeDefined();

			const journalsAfterCreate = getJournalsByYear(2025);
			expect(journalsAfterCreate.length).toBe(77);

			// Update the new journal
			updateJournal(newJournalId, {
				date: '2025-03-16',
				vendor: 'Updated Vendor Name',
				description: 'Updated description',
				evidenceStatus: 'paper',
				lines: [
					{ type: 'debit', accountCode: '1001', amount: 20000, taxCategory: 'sales_10' },
					{ type: 'credit', accountCode: '4001', amount: 20000, taxCategory: 'sales_10' }
				],
				attachments: []
			});

			const updated = getJournalById(newJournalId);
			expect(updated?.date).toBe('2025-03-16');
			expect(updated?.vendor).toBe('Updated Vendor Name');
			expect(updated?.evidenceStatus).toBe('paper');

			// Delete the new journal
			deleteJournal(newJournalId);

			const journalsAfterDelete = getJournalsByYear(2025);
			expect(journalsAfterDelete.length).toBe(76);

			// Verify original journal still exists
			const originalStillExists = getJournalById(targetJournal.id);
			expect(originalStillExists?.id).toBe(targetJournal.id);
		});
	});

	describe('Data integrity checks', () => {
		beforeEach(() => {
			const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
			const data: ExportDataDTO = JSON.parse(fileContent);
			importData(data, 'merge');
		});

		it('all accounts in journals should exist in accounts table', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();
			const accountCodes = new Set(accounts.map((a) => a.code));

			const usedCodes = new Set<string>();
			for (const journal of journals) {
				for (const line of journal.lines) {
					usedCodes.add(line.accountCode);
				}
			}

			for (const code of usedCodes) {
				expect(accountCodes.has(code)).toBe(true);
			}
		});

		it('all journals should have at least 2 lines', () => {
			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				expect(journal.lines.length).toBeGreaterThanOrEqual(2);
			}
		});

		it('all journal dates should be valid', () => {
			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				const date = new Date(journal.date);
				expect(date instanceof Date && !Number.isNaN(date.getTime())).toBe(true);
				expect(journal.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		});
	});
});
