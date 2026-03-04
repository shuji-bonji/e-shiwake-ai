import { describe, it, expect } from 'vitest';
import {
	generateTrialBalance,
	groupTrialBalance,
	formatAmount,
} from '../utils/trial-balance.js';
import type { JournalEntry, Account } from '../types/index.js';

// Test data
const testAccounts: Account[] = [
	{
		code: '1001',
		name: '現金',
		type: 'asset',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '1003',
		name: '普通預金',
		type: 'asset',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '4001',
		name: '売上高',
		type: 'revenue',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '5001',
		name: '仕入高',
		type: 'expense',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '5004',
		name: '水道光熱費',
		type: 'expense',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '5005',
		name: '旅費交通費',
		type: 'expense',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	},
	{
		code: '3002',
		name: '事業主貸',
		type: 'equity',
		isSystem: true,
		createdAt: '2025-01-01T00:00:00Z'
	}
];

describe('Trial Balance Utilities', () => {
	describe('generateTrialBalance', () => {
		it('should generate empty trial balance for no journals', () => {
			const result = generateTrialBalance([], testAccounts);

			expect(result.rows).toHaveLength(0);
			expect(result.totalDebit).toBe(0);
			expect(result.totalCredit).toBe(0);
			expect(result.isBalanced).toBe(true);
		});

		it('should calculate debit and credit totals for simple journal', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-15',
					description: '売上',
					vendor: 'クライアントA',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 110000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 110000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			expect(result.totalDebit).toBe(110000);
			expect(result.totalCredit).toBe(110000);
			expect(result.isBalanced).toBe(true);
		});

		it('should calculate correct balances for single account', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '現金出金',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5005',
							amount: 5000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1001',
							amount: 5000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			const expenseRow = result.rows.find((r) => r.accountCode === '5005');
			const cashRow = result.rows.find((r) => r.accountCode === '1001');

			expect(expenseRow).toBeDefined();
			expect(expenseRow!.debitTotal).toBe(5000);
			expect(expenseRow!.creditTotal).toBe(0);
			expect(expenseRow!.debitBalance).toBe(5000);
			expect(expenseRow!.creditBalance).toBe(0);

			expect(cashRow).toBeDefined();
			expect(cashRow!.debitTotal).toBe(0);
			expect(cashRow!.creditTotal).toBe(5000);
			expect(cashRow!.debitBalance).toBe(0);
			expect(cashRow!.creditBalance).toBe(5000);
		});

		it('should handle multiple transactions on same accounts', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '売上',
					vendor: 'クライアントA',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 110000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 110000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '仕入',
					vendor: 'サプライヤー',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '5001',
							amount: 50000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 50000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			const bankRow = result.rows.find((r) => r.accountCode === '1003');

			expect(bankRow).toBeDefined();
			expect(bankRow!.debitTotal).toBe(110000);
			expect(bankRow!.creditTotal).toBe(50000);
			expect(bankRow!.debitBalance).toBe(60000);
			expect(bankRow!.creditBalance).toBe(0);
		});

		it('should handle complex multi-line journal entries', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-20',
					description: '携帯電話代（家事按分）',
					vendor: 'NTTドコモ',
					evidenceStatus: 'digital',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5004',
							amount: 8000
						},
						{
							id: '1-2',
							type: 'debit',
							accountCode: '3002',
							amount: 2000
						},
						{
							id: '1-3',
							type: 'credit',
							accountCode: '1001',
							amount: 10000
						}
					],
					createdAt: '2025-01-20T00:00:00Z',
					updatedAt: '2025-01-20T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			expect(result.totalDebit).toBe(10000);
			expect(result.totalCredit).toBe(10000);
			expect(result.isBalanced).toBe(true);
		});

		it('should detect unbalanced journal entries', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-15',
					description: 'Unbalanced entry',
					vendor: 'Test',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 110000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			expect(result.totalDebit).toBe(100000);
			expect(result.totalCredit).toBe(110000);
			expect(result.isBalanced).toBe(false);
		});

		it('should sort rows by account code', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5005',
							amount: 1000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1001',
							amount: 1000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '1003',
							amount: 2000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '5001',
							amount: 2000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			const codes = result.rows.map((r) => r.accountCode);
			expect(codes).toEqual(['1001', '1003', '5001', '5005']);
		});

		it('should ignore unknown account codes', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '9999',
							amount: 1000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1001',
							amount: 1000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			const codes = result.rows.map((r) => r.accountCode);
			expect(codes).not.toContain('9999');
			expect(codes).toContain('1001');
		});

		it('should handle net balance calculation correctly', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '売上',
					vendor: 'クライアント',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 200000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 200000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const result = generateTrialBalance(journals, testAccounts);

			const assetRow = result.rows.find((r) => r.accountCode === '1003');
			const revenueRow = result.rows.find((r) => r.accountCode === '4001');

			// Asset: 200,000 debit, 0 credit => debit balance 200,000
			expect(assetRow!.debitBalance).toBe(200000);
			expect(assetRow!.creditBalance).toBe(0);

			// Revenue: 0 debit, 200,000 credit => credit balance 200,000
			expect(revenueRow!.debitBalance).toBe(0);
			expect(revenueRow!.creditBalance).toBe(200000);
		});
	});

	describe('groupTrialBalance', () => {
		it('should group trial balance rows by account type', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '5001',
							amount: 50000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1001',
							amount: 50000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const trialBalance = generateTrialBalance(journals, testAccounts);
			const grouped = groupTrialBalance(trialBalance);

			expect(grouped.groups).toHaveLength(3); // asset, revenue, expense

			const assetGroup = grouped.groups.find((g) => g.type === 'asset');
			expect(assetGroup).toBeDefined();
			expect(assetGroup!.rows).toHaveLength(2);

			const revenueGroup = grouped.groups.find((g) => g.type === 'revenue');
			expect(revenueGroup).toBeDefined();
			expect(revenueGroup!.rows).toHaveLength(1);

			const expenseGroup = grouped.groups.find((g) => g.type === 'expense');
			expect(expenseGroup).toBeDefined();
			expect(expenseGroup!.rows).toHaveLength(1);
		});

		it('should calculate group subtotals correctly', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '売上',
					vendor: 'A',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const trialBalance = generateTrialBalance(journals, testAccounts);
			const grouped = groupTrialBalance(trialBalance);

			const assetGroup = grouped.groups.find((g) => g.type === 'asset');

			expect(assetGroup!.subtotalDebit).toBe(100000);
			expect(assetGroup!.subtotalCredit).toBe(0);
			expect(assetGroup!.subtotalDebitBalance).toBe(100000);
			expect(assetGroup!.subtotalCreditBalance).toBe(0);
		});

		it('should maintain group order (asset, liability, equity, revenue, expense)', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 50000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 50000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '5001',
							amount: 25000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 25000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const trialBalance = generateTrialBalance(journals, testAccounts);
			const grouped = groupTrialBalance(trialBalance);

			const types = grouped.groups.map((g) => g.type);
			expect(types).toEqual(expect.arrayContaining(['asset', 'revenue', 'expense']));
		});

		it('should preserve overall totals and balance status', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const trialBalance = generateTrialBalance(journals, testAccounts);
			const grouped = groupTrialBalance(trialBalance);

			expect(grouped.totalDebit).toBe(trialBalance.totalDebit);
			expect(grouped.totalCredit).toBe(trialBalance.totalCredit);
			expect(grouped.isBalanced).toBe(trialBalance.isBalanced);
		});

		it('should exclude empty groups', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const trialBalance = generateTrialBalance(journals, testAccounts);
			const grouped = groupTrialBalance(trialBalance);

			// Should only have asset, revenue (no liability or equity)
			const types = grouped.groups.map((g) => g.type);
			expect(types).not.toContain('liability');
			expect(types).not.toContain('equity');
		});
	});

	describe('formatAmount', () => {
		it('should format positive amounts with comma separator', () => {
			expect(formatAmount(1000000)).toBe('1,000,000');
			expect(formatAmount(100)).toBe('100');
			expect(formatAmount(10000)).toBe('10,000');
		});

		it('should return empty string for zero', () => {
			expect(formatAmount(0)).toBe('');
		});

		it('should return empty string for null', () => {
			expect(formatAmount(null)).toBe('');
		});

		it('should handle large amounts', () => {
			expect(formatAmount(1234567890)).toBe('1,234,567,890');
		});

		it('should handle single digit', () => {
			expect(formatAmount(5)).toBe('5');
		});
	});
});
