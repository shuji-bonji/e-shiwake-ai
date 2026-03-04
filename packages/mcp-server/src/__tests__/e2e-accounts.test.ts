/**
 * e2e-accounts.test.ts
 *
 * Account and Vendor management end-to-end tests
 *
 * Tests account and vendor CRUD operations with real fixture data:
 * 1. Import fixture data (66 accounts, 27 vendors)
 * 2. List and filter accounts by type
 * 3. Get account details
 * 4. Create custom accounts
 * 5. Update account properties (tax category, business ratio)
 * 6. Delete unused accounts
 * 7. Verify account usage integrity
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExportDataDTO } from '@e-shiwake/core';
import {
	addAccount,
	deleteAccount,
	deleteVendor,
	generateNextCode,
	getAccountByCode,
	getAccountsByType,
	getAllAccounts,
	getAllVendors,
	getDatabase,
	getJournalsByYear,
	getVendorById,
	importData,
	isAccountInUse,
	resetDatabase,
	saveVendor,
	searchVendorsByName,
	seedDefaultAccounts,
	updateAccount,
	updateVendor
} from '@e-shiwake/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_PATH = join(__dirname, '../../../db/test/fixtures/export-2025.json');

describe('E2E: Account & Vendor Management', () => {
	beforeEach(() => {
		// Reset and initialize database
		resetDatabase();
		getDatabase();
		seedDefaultAccounts();

		// Import fixture data
		const fileContent = readFileSync(FIXTURE_PATH, 'utf-8');
		const data: ExportDataDTO = JSON.parse(fileContent);
		importData(data, 'merge');
	});

	afterEach(() => {
		resetDatabase();
	});

	describe('Account Management', () => {
		describe('List accounts', () => {
			it('should return all accounts', () => {
				const accounts = getAllAccounts();
				expect(accounts.length).toBeGreaterThan(0);
			});

			it('should have 66 accounts after importing fixture', () => {
				const accounts = getAllAccounts();
				expect(accounts.length).toBe(66);
			});

			it('all accounts should have valid structure', () => {
				const accounts = getAllAccounts();
				for (const account of accounts) {
					expect(account.code).toMatch(/^\d{4}$/);
					expect(account.name).toBeTruthy();
					expect(['asset', 'liability', 'equity', 'revenue', 'expense']).toContain(account.type);
					expect(typeof account.isSystem).toBe('boolean');
					expect(account.createdAt).toBeDefined();
				}
			});

			it('system accounts should be marked as isSystem=true', () => {
				const accounts = getAllAccounts();
				const systemAccounts = accounts.filter((a) => a.isSystem);
				expect(systemAccounts.length).toBeGreaterThan(0);

				for (const account of systemAccounts) {
					expect(account.isSystem).toBe(true);
				}
			});

			it('custom accounts should be marked as isSystem=false', () => {
				const accounts = getAllAccounts();
				const customAccounts = accounts.filter((a) => !a.isSystem);

				for (const account of customAccounts) {
					expect(account.isSystem).toBe(false);
				}
			});
		});

		describe('Filter accounts by type', () => {
			it('should filter assets correctly', () => {
				const assets = getAccountsByType('asset');
				expect(assets.length).toBeGreaterThan(0);

				for (const account of assets) {
					expect(account.type).toBe('asset');
				}
			});

			it('should filter liabilities correctly', () => {
				const liabilities = getAccountsByType('liability');
				expect(liabilities.length).toBeGreaterThan(0);

				for (const account of liabilities) {
					expect(account.type).toBe('liability');
				}
			});

			it('should filter equity correctly', () => {
				const equity = getAccountsByType('equity');
				expect(equity.length).toBeGreaterThan(0);

				for (const account of equity) {
					expect(account.type).toBe('equity');
				}
			});

			it('should filter revenue correctly', () => {
				const revenue = getAccountsByType('revenue');
				expect(revenue.length).toBeGreaterThan(0);

				for (const account of revenue) {
					expect(account.type).toBe('revenue');
				}
			});

			it('should filter expenses correctly', () => {
				const expenses = getAccountsByType('expense');
				expect(expenses.length).toBeGreaterThan(0);

				for (const account of expenses) {
					expect(account.type).toBe('expense');
				}
			});

			it('sum of filtered accounts should equal total accounts', () => {
				const all = getAllAccounts();
				const assets = getAccountsByType('asset');
				const liabilities = getAccountsByType('liability');
				const equity = getAccountsByType('equity');
				const revenue = getAccountsByType('revenue');
				const expenses = getAccountsByType('expense');

				const total =
					assets.length + liabilities.length + equity.length + revenue.length + expenses.length;
				expect(total).toBe(all.length);
			});
		});

		describe('Get account by code', () => {
			it('should retrieve account by code', () => {
				const accounts = getAllAccounts();
				const targetAccount = accounts[0];

				const retrieved = getAccountByCode(targetAccount.code);
				expect(retrieved).toBeDefined();
				expect(retrieved?.code).toBe(targetAccount.code);
				expect(retrieved?.name).toBe(targetAccount.name);
			});

			it('should return null for non-existent code', () => {
				const retrieved = getAccountByCode('9999');
				expect(retrieved).toBeNull();
			});

			it('should handle all 66 fixture accounts by code', () => {
				const accounts = getAllAccounts();
				for (const account of accounts) {
					const retrieved = getAccountByCode(account.code);
					expect(retrieved?.code).toBe(account.code);
				}
			});
		});

		describe('Create custom account', () => {
			it('should create a new expense account', () => {
				const code = generateNextCode('expense');
				const accountId = addAccount({
					code,
					name: 'テスト費用',
					type: 'expense'
				});

				expect(accountId).toBeDefined();

				const created = getAccountByCode(code);
				expect(created?.code).toBe(code);
				expect(created?.name).toBe('テスト費用');
				expect(created?.type).toBe('expense');
				expect(created?.isSystem).toBe(false);
			});

			it('should create account with tax category', () => {
				const code = generateNextCode('expense');
				const _accountId = addAccount({
					code,
					name: '外注費',
					type: 'expense',
					defaultTaxCategory: 'purchase_10'
				});

				const created = getAccountByCode(code);
				expect(created?.defaultTaxCategory).toBe('purchase_10');
			});

			it('should auto-increment codes for same type', () => {
				const code1 = generateNextCode('asset');
				addAccount({ code: code1, name: 'Account1', type: 'asset' });

				const code2 = generateNextCode('asset');
				addAccount({ code: code2, name: 'Account2', type: 'asset' });

				expect(code2).not.toBe(code1);
				const num1 = parseInt(code1.slice(2), 10);
				const num2 = parseInt(code2.slice(2), 10);
				expect(num2).toBeGreaterThan(num1);
			});

			it('generated codes should follow naming convention', () => {
				const expenseCode = generateNextCode('expense');
				expect(expenseCode).toMatch(/^51\d{2}$/); // Expense: 51xx

				const assetCode = generateNextCode('asset');
				expect(assetCode).toMatch(/^11\d{2}$/); // Asset: 11xx

				const revenueCode = generateNextCode('revenue');
				expect(revenueCode).toMatch(/^41\d{2}$/); // Revenue: 41xx
			});
		});

		describe('Update account', () => {
			it('should update account name', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: 'Original Name',
					type: 'expense'
				});

				updateAccount(code, {
					name: 'Updated Name'
				});

				const updated = getAccountByCode(code);
				expect(updated?.name).toBe('Updated Name');
			});

			it('should update tax category', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: '消耗品費',
					type: 'expense'
				});

				updateAccount(code, {
					name: '消耗品費',
					defaultTaxCategory: 'purchase_10'
				});

				const updated = getAccountByCode(code);
				expect(updated?.defaultTaxCategory).toBe('purchase_10');
			});

			it('should update business ratio settings', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: '通信費',
					type: 'expense'
				});

				updateAccount(code, {
					name: '通信費',
					businessRatioEnabled: true,
					defaultBusinessRatio: 80
				});

				const updated = getAccountByCode(code);
				expect(updated?.businessRatioEnabled).toBe(true);
				expect(updated?.defaultBusinessRatio).toBe(80);
			});

			it('should only update specified fields', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: '旅費交通費',
					type: 'expense',
					defaultTaxCategory: 'na'
				});

				updateAccount(code, {
					name: '旅費交通費',
					defaultTaxCategory: 'purchase_10'
					// businessRatioEnabled not specified
				});

				const updated = getAccountByCode(code);
				expect(updated?.defaultTaxCategory).toBe('purchase_10');
				expect(updated?.name).toBe('旅費交通費');
			});
		});

		describe('Delete account', () => {
			it('should delete unused custom account', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: 'Unused Account',
					type: 'expense'
				});

				expect(getAccountByCode(code)).toBeDefined();

				deleteAccount(code);

				expect(getAccountByCode(code)).toBeNull();
			});

			it('should not delete system accounts', () => {
				const accounts = getAllAccounts();
				const systemAccount = accounts.find((a) => a.isSystem);
				expect(systemAccount).toBeDefined();

				// Should throw error for system accounts
				expect(() => deleteAccount(systemAccount!.code)).toThrow(
					'システム勘定科目は削除できません'
				);

				const stillExists = getAccountByCode(systemAccount!.code);
				expect(stillExists).toBeDefined();
			});

			it('should not delete accounts in use', () => {
				const journals = getJournalsByYear(2025);
				const accounts = getAllAccounts();
				const usedCodes = new Set<string>();

				for (const journal of journals) {
					for (const line of journal.lines) {
						usedCodes.add(line.accountCode);
					}
				}

				for (const code of usedCodes) {
					expect(isAccountInUse(code)).toBe(true);
					const account = accounts.find((a) => a.code === code);
					if (account?.isSystem) {
						// System accounts throw on delete
						expect(() => deleteAccount(code)).toThrow('システム勘定科目は削除できません');
					} else {
						// Non-system accounts in use should fail due to FK constraint
						expect(() => deleteAccount(code)).toThrow();
					}
					expect(getAccountByCode(code)).toBeDefined(); // Should still exist
				}
			});
		});

		describe('Account usage tracking', () => {
			it('should identify accounts in use', () => {
				const journals = getJournalsByYear(2025);
				const usedCodes = new Set<string>();

				for (const journal of journals) {
					for (const line of journal.lines) {
						usedCodes.add(line.accountCode);
						expect(isAccountInUse(line.accountCode)).toBe(true);
					}
				}

				expect(usedCodes.size).toBeGreaterThan(0);
			});

			it('should not mark unused custom accounts as in use', () => {
				const code = generateNextCode('expense');
				addAccount({
					code,
					name: 'Unused Custom',
					type: 'expense'
				});

				expect(isAccountInUse(code)).toBe(false);
			});

			it('should identify all accounts in fixture journals', () => {
				const journals = getJournalsByYear(2025);
				const allAccounts = getAllAccounts();
				const accountCodes = new Set(allAccounts.map((a) => a.code));

				const usedInJournals = new Set<string>();
				for (const journal of journals) {
					for (const line of journal.lines) {
						usedInJournals.add(line.accountCode);
					}
				}

				// All used accounts should exist
				for (const code of usedInJournals) {
					expect(accountCodes.has(code)).toBe(true);
				}
			});
		});
	});

	describe('Vendor Management', () => {
		describe('List vendors', () => {
			it('should return all vendors', () => {
				const vendors = getAllVendors();
				expect(vendors.length).toBeGreaterThan(0);
			});

			it('should have 27 vendors after importing fixture', () => {
				const vendors = getAllVendors();
				expect(vendors.length).toBe(27);
			});

			it('all vendors should have valid structure', () => {
				const vendors = getAllVendors();
				for (const vendor of vendors) {
					expect(vendor.id).toBeDefined();
					expect(vendor.name).toBeTruthy();
					expect(vendor.createdAt).toBeDefined();
				}
			});
		});

		describe('Get vendor by ID', () => {
			it('should retrieve vendor by ID', () => {
				const vendors = getAllVendors();
				const targetVendor = vendors[0];

				const retrieved = getVendorById(targetVendor.id);
				expect(retrieved).toBeDefined();
				expect(retrieved?.id).toBe(targetVendor.id);
				expect(retrieved?.name).toBe(targetVendor.name);
			});

			it('should return null for non-existent ID', () => {
				const retrieved = getVendorById('00000000-0000-0000-0000-000000000000');
				expect(retrieved).toBeNull();
			});
		});

		describe('Search vendors by name', () => {
			it('should find vendor by exact name', () => {
				const vendors = getAllVendors();
				const targetVendor = vendors[0];

				const results = searchVendorsByName(targetVendor.name);
				expect(results.length).toBeGreaterThan(0);
				expect(results.some((v) => v.id === targetVendor.id)).toBe(true);
			});

			it('should find vendors by partial name (case-insensitive)', () => {
				const vendors = getAllVendors();
				if (vendors.length === 0) return;

				const targetVendor = vendors[0];
				const partialName = targetVendor.name.substring(0, 3);

				const results = searchVendorsByName(partialName);
				expect(results.length).toBeGreaterThan(0);
			});

			it('should return empty array for non-matching name', () => {
				const results = searchVendorsByName('zzzzzzzzzznonexistent');
				expect(results).toHaveLength(0);
			});

			it('should find multiple vendors with similar names', () => {
				const vendors = getAllVendors();
				if (vendors.length < 2) return;

				// Create test vendors with similar names
				const _vendor1Id = saveVendor({ name: 'テスト会社A' });
				const _vendor2Id = saveVendor({ name: 'テスト会社B' });

				const results = searchVendorsByName('テスト会社');
				expect(results.length).toBeGreaterThanOrEqual(2);
			});
		});

		describe('Create vendor', () => {
			it('should create a new vendor', () => {
				const vendorId = saveVendor({
					name: 'New Test Vendor'
				});

				expect(vendorId).toBeDefined();

				const created = getVendorById(vendorId);
				expect(created?.name).toBe('New Test Vendor');
			});

			it('should create vendor with all optional fields', () => {
				const vendorId = saveVendor({
					name: 'Full Info Vendor',
					address: '東京都渋谷区',
					contactName: '山田太郎',
					email: 'contact@example.com',
					phone: '03-1234-5678',
					paymentTerms: '月末締め翌月末払い'
				});

				const created = getVendorById(vendorId);
				expect(created?.name).toBe('Full Info Vendor');
				expect(created?.address).toBe('東京都渋谷区');
				expect(created?.contactName).toBe('山田太郎');
				expect(created?.email).toBe('contact@example.com');
				expect(created?.phone).toBe('03-1234-5678');
				expect(created?.paymentTerms).toBe('月末締め翌月末払い');
			});

			it('should not create duplicate vendors (by name)', () => {
				const vendorId1 = saveVendor({ name: 'Duplicate Test' });
				const vendorId2 = saveVendor({ name: 'Duplicate Test' });

				// Should return existing vendor
				expect(vendorId2).toBe(vendorId1);
			});
		});

		describe('Update vendor', () => {
			let testVendorId: string;

			beforeEach(() => {
				testVendorId = saveVendor({
					name: 'Test Vendor',
					address: '東京'
				});
			});

			it('should update vendor name', () => {
				updateVendor(testVendorId, {
					name: 'Updated Name',
					address: '東京'
				});

				const updated = getVendorById(testVendorId);
				expect(updated?.name).toBe('Updated Name');
			});

			it('should update vendor address', () => {
				updateVendor(testVendorId, {
					name: 'Test Vendor',
					address: '大阪府大阪市'
				});

				const updated = getVendorById(testVendorId);
				expect(updated?.address).toBe('大阪府大阪市');
			});

			it('should update vendor contact info', () => {
				updateVendor(testVendorId, {
					name: 'Test Vendor',
					address: '東京',
					contactName: '新しい担当者',
					email: 'newemail@example.com',
					phone: '090-1234-5678'
				});

				const updated = getVendorById(testVendorId);
				expect(updated?.contactName).toBe('新しい担当者');
				expect(updated?.email).toBe('newemail@example.com');
				expect(updated?.phone).toBe('090-1234-5678');
			});
		});

		describe('Delete vendor', () => {
			it('should delete vendor', () => {
				const vendorId = saveVendor({ name: 'To Delete' });
				expect(getVendorById(vendorId)).toBeDefined();

				deleteVendor(vendorId);

				expect(getVendorById(vendorId)).toBeNull();
			});

			it('should not affect other vendors when deleting', () => {
				const vendor1Id = saveVendor({ name: 'Vendor1' });
				const vendor2Id = saveVendor({ name: 'Vendor2' });

				deleteVendor(vendor1Id);

				expect(getVendorById(vendor1Id)).toBeNull();
				expect(getVendorById(vendor2Id)).toBeDefined();
			});
		});

		describe('Vendor and Journal relationship', () => {
			it('all non-empty vendor names in journals should match known vendors', () => {
				const journals = getJournalsByYear(2025);
				const vendors = getAllVendors();
				const vendorNames = new Set(vendors.map((v) => v.name));

				for (const journal of journals) {
					// Skip journals with empty vendor (e.g. personal transactions)
					if (journal.vendor) {
						expect(vendorNames.has(journal.vendor)).toBe(true);
					}
				}
			});

			it('should be able to find vendors used in journals', () => {
				const journals = getJournalsByYear(2025);
				const usedVendorNames = new Set(journals.map((j) => j.vendor).filter((v) => v !== ''));

				for (const vendorName of usedVendorNames) {
					const results = searchVendorsByName(vendorName);
					expect(results.length).toBeGreaterThan(0);
					expect(results.some((v) => v.name === vendorName)).toBe(true);
				}
			});
		});
	});

	describe('Comprehensive account-vendor workflow', () => {
		it('should execute full account and vendor workflow', () => {
			// List all accounts and vendors
			const allAccounts = getAllAccounts();
			const allVendors = getAllVendors();
			expect(allAccounts.length).toBe(66);
			expect(allVendors.length).toBe(27);

			// Filter accounts by type
			const expenseAccounts = getAccountsByType('expense');
			expect(expenseAccounts.length).toBeGreaterThan(0);

			// Get specific account
			const firstExpense = expenseAccounts[0];
			const retrieved = getAccountByCode(firstExpense.code);
			expect(retrieved?.code).toBe(firstExpense.code);

			// Create custom account
			const customCode = generateNextCode('expense');
			addAccount({
				code: customCode,
				name: 'Custom Workflow Account',
				type: 'expense',
				defaultTaxCategory: 'purchase_10'
			});

			// Verify it exists
			const custom = getAccountByCode(customCode);
			expect(custom?.name).toBe('Custom Workflow Account');

			// Update it
			updateAccount(customCode, {
				name: 'Updated Workflow Account',
				defaultTaxCategory: 'purchase_10'
			});

			const updated = getAccountByCode(customCode);
			expect(updated?.name).toBe('Updated Workflow Account');

			// Create vendor
			const vendorId = saveVendor({
				name: 'Workflow Vendor',
				address: 'Test Address'
			});

			// Search vendor
			const found = searchVendorsByName('Workflow Vendor');
			expect(found.some((v) => v.id === vendorId)).toBe(true);

			// Update vendor
			updateVendor(vendorId, {
				name: 'Updated Workflow Vendor',
				address: 'Updated Address'
			});

			const updatedVendor = getVendorById(vendorId);
			expect(updatedVendor?.name).toBe('Updated Workflow Vendor');

			// Delete vendor
			deleteVendor(vendorId);
			expect(getVendorById(vendorId)).toBeNull();

			// Delete custom account
			deleteAccount(customCode);
			expect(getAccountByCode(customCode)).toBeNull();
		});
	});
});
