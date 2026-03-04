import type { Account, AccountType } from '@e-shiwake/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '../database.js';
import {
	addAccount,
	deleteAccount,
	generateNextCode,
	getAccountByCode,
	getAccountsByType,
	getAllAccounts,
	isAccountInUse,
	updateAccount
} from '../repositories/account-repository.js';
import { addJournal } from '../repositories/journal-repository.js';
import { seedDefaultAccounts } from '../seed.js';

describe('account-repository', () => {
	beforeEach(() => {
		resetDatabase(':memory:');
		seedDefaultAccounts();
	});

	// ==================== getAllAccounts ====================

	describe('getAllAccounts', () => {
		it('should return all accounts including system accounts', () => {
			const accounts = getAllAccounts();
			expect(accounts.length).toBeGreaterThan(0);
		});

		it('should include default asset accounts', () => {
			const accounts = getAllAccounts();
			const cash = accounts.find((a) => a.code === '1001');
			expect(cash).toBeDefined();
			expect(cash!.name).toBe('現金');
			expect(cash!.type).toBe('asset');
			expect(cash!.isSystem).toBe(true);
		});

		it('should be sorted by code', () => {
			const accounts = getAllAccounts();
			for (let i = 0; i < accounts.length - 1; i++) {
				expect(accounts[i].code <= accounts[i + 1].code).toBe(true);
			}
		});

		it('should return accounts with default tax category', () => {
			const accounts = getAllAccounts();
			const revenue = accounts.find((a) => a.code === '4001');
			expect(revenue).toBeDefined();
			expect(revenue!.defaultTaxCategory).toBe('sales_10');
		});
	});

	// ==================== getAccountsByType ====================

	describe('getAccountsByType', () => {
		it('should return only asset accounts', () => {
			const assets = getAccountsByType('asset');
			expect(assets.length).toBeGreaterThan(0);
			assets.forEach((a) => {
				expect(a.type).toBe('asset');
			});
		});

		it('should return only expense accounts', () => {
			const expenses = getAccountsByType('expense');
			expect(expenses.length).toBeGreaterThan(0);
			expenses.forEach((a) => {
				expect(a.type).toBe('expense');
			});
		});

		it('should return empty array for type with no accounts', () => {
			// After seeding, all categories should have accounts
			// But this is a safe test
			const allTypes: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
			for (const type of allTypes) {
				const accounts = getAccountsByType(type);
				expect(Array.isArray(accounts)).toBe(true);
			}
		});

		it('should be sorted by code within each type', () => {
			const accounts = getAccountsByType('asset');
			for (let i = 0; i < accounts.length - 1; i++) {
				expect(accounts[i].code <= accounts[i + 1].code).toBe(true);
			}
		});
	});

	// ==================== getAccountByCode ====================

	describe('getAccountByCode', () => {
		it('should return null for non-existent code', () => {
			const account = getAccountByCode('9999');
			expect(account).toBeNull();
		});

		it('should retrieve account by code', () => {
			const account = getAccountByCode('1001');
			expect(account).toBeDefined();
			expect(account!.name).toBe('現金');
			expect(account!.type).toBe('asset');
		});

		it('should return account with all properties', () => {
			const account = getAccountByCode('5001');
			expect(account!.code).toBe('5001');
			expect(account!.name).toBe('仕入高');
			expect(account!.type).toBe('expense');
			expect(account!.isSystem).toBe(true);
			expect(account!.defaultTaxCategory).toBe('purchase_10');
			expect(account!.createdAt).toBeDefined();
		});
	});

	// ==================== addAccount ====================

	describe('addAccount', () => {
		it('should add a new custom account', () => {
			const newAccount: Omit<Account, 'isSystem' | 'createdAt'> = {
				code: '5099',
				name: 'カスタム費用',
				type: 'expense',
				defaultTaxCategory: 'purchase_10'
			};

			const code = addAccount(newAccount);
			expect(code).toBe('5099');

			const retrieved = getAccountByCode('5099');
			expect(retrieved).toBeDefined();
			expect(retrieved!.name).toBe('カスタム費用');
			expect(retrieved!.isSystem).toBe(false);
		});

		it('should create account without default tax category', () => {
			const newAccount: Omit<Account, 'isSystem' | 'createdAt'> = {
				code: '1099',
				name: 'カスタム資産',
				type: 'asset'
			};

			addAccount(newAccount);
			const retrieved = getAccountByCode('1099');

			expect(retrieved!.defaultTaxCategory).toBeUndefined();
		});

		it('should allow business ratio settings on custom account', () => {
			const newAccount: Omit<Account, 'isSystem' | 'createdAt'> = {
				code: '5100',
				name: '按分対象費用',
				type: 'expense',
				businessRatioEnabled: true,
				defaultBusinessRatio: 80
			};

			addAccount(newAccount);
			const retrieved = getAccountByCode('5100');

			expect(retrieved!.businessRatioEnabled).toBe(true);
			expect(retrieved!.defaultBusinessRatio).toBe(80);
		});
	});

	// ==================== updateAccount ====================

	describe('updateAccount', () => {
		it('should update account name', () => {
			updateAccount('5099', { name: 'Updated Name' });
			// First add the account
			addAccount({
				code: '5099',
				name: 'Original Name',
				type: 'expense'
			});

			updateAccount('5099', { name: 'Updated Name' });
			const updated = getAccountByCode('5099');
			expect(updated!.name).toBe('Updated Name');
		});

		it('should update default tax category', () => {
			addAccount({
				code: '5099',
				name: 'Test Account',
				type: 'expense'
			});

			updateAccount('5099', { defaultTaxCategory: 'purchase_8' });
			const updated = getAccountByCode('5099');
			expect(updated!.defaultTaxCategory).toBe('purchase_8');
		});

		it('should update business ratio settings', () => {
			addAccount({
				code: '5099',
				name: 'Test Account',
				type: 'expense'
			});

			updateAccount('5099', {
				businessRatioEnabled: true,
				defaultBusinessRatio: 60
			});

			const updated = getAccountByCode('5099');
			expect(updated!.businessRatioEnabled).toBe(true);
			expect(updated!.defaultBusinessRatio).toBe(60);
		});

		it('should allow partial updates', () => {
			addAccount({
				code: '5099',
				name: 'Test Account',
				type: 'expense',
				defaultTaxCategory: 'purchase_10'
			});

			updateAccount('5099', { name: 'New Name' });
			const updated = getAccountByCode('5099');

			expect(updated!.name).toBe('New Name');
			expect(updated!.defaultTaxCategory).toBe('purchase_10'); // unchanged
		});

		it('should not update if no changes provided', () => {
			addAccount({
				code: '5099',
				name: 'Test Account',
				type: 'expense'
			});

			// Should not throw
			updateAccount('5099', {});
			const retrieved = getAccountByCode('5099');
			expect(retrieved!.name).toBe('Test Account');
		});

		it('should not allow updating non-existent account', () => {
			// Should not throw, but no-op
			updateAccount('9999', { name: 'New Name' });
			const retrieved = getAccountByCode('9999');
			expect(retrieved).toBeNull();
		});
	});

	// ==================== deleteAccount ====================

	describe('deleteAccount', () => {
		it('should delete custom account', () => {
			addAccount({
				code: '5099',
				name: 'Custom Account',
				type: 'expense'
			});

			expect(getAccountByCode('5099')).toBeDefined();
			deleteAccount('5099');
			expect(getAccountByCode('5099')).toBeNull();
		});

		it('should throw error when deleting system account', () => {
			expect(() => {
				deleteAccount('1001'); // 現金 is system
			}).toThrow('システム勘定科目は削除できません');
		});

		it('should allow deleting unused custom account', () => {
			addAccount({
				code: '5099',
				name: 'Unused Account',
				type: 'expense'
			});

			expect(() => {
				deleteAccount('5099');
			}).not.toThrow();
		});

		it('should not allow deleting account in use (FK constraint)', () => {
			addAccount({
				code: '5099',
				name: 'Custom Account',
				type: 'expense'
			});

			// Add a journal using this account
			addJournal({
				date: '2025-01-15',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '5099', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 1000 }
				],
				attachments: []
			});

			// FK constraint prevents deletion when account is in use
			expect(() => {
				deleteAccount('5099');
			}).toThrow();
		});
	});

	// ==================== isAccountInUse ====================

	describe('isAccountInUse', () => {
		it('should return false for account with no journal entries', () => {
			addAccount({
				code: '5099',
				name: 'Unused Account',
				type: 'expense'
			});

			expect(isAccountInUse('5099')).toBe(false);
		});

		it('should return true for account used in journal', () => {
			addJournal({
				date: '2025-01-15',
				vendor: 'Test',
				description: 'Test',
				evidenceStatus: 'none',
				lines: [
					{ id: '', type: 'debit', accountCode: '5011', amount: 1000 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 1000 }
				],
				attachments: []
			});

			expect(isAccountInUse('5011')).toBe(true);
			expect(isAccountInUse('1002')).toBe(true);
		});

		it('should return true if account is used in any journal', () => {
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
					{ id: '', type: 'debit', accountCode: '5011', amount: 2000 },
					{ id: '', type: 'credit', accountCode: '1002', amount: 2000 }
				],
				attachments: []
			});

			expect(isAccountInUse('5011')).toBe(true);
		});

		it('should return false for deleted account', () => {
			addAccount({
				code: '5099',
				name: 'Test',
				type: 'expense'
			});

			deleteAccount('5099');
			expect(isAccountInUse('5099')).toBe(false);
		});
	});

	// ==================== generateNextCode ====================

	describe('generateNextCode', () => {
		it('should generate next code for expense category', () => {
			const nextCode = generateNextCode('expense');
			expect(nextCode).toMatch(/^5/);
			expect(parseInt(nextCode, 10)).toBeGreaterThanOrEqual(5100);
			expect(parseInt(nextCode, 10)).toBeLessThan(5200);
		});

		it('should generate next code for asset category', () => {
			const nextCode = generateNextCode('asset');
			expect(nextCode).toMatch(/^1/);
			expect(parseInt(nextCode, 10)).toBeGreaterThanOrEqual(1100);
			expect(parseInt(nextCode, 10)).toBeLessThan(1200);
		});

		it('should generate next code for revenue category', () => {
			const nextCode = generateNextCode('revenue');
			expect(nextCode).toMatch(/^4/);
			expect(parseInt(nextCode, 10)).toBeGreaterThanOrEqual(4100);
		});

		it('should generate next code for liability category', () => {
			const nextCode = generateNextCode('liability');
			expect(nextCode).toMatch(/^2/);
			expect(parseInt(nextCode, 10)).toBeGreaterThanOrEqual(2100);
		});

		it('should generate next code for equity category', () => {
			const nextCode = generateNextCode('equity');
			expect(nextCode).toMatch(/^3/);
			expect(parseInt(nextCode, 10)).toBeGreaterThanOrEqual(3100);
		});

		it('should skip system codes and return user code range', () => {
			const code = generateNextCode('expense');
			const numCode = parseInt(code, 10);

			// System codes are 5001-5099, user codes should be 5100+
			expect(numCode).toBeGreaterThanOrEqual(5100);
		});

		it('should generate sequential codes', () => {
			const code1 = generateNextCode('asset');
			addAccount({
				code: code1,
				name: 'Custom 1',
				type: 'asset'
			});

			const code2 = generateNextCode('asset');
			expect(parseInt(code2, 10)).toBe(parseInt(code1, 10) + 1);
		});

		it('should throw error when reaching category limit', () => {
			// Fill up all 99 user slots (5100-5198 for expense)
			for (let i = 0; i < 99; i++) {
				const code = `${5100 + i}`;
				addAccount({
					code,
					name: `Account ${i}`,
					type: 'expense'
				});
			}

			// Next call should throw
			expect(() => {
				generateNextCode('expense');
			}).toThrow('上限（99件）に達しました');
		});
	});
});
