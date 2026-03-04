import { describe, it, expect } from 'vitest';
import { generateProfitLoss, formatPLAmount, profitLossToCsv } from '../utils/profit-loss.js';
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
		code: '4002',
		name: '受託手数料',
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
	}
];

describe('Profit Loss Utilities', () => {
	describe('generateProfitLoss', () => {
		it('should generate empty P/L for no journals', () => {
			const result = generateProfitLoss([], testAccounts, 2025);

			expect(result.fiscalYear).toBe(2025);
			expect(result.salesRevenue).toHaveLength(0);
			expect(result.otherRevenue).toHaveLength(0);
			expect(result.costOfSales).toHaveLength(0);
			expect(result.operatingExpenses).toHaveLength(0);
			expect(result.totalRevenue).toBe(0);
			expect(result.totalExpenses).toBe(0);
			expect(result.grossProfit).toBe(0);
			expect(result.operatingIncome).toBe(0);
			expect(result.netIncome).toBe(0);
		});

		it('should categorize revenue items correctly', () => {
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
							amount: 1100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.salesRevenue).toHaveLength(1);
			expect(result.salesRevenue[0].accountCode).toBe('4001');
			expect(result.salesRevenue[0].amount).toBe(1100000);
			expect(result.totalRevenue).toBe(1100000);
		});

		it('should categorize expense items correctly', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-15',
					description: '旅費交通費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5005',
							amount: 50000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1001',
							amount: 50000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.operatingExpenses).toHaveLength(1);
			expect(result.operatingExpenses[0].accountCode).toBe('5005');
			expect(result.operatingExpenses[0].amount).toBe(50000);
			expect(result.totalExpenses).toBe(50000);
		});

		it('should separate cost of sales from operating expenses', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '仕入',
					vendor: 'サプライヤーA',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5001',
							amount: 500000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1003',
							amount: 500000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '水道光熱費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '5004',
							amount: 30000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1001',
							amount: 30000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.costOfSales).toHaveLength(1);
			expect(result.costOfSales[0].accountCode).toBe('5001');
			expect(result.costOfSales[0].amount).toBe(500000);

			expect(result.operatingExpenses).toHaveLength(1);
			expect(result.operatingExpenses[0].accountCode).toBe('5004');
			expect(result.operatingExpenses[0].amount).toBe(30000);

			expect(result.totalExpenses).toBe(530000);
		});

		it('should calculate gross profit correctly (sales - cost of sales)', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
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
							amount: 400000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 400000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.grossProfit).toBe(600000); // 1,000,000 - 400,000
		});

		it('should calculate operating income correctly (gross profit - operating expenses)', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
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
							amount: 400000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 400000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				},
				{
					id: '3',
					date: '2025-01-20',
					description: '旅費交通費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '3-1',
							type: 'debit',
							accountCode: '5005',
							amount: 100000
						},
						{
							id: '3-2',
							type: 'credit',
							accountCode: '1001',
							amount: 100000
						}
					],
					createdAt: '2025-01-20T00:00:00Z',
					updatedAt: '2025-01-20T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.operatingIncome).toBe(500000); // 1,000,000 - 400,000 - 100,000
		});

		it('should calculate net income with other revenue', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
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
							amount: 400000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 400000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				},
				{
					id: '3',
					date: '2025-01-20',
					description: '手数料収入',
					vendor: 'クライアントB',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '3-1',
							type: 'debit',
							accountCode: '1003',
							amount: 100000
						},
						{
							id: '3-2',
							type: 'credit',
							accountCode: '4002',
							amount: 100000
						}
					],
					createdAt: '2025-01-20T00:00:00Z',
					updatedAt: '2025-01-20T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			expect(result.otherRevenue).toHaveLength(1);
			expect(result.otherRevenue[0].accountCode).toBe('4002');
			expect(result.otherRevenue[0].amount).toBe(100000);

			// Net income = Operating income + Other revenue
			// = (1,000,000 - 400,000) + 100,000 = 700,000
			expect(result.netIncome).toBe(700000);
		});

		it('should handle credit side revenue deductions', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '売上返品',
					vendor: 'クライアント',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '4001',
							amount: 100000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 100000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			// Net revenue = 1,000,000 - 100,000 = 900,000
			expect(result.totalRevenue).toBe(900000);
		});

		it('should handle credit side expense deductions', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '旅費交通費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '1-1',
							type: 'debit',
							accountCode: '5005',
							amount: 100000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '1001',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '旅費交通費の还价',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '1001',
							amount: 20000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '5005',
							amount: 20000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			// Net expense = 100,000 - 20,000 = 80,000
			expect(result.totalExpenses).toBe(80000);
		});

		it('should ignore zero-amount accounts', () => {
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
					description: '返品',
					vendor: 'クライアント',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '4001',
							amount: 100000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 100000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			// Balance is zero, should not be included
			expect(result.salesRevenue).toHaveLength(0);
		});

		it('should sort revenue and expense by account code', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '手数料',
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
							accountCode: '4002',
							amount: 100000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				},
				{
					id: '2',
					date: '2025-01-15',
					description: '売上',
					vendor: 'B',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '2-1',
							type: 'debit',
							accountCode: '1003',
							amount: 500000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '4001',
							amount: 500000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				},
				{
					id: '3',
					date: '2025-01-20',
					description: '旅費交通費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '3-1',
							type: 'debit',
							accountCode: '5005',
							amount: 30000
						},
						{
							id: '3-2',
							type: 'credit',
							accountCode: '1001',
							amount: 30000
						}
					],
					createdAt: '2025-01-20T00:00:00Z',
					updatedAt: '2025-01-20T00:00:00Z'
				},
				{
					id: '4',
					date: '2025-01-25',
					description: '水道光熱費',
					vendor: '',
					evidenceStatus: 'none',
					attachments: [],
					lines: [
						{
							id: '4-1',
							type: 'debit',
							accountCode: '5004',
							amount: 20000
						},
						{
							id: '4-2',
							type: 'credit',
							accountCode: '1001',
							amount: 20000
						}
					],
					createdAt: '2025-01-25T00:00:00Z',
					updatedAt: '2025-01-25T00:00:00Z'
				}
			];

			const result = generateProfitLoss(journals, testAccounts, 2025);

			// 4001は売上高（salesRevenue）、4002は営業外収益（otherRevenue）に分類
			expect(result.salesRevenue.map((r) => r.accountCode)).toEqual(['4001']);
			expect(result.otherRevenue.map((r) => r.accountCode)).toEqual(['4002']);

			// 販管費はコード順（5004 < 5005）にソートされる
			const expenseCodes = result.operatingExpenses.map((r) => r.accountCode);
			expect(expenseCodes).toEqual(['5004', '5005']);
		});

		it('should set fiscal year correctly', () => {
			const journals: JournalEntry[] = [
				{
					id: '1',
					date: '2025-01-10',
					description: '取引',
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

			const result = generateProfitLoss(journals, testAccounts, 2024);

			expect(result.fiscalYear).toBe(2024);
		});
	});

	describe('formatPLAmount', () => {
		it('should format positive amounts with comma separator', () => {
			expect(formatPLAmount(1000000)).toBe('1,000,000');
			expect(formatPLAmount(100000)).toBe('100,000');
			expect(formatPLAmount(500)).toBe('500');
		});

		it('should format zero as "0"', () => {
			expect(formatPLAmount(0)).toBe('0');
		});

		it('should format negative amounts with triangle symbol', () => {
			expect(formatPLAmount(-100000)).toBe('△100,000');
			expect(formatPLAmount(-1000000)).toBe('△1,000,000');
		});

		it('should handle single digit', () => {
			expect(formatPLAmount(5)).toBe('5');
			expect(formatPLAmount(-5)).toBe('△5');
		});

		it('should handle large amounts', () => {
			expect(formatPLAmount(1234567890)).toBe('1,234,567,890');
			expect(formatPLAmount(-1234567890)).toBe('△1,234,567,890');
		});
	});

	describe('profitLossToCsv', () => {
		it('should generate CSV with proper structure', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const pl = generateProfitLoss(journals, testAccounts, 2025);
			const csv = profitLossToCsv(pl);

			expect(csv).toContain('損益計算書,2025年度');
			expect(csv).toContain('【売上高】');
			expect(csv).toContain('4001,売上高,1000000');
		});

		it('should include all sections', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
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
							amount: 400000
						},
						{
							id: '2-2',
							type: 'credit',
							accountCode: '1003',
							amount: 400000
						}
					],
					createdAt: '2025-01-15T00:00:00Z',
					updatedAt: '2025-01-15T00:00:00Z'
				}
			];

			const pl = generateProfitLoss(journals, testAccounts, 2025);
			const csv = profitLossToCsv(pl);

			expect(csv).toContain('【売上高】');
			expect(csv).toContain('【売上原価】');
			expect(csv).toContain(',売上総利益,');
			expect(csv).toContain('【販売費及び一般管理費】');
			expect(csv).toContain(',営業利益,');
			expect(csv).toContain('【営業外収益】');
			expect(csv).toContain(',当期純利益,');
		});

		it('should include proper totals', () => {
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
							amount: 1000000
						},
						{
							id: '1-2',
							type: 'credit',
							accountCode: '4001',
							amount: 1000000
						}
					],
					createdAt: '2025-01-10T00:00:00Z',
					updatedAt: '2025-01-10T00:00:00Z'
				}
			];

			const pl = generateProfitLoss(journals, testAccounts, 2025);
			const csv = profitLossToCsv(pl);

			expect(csv).toContain(',売上高 合計,1000000');
			expect(csv).toContain(',売上原価 合計,0');
		});
	});
});
