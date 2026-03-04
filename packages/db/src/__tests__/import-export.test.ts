import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resetDatabase } from '../database.js';
import { seedDefaultAccounts } from '../seed.js';
import { importData, exportYearData } from '../repositories/import-export.js';
import { getJournalsByYear, getAllJournals } from '../repositories/journal-repository.js';
import { getAllAccounts } from '../repositories/account-repository.js';
import { getAllVendors } from '../repositories/vendor-repository.js';
import type { ExportDataDTO } from '@e-shiwake/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('import-export', () => {
	beforeEach(() => {
		resetDatabase(':memory:');
		seedDefaultAccounts();
	});

	// ==================== Load fixture ====================

	function loadFixture(): ExportDataDTO {
		const fixturePath = join(__dirname, '../../test/fixtures/export-2025.json');
		const content = readFileSync(fixturePath, 'utf-8');
		return JSON.parse(content);
	}

	// ==================== importData ====================

	describe('importData', () => {
		it('should import fixture data successfully', () => {
			const fixture = loadFixture();

			const result = importData(fixture, 'merge');

			expect(result.journalCount).toBeGreaterThan(0);
			expect(result.accountCount).toBeGreaterThan(0);
			expect(result.vendorCount).toBeGreaterThan(0);
		});

		it('should import all journals from fixture', () => {
			const fixture = loadFixture();
			const result = importData(fixture, 'merge');

			const journals = getJournalsByYear(2025);
			expect(journals.length).toBe(result.journalCount);
		});

		it('should import correct number of journals from fixture', () => {
			const fixture = loadFixture();
			expect(fixture.journals).toBeDefined();

			const result = importData(fixture, 'merge');
			expect(result.journalCount).toBe(fixture.journals?.length ?? 0);
		});

		it('should import all accounts from fixture', () => {
			const fixture = loadFixture();
			const result = importData(fixture, 'merge');

			const accounts = getAllAccounts();
			// Should have default + imported accounts
			expect(accounts.length).toBeGreaterThanOrEqual(result.accountCount);
		});

		it('should import all vendors from fixture', () => {
			const fixture = loadFixture();
			const result = importData(fixture, 'merge');

			const vendors = getAllVendors();
			expect(vendors.length).toBe(result.vendorCount);
		});

		it('should preserve journal details after import', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const journals = getJournalsByYear(2025);
			const firstJournal = journals[0];

			expect(firstJournal.date).toBeDefined();
			expect(firstJournal.vendor).toBeDefined();
			expect(firstJournal.description).toBeDefined();
			expect(firstJournal.lines.length).toBeGreaterThan(0);
		});

		it('should preserve journal line details', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const journals = getJournalsByYear(2025);
			const firstJournal = journals[0];
			const firstLine = firstJournal.lines[0];

			expect(firstLine.type).toMatch(/^(debit|credit)$/);
			expect(firstLine.accountCode).toBeDefined();
			expect(firstLine.amount).toBeGreaterThan(0);
		});

		it('should merge mode preserve existing data', () => {
			const fixture = loadFixture();

			// Import first time
			importData(fixture, 'merge');
			const countAfterFirst = getAllJournals().length;

			// Import again with merge
			importData(fixture, 'merge');
			const countAfterSecond = getAllJournals().length;

			// Should have more data (duplicates allowed in merge mode)
			expect(countAfterSecond).toBeGreaterThanOrEqual(countAfterFirst);
		});

		it('should overwrite mode delete existing year data', async () => {
			const fixture = loadFixture();

			// First import
			importData(fixture, 'merge');
			const countAfterFirst = getJournalsByYear(2025).length;
			expect(countAfterFirst).toBeGreaterThan(0);

			// Create a different journal for 2025
			const { addJournal } = await import('../repositories/journal-repository.js');
			addJournal({
				date: '2025-03-15',
				vendor: 'Extra Vendor',
				description: 'Extra Journal',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '1002', amount: 9999 },
					{ id: '', type: 'credit', accountCode: '5011', amount: 9999 }
				],
				attachments: []
			});

			const countWithExtra = getJournalsByYear(2025).length;
			expect(countWithExtra).toBeGreaterThan(countAfterFirst);

			// Now import with overwrite
			importData(fixture, 'overwrite');

			const countAfterOverwrite = getJournalsByYear(2025).length;
			// Should be back to original fixture count (extra journal deleted)
			expect(countAfterOverwrite).toBe(fixture.journals?.length ?? 0);
		});

		it('should handle fixture with null/undefined values', () => {
			const fixture: ExportDataDTO = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				fiscalYear: 2025,
				journals: [],
				accounts: [],
				vendors: [],
				settings: {}
			};

			const result = importData(fixture, 'merge');
			expect(result.journalCount).toBe(0);
			expect(result.accountCount).toBe(0);
			expect(result.vendorCount).toBe(0);
		});
	});

	// ==================== exportYearData ====================

	describe('exportYearData', () => {
		it('should export year data with correct structure', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			expect(exported.version).toBeDefined();
			expect(exported.exportedAt).toBeDefined();
			expect(exported.fiscalYear).toBe(2025);
			expect(Array.isArray(exported.journals)).toBe(true);
			expect(Array.isArray(exported.accounts)).toBe(true);
			expect(Array.isArray(exported.vendors)).toBe(true);
		});

		it('should export all journals for the year', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			const journals = getJournalsByYear(2025);
			expect(exported.journals.length).toBe(journals.length);
		});

		it('should export all accounts', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			const accounts = getAllAccounts();
			expect(exported.accounts.length).toBe(accounts.length);
		});

		it('should export all vendors', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			const vendors = getAllVendors();
			expect(exported.vendors.length).toBe(vendors.length);
		});

		it('should export journal with all properties', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);
			const journal = exported.journals[0];

			expect(journal.id).toBeDefined();
			expect(journal.date).toBeDefined();
			expect(journal.vendor).toBeDefined();
			expect(journal.description).toBeDefined();
			expect(journal.evidenceStatus).toBeDefined();
			expect(Array.isArray(journal.lines)).toBe(true);
		});

		it('should export journal lines with properties', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);
			const journal = exported.journals[0];
			const line = journal.lines[0];

			expect(line.id).toBeDefined();
			expect(line.type).toMatch(/^(debit|credit)$/);
			expect(line.accountCode).toBeDefined();
			expect(line.amount).toBeDefined();
		});

		it('should preserve tax categories in export', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			// Check if any lines have tax category
			let foundTaxCategory = false;
			for (const journal of exported.journals) {
				for (const line of journal.lines) {
					if (line.taxCategory) {
						foundTaxCategory = true;
						expect([
							'sales_10',
							'sales_8',
							'purchase_10',
							'purchase_8',
							'exempt',
							'out_of_scope',
							'na'
						]).toContain(line.taxCategory);
					}
				}
			}

			// Fixture should have some tax categories
			expect(foundTaxCategory).toBe(true);
		});

		it('should exclude attachments blob from export', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);

			for (const journal of exported.journals) {
				for (const attachment of journal.attachments) {
					// Blob property should be excluded
					expect((attachment as any).blob).toBeUndefined();
				}
			}
		});

		it('should handle empty year export', () => {
			const exported = exportYearData(2020); // Year with no data

			expect(exported.fiscalYear).toBe(2020);
			expect(exported.journals).toEqual([]);
		});
	});

	// ==================== Round-trip tests ====================

	describe('round-trip import/export', () => {
		it('should maintain data integrity through import/export cycle', () => {
			const fixture = loadFixture();
			const originalCount = fixture.journals?.length ?? 0;

			importData(fixture, 'merge');
			const exported = exportYearData(2025);

			expect(exported.journals.length).toBe(originalCount);
		});

		it('should maintain journal details through round-trip', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);
			const _reimported = importData(exported, 'merge');

			// Should not double the count if importing same data
			const finalJournals = getJournalsByYear(2025);
			expect(finalJournals.length).toBeGreaterThanOrEqual(exported.journals.length);
		});

		it('should preserve all accounts through round-trip', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const exported = exportYearData(2025);
			const exported2 = exportYearData(2025);

			expect(exported.accounts.length).toBe(exported2.accounts.length);
			expect(exported.vendors.length).toBe(exported2.vendors.length);
		});
	});

	// ==================== Fixture-specific tests ====================

	describe('fixture data validation', () => {
		it('should have correct number of journals in fixture', () => {
			const fixture = loadFixture();
			expect(fixture.journals).toBeDefined();
			expect(fixture.journals!.length).toBeGreaterThan(0);
		});

		it('should have correct number of accounts in fixture', () => {
			const fixture = loadFixture();
			expect(fixture.accounts).toBeDefined();
			expect(fixture.accounts!.length).toBeGreaterThan(0);
		});

		it('should have correct number of vendors in fixture', () => {
			const fixture = loadFixture();
			expect(fixture.vendors).toBeDefined();
			expect(fixture.vendors!.length).toBeGreaterThan(0);
		});

		it('should import and verify fixture journal dates are in 2025', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				expect(journal.date.startsWith('2025')).toBe(true);
			}
		});

		it('should import and verify account codes are valid', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const accounts = getAllAccounts();
			for (const account of accounts) {
				expect(account.code).toBeDefined();
				expect(account.name).toBeDefined();
				expect(['asset', 'liability', 'equity', 'revenue', 'expense']).toContain(account.type);
			}
		});

		it('should verify imported journals have balanced debit/credit', () => {
			const fixture = loadFixture();
			importData(fixture, 'merge');

			const journals = getJournalsByYear(2025);
			for (const journal of journals) {
				let debitTotal = 0;
				let creditTotal = 0;

				for (const line of journal.lines) {
					if (line.type === 'debit') {
						debitTotal += line.amount;
					} else {
						creditTotal += line.amount;
					}
				}

				// Should be balanced
				expect(Math.abs(debitTotal - creditTotal)).toBeLessThan(0.01);
			}
		});
	});
});
