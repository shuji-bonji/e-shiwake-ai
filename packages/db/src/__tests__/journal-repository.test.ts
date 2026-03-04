import { beforeEach, describe, it, expect } from 'vitest';
import { resetDatabase } from '../database.js';
import { seedDefaultAccounts } from '../seed.js';
import {
	addJournal,
	getJournalById,
	getJournalsByYear,
	updateJournal,
	deleteJournal,
	getAvailableYears,
	deleteYearData,
	getAllJournals,
	countJournalLinesByAccountCode,
	updateTaxCategoryByAccountCode
} from '../repositories/journal-repository.js';
import type { JournalEntry } from '@e-shiwake/core';

describe('journal-repository', () => {
	beforeEach(() => {
		resetDatabase(':memory:');
		seedDefaultAccounts();
	});

	// ==================== addJournal ====================

	describe('addJournal', () => {
		it('should create a journal with two lines', () => {
			const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
				date: '2025-01-15',
				vendor: 'Amazon',
				description: 'USBケーブル購入',
				evidenceStatus: 'none',
				lines: [
					{
						id: '',
						type: 'debit',
						accountCode: '5011',
						amount: 3980
					},
					{
						id: '',
						type: 'credit',
						accountCode: '1002',
						amount: 3980
					}
				],
				attachments: []
			};

			const id = addJournal(journal);

			expect(id).toBeDefined();
			expect(typeof id).toBe('string');

			const created = getJournalById(id);
			expect(created).toBeDefined();
			expect(created!.date).toBe('2025-01-15');
			expect(created!.vendor).toBe('Amazon');
			expect(created!.description).toBe('USBケーブル購入');
			expect(created!.lines).toHaveLength(2);
		});

		it('should handle complex multi-line journals', () => {
			const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
				date: '2025-02-10',
				vendor: 'NTTドコモ',
				description: '携帯電話代',
				evidenceStatus: 'digital',
				lines: [
					{
						id: '',
						type: 'debit',
						accountCode: '5006',
						amount: 8000,
						taxCategory: 'purchase_10'
					},
					{
						id: '',
						type: 'debit',
						accountCode: '1004',
						amount: 2000,
						taxCategory: 'na'
					},
					{
						id: '',
						type: 'credit',
						accountCode: '1002',
						amount: 10000
					}
				],
				attachments: []
			};

			const id = addJournal(journal);
			const created = getJournalById(id);

			expect(created!.lines).toHaveLength(3);
			expect(created!.lines[0].accountCode).toBe('5006');
			expect(created!.lines[0].taxCategory).toBe('purchase_10');
			expect(created!.lines[2].type).toBe('credit');
			expect(created!.lines[2].amount).toBe(10000);
		});

		it('should auto-generate line IDs when not provided', () => {
			const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
				date: '2025-03-01',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{
						id: '',
						type: 'debit',
						accountCode: '1002',
						amount: 100
					},
					{
						id: '',
						type: 'credit',
						accountCode: '1002',
						amount: 100
					}
				],
				attachments: []
			};

			const id = addJournal(journal);
			const created = getJournalById(id);

			expect(created!.lines[0].id).toBeDefined();
			expect(created!.lines[1].id).toBeDefined();
			expect(created!.lines[0].id).not.toBe(created!.lines[1].id);
		});
	});

	// ==================== getJournalById ====================

	describe('getJournalById', () => {
		it('should return null for non-existent journal', () => {
			const result = getJournalById('non-existent-id');
			expect(result).toBeNull();
		});

		it('should retrieve full journal with all lines', () => {
			const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
				date: '2025-01-20',
				vendor: 'Client A',
				description: 'Consulting work',
				evidenceStatus: 'digital',
				lines: [
					{
						id: '',
						type: 'debit',
						accountCode: '1002',
						amount: 100000,
						taxCategory: 'sales_10'
					},
					{
						id: '',
						type: 'credit',
						accountCode: '4001',
						amount: 100000,
						taxCategory: 'sales_10'
					}
				],
				attachments: []
			};

			const id = addJournal(journal);
			const retrieved = getJournalById(id);

			expect(retrieved!.id).toBe(id);
			expect(retrieved!.vendor).toBe('Client A');
			expect(retrieved!.description).toBe('Consulting work');
			expect(retrieved!.evidenceStatus).toBe('digital');
			expect(retrieved!.lines).toHaveLength(2);
		});

		it('should preserve tax categories in retrieved journal', () => {
			const journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
				date: '2025-01-15',
				vendor: 'Vendor',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{
						id: '',
						type: 'debit',
						accountCode: '5011',
						amount: 1000,
						taxCategory: 'purchase_10'
					},
					{
						id: '',
						type: 'credit',
						accountCode: '1002',
						amount: 1000
					}
				],
				attachments: []
			};

			const id = addJournal(journal);
			const retrieved = getJournalById(id);

			expect(retrieved!.lines[0].taxCategory).toBe('purchase_10');
			expect(retrieved!.lines[1].taxCategory).toBeUndefined();
		});
	});

	// ==================== getJournalsByYear ====================

	describe('getJournalsByYear', () => {
		beforeEach(() => {
			// Add journals from different years
			addJournal({
				date: '2024-12-31',
				vendor: 'Vendor 2024',
				description: 'Last day of 2024',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-01-01',
				vendor: 'Vendor 2025-1',
				description: 'First day of 2025',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 2000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 2000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-06-15',
				vendor: 'Vendor 2025-2',
				description: 'Mid-year 2025',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 3000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 3000 }
				],
				attachments: []
			});

			addJournal({
				date: '2026-01-15',
				vendor: 'Vendor 2026',
				description: 'Early 2026',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 4000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 4000 }
				],
				attachments: []
			});
		});

		it('should return journals for a specific year in date descending order', () => {
			const journals = getJournalsByYear(2025);

			expect(journals).toHaveLength(2);
			// Should be in date DESC order
			expect(journals[0].date).toBe('2025-06-15');
			expect(journals[1].date).toBe('2025-01-01');
		});

		it('should exclude journals from other years', () => {
			const journals2024 = getJournalsByYear(2024);
			const journals2025 = getJournalsByYear(2025);
			const journals2026 = getJournalsByYear(2026);

			expect(journals2024).toHaveLength(1);
			expect(journals2025).toHaveLength(2);
			expect(journals2026).toHaveLength(1);
		});

		it('should return empty array for year with no journals', () => {
			const journals = getJournalsByYear(2020);
			expect(journals).toHaveLength(0);
		});
	});

	// ==================== updateJournal ====================

	describe('updateJournal', () => {
		let journalId: string;

		beforeEach(() => {
			journalId = addJournal({
				date: '2025-01-15',
				vendor: 'Original Vendor',
				description: 'Original Description',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});
		});

		it('should update journal header fields', () => {
			updateJournal(journalId, {
				vendor: 'Updated Vendor',
				description: 'Updated Description'
			});

			const updated = getJournalById(journalId);
			expect(updated!.vendor).toBe('Updated Vendor');
			expect(updated!.description).toBe('Updated Description');
			expect(updated!.date).toBe('2025-01-15'); // unchanged
		});

		it('should update evidence status', () => {
			updateJournal(journalId, {
				evidenceStatus: 'digital'
			});

			const updated = getJournalById(journalId);
			expect(updated!.evidenceStatus).toBe('digital');
		});

		it('should update date', () => {
			updateJournal(journalId, {
				date: '2025-02-20'
			});

			const updated = getJournalById(journalId);
			expect(updated!.date).toBe('2025-02-20');
		});

		it('should replace lines when lines are updated', () => {
			const newLines = [
				{ id: '', type: 'debit', accountCode: '5006', amount: 2000, taxCategory: 'purchase_10' },
				{ id: '', type: 'credit', accountCode: '1002', amount: 2000 }
			];

			updateJournal(journalId, {
				lines: newLines
			});

			const updated = getJournalById(journalId);
			expect(updated!.lines).toHaveLength(2);
			expect(updated!.lines[0].accountCode).toBe('5006');
			expect(updated!.lines[0].amount).toBe(2000);
		});

		it('should update updatedAt timestamp', () => {
			const before = getJournalById(journalId)!.updatedAt;

			// Small delay to ensure timestamp changes
			const startTime = Date.now();
			while (Date.now()- startTime < 10) {
				// busy wait
			}

			updateJournal(journalId, {
				vendor: 'New Vendor'
			});

			const after = getJournalById(journalId)!.updatedAt;
			expect(after).not.toBe(before);
			expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
		});
	});

	// ==================== deleteJournal ====================

	describe('deleteJournal', () => {
		it('should delete a journal and its lines', () => {
			const id = addJournal({
				date: '2025-01-15',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			expect(getJournalById(id)).toBeDefined();

			deleteJournal(id);

			expect(getJournalById(id)).toBeNull();
		});

		it('should cascade delete journal lines', () => {
			const id = addJournal({
				date: '2025-01-15',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 },
					{ id: '', type: 'debit', accountCode: '2001', amount: 500 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 500 }
				],
				attachments: []
			});

			const count = countJournalLinesByAccountCode('1002');
			expect(count).toBeGreaterThan(0);

			deleteJournal(id);

			const newCount = countJournalLinesByAccountCode('1002');
			expect(newCount).toBeLessThan(count);
		});

		it('should allow deleting non-existent journal without error', () => {
			// Should not throw
			expect(() => {
				deleteJournal('non-existent-id');
			}).not.toThrow();
		});
	});

	// ==================== getAvailableYears ====================

	describe('getAvailableYears', () => {
		it('should return current year when no journals exist', () => {
			const years = getAvailableYears();
			const currentYear = new Date().getFullYear();
			expect(years).toContain(currentYear);
		});

		it('should return all years with journals plus current year', () => {
			addJournal({
				date: '2023-06-15',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-01-01',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			const years = getAvailableYears();
			expect(years).toContain(2023);
			expect(years).toContain(2025);
			expect(years[0]).toBeGreaterThanOrEqual(years[1]);
		});

		it('should return years in descending order', () => {
			addJournal({
				date: '2020-01-01',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-01-01',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			const years = getAvailableYears();
			for (let i = 0; i < years.length - 1; i++) {
				expect(years[i]).toBeGreaterThanOrEqual(years[i + 1]);
			}
		});
	});

	// ==================== deleteYearData ====================

	describe('deleteYearData', () => {
		beforeEach(() => {
			addJournal({
				date: '2024-06-15',
				vendor: 'Test 2024',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-01-15',
				vendor: 'Test 2025-1',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 2000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 2000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-12-31',
				vendor: 'Test 2025-2',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 3000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 3000 }
				],
				attachments: []
			});

			addJournal({
				date: '2026-01-15',
				vendor: 'Test 2026',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 4000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 4000 }
				],
				attachments: []
			});
		});

		it('should delete all journals for a specific year', () => {
			const before = getJournalsByYear(2025);
			expect(before).toHaveLength(2);

			const result = deleteYearData(2025);
			expect(result.journalCount).toBe(2);

			const after = getJournalsByYear(2025);
			expect(after).toHaveLength(0);
		});

		it('should not affect journals from other years', () => {
			deleteYearData(2025);

			const journals2024 = getJournalsByYear(2024);
			const journals2026 = getJournalsByYear(2026);

			expect(journals2024).toHaveLength(1);
			expect(journals2026).toHaveLength(1);
		});

		it('should return counts', () => {
			const result = deleteYearData(2025);
			expect(result.journalCount).toBe(2);
			expect(result.attachmentCount).toBe(0);
		});
	});

	// ==================== countJournalLinesByAccountCode ====================

	describe('countJournalLinesByAccountCode', () => {
		it('should return 0 for unused account', () => {
			const count = countJournalLinesByAccountCode('5099');
			expect(count).toBe(0);
		});

		it('should count lines across multiple journals', () => {
			addJournal({
				date: '2025-01-15',
				vendor: 'Test 1',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-02-15',
				vendor: 'Test 2',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '5011', amount: 2000 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 2000 }
				],
				attachments: []
			});

			const count = countJournalLinesByAccountCode('5011');
			expect(count).toBe(2);
		});
	});

	// ==================== updateTaxCategoryByAccountCode ====================

	describe('updateTaxCategoryByAccountCode', () => {
		it('should update tax category for all lines using an account', () => {
			addJournal({
				date: '2025-01-15',
				vendor: 'Test 1',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '5011', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-02-15',
				vendor: 'Test 2',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '5011', amount: 2000, taxCategory: 'purchase_10' },
					{ id: '', type: 'credit', accountCode: '1002', amount: 2000 }
				],
				attachments: []
			});

			const changes = updateTaxCategoryByAccountCode('5011', 'purchase_8');

			// Both lines are updated: one from NULL, one from purchase_10
			expect(changes).toBe(2);
		});
	});

	// ==================== getAllJournals ====================

	describe('getAllJournals', () => {
		it('should return all journals in date descending order', () => {
			addJournal({
				date: '2025-01-15',
				vendor: 'Test 1',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 1000 }
				],
				attachments: []
			});

			addJournal({
				date: '2025-06-15',
				vendor: 'Test 2',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 2000 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 2000 }
				],
				attachments: []
			});

			const all = getAllJournals();
			expect(all.length).toBeGreaterThanOrEqual(2);
			// YYYY-MM-DD format allows lexicographic comparison
			expect(all[0].date >= all[1].date).toBe(true);
		});
	});
});
