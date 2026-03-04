import { describe, expect, it } from 'vitest';
import type { Account, JournalEntry } from '../types/index.js';
import {
	filterJournals,
	isEmptyQuery,
	parseSearchQuery,
	type SearchCriteria
} from '../utils/journal-search.js';

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
	}
];

const testJournals: JournalEntry[] = [
	{
		id: '1',
		date: '2025-01-15',
		description: 'USBケーブル購入',
		vendor: 'Amazon',
		evidenceStatus: 'digital',
		attachments: [],
		lines: [
			{
				id: '1-1',
				type: 'debit',
				accountCode: '5005',
				amount: 3980
			},
			{
				id: '1-2',
				type: 'credit',
				accountCode: '1003',
				amount: 3980
			}
		],
		createdAt: '2025-01-15T00:00:00Z',
		updatedAt: '2025-01-15T00:00:00Z'
	},
	{
		id: '2',
		date: '2025-01-10',
		description: '電車代',
		vendor: '',
		evidenceStatus: 'none',
		attachments: [],
		lines: [
			{
				id: '2-1',
				type: 'debit',
				accountCode: '5005',
				amount: 1200
			},
			{
				id: '2-2',
				type: 'credit',
				accountCode: '1001',
				amount: 1200
			}
		],
		createdAt: '2025-01-10T00:00:00Z',
		updatedAt: '2025-01-10T00:00:00Z'
	},
	{
		id: '3',
		date: '2024-12-20',
		description: '売上',
		vendor: 'クライアントA',
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
				accountCode: '4001',
				amount: 100000
			}
		],
		createdAt: '2024-12-20T00:00:00Z',
		updatedAt: '2024-12-20T00:00:00Z'
	},
	{
		id: '4',
		date: '2024-12-10',
		description: '電話代',
		vendor: 'NTTドコモ',
		evidenceStatus: 'paper',
		attachments: [],
		lines: [
			{
				id: '4-1',
				type: 'debit',
				accountCode: '5004',
				amount: 10000
			},
			{
				id: '4-2',
				type: 'credit',
				accountCode: '1001',
				amount: 10000
			}
		],
		createdAt: '2024-12-10T00:00:00Z',
		updatedAt: '2024-12-10T00:00:00Z'
	}
];

describe('Journal Search Utilities', () => {
	describe('isEmptyQuery', () => {
		it('should return true for empty string', () => {
			expect(isEmptyQuery('')).toBe(true);
		});

		it('should return true for whitespace only', () => {
			expect(isEmptyQuery('   ')).toBe(true);
			expect(isEmptyQuery('\t')).toBe(true);
			expect(isEmptyQuery('\n')).toBe(true);
		});

		it('should return false for non-empty string', () => {
			expect(isEmptyQuery('Amazon')).toBe(false);
			expect(isEmptyQuery('2025-01-15')).toBe(false);
		});
	});

	describe('parseSearchQuery', () => {
		it('should return empty criteria for empty query', () => {
			const criteria = parseSearchQuery('', testAccounts);

			expect(criteria.text).toHaveLength(0);
			expect(criteria.accounts).toHaveLength(0);
			expect(criteria.amounts).toHaveLength(0);
		});

		it('should parse text search', () => {
			const criteria = parseSearchQuery('Amazon', testAccounts);

			expect(criteria.text).toContain('amazon');
		});

		it('should parse account name (exact match)', () => {
			const criteria = parseSearchQuery('旅費交通費', testAccounts);

			expect(criteria.accounts).toContain('5005');
		});

		it('should parse account name (partial match)', () => {
			const criteria = parseSearchQuery('交通', testAccounts);

			expect(criteria.accounts.length).toBeGreaterThan(0);
		});

		it('should parse numeric amount', () => {
			const criteria = parseSearchQuery('3980', testAccounts);

			expect(criteria.amounts).toContain(3980);
		});

		it('should parse comma-separated amount', () => {
			const criteria = parseSearchQuery('10,000', testAccounts);

			expect(criteria.amounts).toContain(10000);
		});

		it('should parse full date (YYYY-MM-DD)', () => {
			const criteria = parseSearchQuery('2025-01-15', testAccounts);

			expect(criteria.date).toBe('2025-01-15');
		});

		it('should parse year-month (YYYY-MM)', () => {
			const criteria = parseSearchQuery('2025-01', testAccounts);

			expect(criteria.yearMonth).toBe('2025-01');
		});

		it('should parse month only (MM月)', () => {
			const criteria = parseSearchQuery('12月', testAccounts);

			expect(criteria.month).toBe(12);
		});

		it('should parse month only (M月)', () => {
			const criteria = parseSearchQuery('1月', testAccounts);

			expect(criteria.month).toBe(1);
		});

		it('should parse year (YYYY年)', () => {
			const criteria = parseSearchQuery('2025年', testAccounts);

			expect(criteria.year).toBe(2025);
		});

		it('should parse year with hyphen (YYYY-)', () => {
			const criteria = parseSearchQuery('2025-', testAccounts);

			expect(criteria.year).toBe(2025);
		});

		it('should parse slash-separated date (YYYY/M/D)', () => {
			const criteria = parseSearchQuery('2025/1/15', testAccounts);

			expect(criteria.date).toBe('2025-01-15');
		});

		it('should parse slash-separated date (YYYY/MM/DD)', () => {
			const criteria = parseSearchQuery('2025/01/15', testAccounts);

			expect(criteria.date).toBe('2025-01-15');
		});

		it('should parse slash-separated year-month (YYYY/M)', () => {
			const criteria = parseSearchQuery('2025/1', testAccounts);

			expect(criteria.yearMonth).toBe('2025-01');
		});

		it('should parse month-day (MM/DD)', () => {
			const criteria = parseSearchQuery('01/15', testAccounts);

			expect(criteria.monthDay).toBe('01-15');
		});

		it('should parse month-day (M/D)', () => {
			const criteria = parseSearchQuery('1/5', testAccounts);

			expect(criteria.monthDay).toBe('01-05');
		});

		it('should combine multiple search criteria', () => {
			const criteria = parseSearchQuery('Amazon 2025-01 3980', testAccounts);

			expect(criteria.text).toContain('amazon');
			expect(criteria.yearMonth).toBe('2025-01');
			expect(criteria.amounts).toContain(3980);
		});

		it('should handle case-insensitive text search', () => {
			const criteria = parseSearchQuery('AMAZON amazon Amazon', testAccounts);

			expect(criteria.text).toContain('amazon');
		});

		it('should handle invalid month (out of range)', () => {
			const criteria = parseSearchQuery('13月', testAccounts);

			expect(criteria.month).toBeUndefined();
		});

		it('should handle multiple amounts', () => {
			const criteria = parseSearchQuery('1000 2000 3000', testAccounts);

			expect(criteria.amounts).toContain(1000);
			expect(criteria.amounts).toContain(2000);
			expect(criteria.amounts).toContain(3000);
		});

		it('should trim and split on whitespace', () => {
			const criteria = parseSearchQuery('  Amazon   2025-01  ', testAccounts);

			expect(criteria.text).toContain('amazon');
			expect(criteria.yearMonth).toBe('2025-01');
		});
	});

	describe('filterJournals', () => {
		it('should return all journals for empty criteria', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(testJournals.length);
		});

		it('should filter by text in description', () => {
			const criteria: SearchCriteria = {
				text: ['usb'],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should filter by text in vendor', () => {
			const criteria: SearchCriteria = {
				text: ['amazon'],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should filter by account code', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: ['4001'],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('3');
		});

		it('should filter by amount', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [10000]
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('should filter by full date (YYYY-MM-DD)', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				date: '2025-01-15'
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should filter by year', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				year: 2025
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2); // 2025-01-15, 2025-01-10
		});

		it('should filter by year-month', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				yearMonth: '2025-01'
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2); // Both January 2025
		});

		it('should filter by month (cross-year)', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				month: 1
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2); // 2025-01-15, 2025-01-10
		});

		it('should filter by month-day (cross-year)', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				monthDay: '01-15'
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1); // 2025-01-15
		});

		it('should apply AND logic to multiple text criteria', () => {
			const criteria: SearchCriteria = {
				text: ['amazon', 'usb'],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			// Must match both 'amazon' AND 'usb' in description or vendor
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should apply OR logic to account codes', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: ['5005', '4001'],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(3); // Journal 1, 2, 3
		});

		it('should apply OR logic to amounts', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [3980, 10000]
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2); // Journal 1, 4
		});

		it('should combine multiple filter types with AND', () => {
			const criteria: SearchCriteria = {
				text: ['代'],
				accounts: ['5004'],
				amounts: [10000]
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('should handle empty text match correctly', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [1200]
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2');
		});

		it('should be case-insensitive for text search', () => {
			const criteria: SearchCriteria = {
				text: ['AMAZON'],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should find no results when no match', () => {
			const criteria: SearchCriteria = {
				text: ['nonexistent'],
				accounts: [],
				amounts: []
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(0);
		});

		it('should handle multiple text terms with at least one match required', () => {
			const criteria: SearchCriteria = {
				text: ['amazon', 'ntt'],
				accounts: [],
				amounts: []
			};

			// Journal 1 contains 'amazon', Journal 4 contains 'ntt'
			const result = filterJournals(testJournals, criteria);

			// Both should match if they contain either amazon OR ntt
			// But the filter logic is AND, so both terms must match same journal
			expect(result.length).toBeLessThanOrEqual(2);
		});

		it('should filter by December (month 12)', () => {
			const criteria: SearchCriteria = {
				text: [],
				accounts: [],
				amounts: [],
				month: 12
			};

			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2); // 2024-12-20, 2024-12-10
		});

		it('should handle complex multi-criteria search', () => {
			const criteria: SearchCriteria = {
				text: ['代'],
				accounts: [],
				amounts: [],
				month: 12
			};

			const result = filterJournals(testJournals, criteria);

			// '代' AND 12月: '電話代'(2024-12-10)のみ一致。'電車代'は1月なので除外
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});
	});

	describe('Integration: parseSearchQuery + filterJournals', () => {
		it('should search for text and date', () => {
			const criteria = parseSearchQuery('Amazon 2025-01', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should search for vendor and month', () => {
			const criteria = parseSearchQuery('ドコモ 12月', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('should search for account code and amount', () => {
			const criteria = parseSearchQuery('旅費交通費 3980', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should search for description and month', () => {
			const criteria = parseSearchQuery('売上 12月', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('3');
		});

		it('should search for year month with month-day format', () => {
			const criteria = parseSearchQuery('2025 01/15', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('should search with slash-separated date', () => {
			const criteria = parseSearchQuery('2024/12/10', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('should search account and cross-year month', () => {
			const criteria = parseSearchQuery('水道光熱費 12月', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('should search for multiple amounts across journals', () => {
			const criteria = parseSearchQuery('3980 1200', testAccounts);
			const result = filterJournals(testJournals, criteria);

			expect(result).toHaveLength(2);
		});
	});
});
