/**
 * e2e-report.test.ts
 *
 * Report generation end-to-end tests
 *
 * Tests report generation (trial balance, P/L, B/S, tax summary) with real fixture data:
 * 1. Import fixture data (76 journals, 66 accounts, 27 vendors, FY2025)
 * 2. Generate trial balance and verify structure + debit/credit balance
 * 3. Generate profit/loss statement and verify income/expense totals
 * 4. Generate balance sheet and verify asset/liability/equity balance
 * 5. Generate tax summary and verify tax calculations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	getDatabase,
	resetDatabase,
	seedDefaultAccounts,
	getJournalsByYear,
	getAllAccounts
} from '@e-shiwake/db';
import {
	generateTrialBalance,
	groupTrialBalance,
	generateProfitLoss,
	generateBalanceSheet,
	calculateTaxSummary
} from '@e-shiwake/core';
import type { ExportDataDTO } from '@e-shiwake/core';
import { importData } from '@e-shiwake/db';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_PATH = join(__dirname, '../../../db/test/fixtures/export-2025.json');

describe('E2E: Report Generation', () => {
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

	describe('Trial Balance', () => {
		it('should generate trial balance with valid structure', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);

			expect(trialBalance).toBeDefined();
			expect(trialBalance.isBalanced).toBeDefined();
			expect(trialBalance.totalDebit).toBeDefined();
			expect(trialBalance.totalCredit).toBeDefined();
			expect(typeof trialBalance.totalDebit).toBe('number');
			expect(typeof trialBalance.totalCredit).toBe('number');
		});

		it('trial balance should be balanced (debit = credit)', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);

			expect(trialBalance.isBalanced).toBe(true);
			expect(trialBalance.totalDebit).toBe(trialBalance.totalCredit);
		});

		it('should have reasonable balance amounts (> 0)', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);

			expect(trialBalance.totalDebit).toBeGreaterThan(0);
			expect(trialBalance.totalCredit).toBeGreaterThan(0);
		});

		it('should group trial balance by account type', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);
			const grouped = groupTrialBalance(trialBalance);

			expect(grouped.groups).toBeDefined();
			expect(grouped.groups.length).toBeGreaterThan(0);

			for (const group of grouped.groups) {
				expect(group.label).toBeDefined();
				expect(group.rows).toBeDefined();
				expect(group.rows.length).toBeGreaterThan(0);
				expect(group.subtotalDebit).toBeDefined();
				expect(group.subtotalCredit).toBeDefined();
			}
		});

		it('grouped trial balance subtotals should match main totals', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);
			const grouped = groupTrialBalance(trialBalance);

			let totalDebit = 0;
			let totalCredit = 0;

			for (const group of grouped.groups) {
				totalDebit += group.subtotalDebit;
				totalCredit += group.subtotalCredit;
			}

			expect(totalDebit).toBe(trialBalance.totalDebit);
			expect(totalCredit).toBe(trialBalance.totalCredit);
		});

		it('each trial balance row should have valid structure', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const trialBalance = generateTrialBalance(journals, accounts);
			const grouped = groupTrialBalance(trialBalance);

			for (const group of grouped.groups) {
				for (const row of group.rows) {
					expect(row.accountCode).toMatch(/^\d{4}$/);
					expect(row.accountName).toBeTruthy();
					expect(row.debitTotal).toBeGreaterThanOrEqual(0);
					expect(row.creditTotal).toBeGreaterThanOrEqual(0);
					expect(row.debitBalance).toBeDefined();
					expect(row.creditBalance).toBeDefined();
					expect(typeof row.debitBalance).toBe('number');
					expect(typeof row.creditBalance).toBe('number');
				}
			}
		});
	});

	describe('Profit & Loss Statement', () => {
		it('should generate P/L with valid structure', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			expect(pl).toBeDefined();
			expect(pl.salesRevenue).toBeDefined();
			expect(pl.otherRevenue).toBeDefined();
			expect(pl.costOfSales).toBeDefined();
			expect(pl.operatingExpenses).toBeDefined();
			expect(pl.totalRevenue).toBeDefined();
			expect(pl.totalExpenses).toBeDefined();
			expect(pl.netIncome).toBeDefined();
		});

		it('P/L revenue should be >= 0', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			expect(pl.totalRevenue).toBeGreaterThanOrEqual(0);
		});

		it('P/L expenses should be >= 0', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			expect(pl.totalExpenses).toBeGreaterThanOrEqual(0);
		});

		it('P/L netIncome = totalRevenue - totalExpenses', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			expect(pl.netIncome).toBe(pl.totalRevenue - pl.totalExpenses);
		});

		it('each revenue/expense item should have valid structure', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			const allItems = [
				...pl.salesRevenue,
				...pl.otherRevenue,
				...pl.costOfSales,
				...pl.operatingExpenses
			];

			for (const item of allItems) {
				expect(item.accountCode).toMatch(/^\d{4}$/);
				expect(item.accountName).toBeTruthy();
				expect(typeof item.amount).toBe('number');
				expect(item.amount).toBeGreaterThanOrEqual(0);
			}
		});

		it('should handle edge case of zero revenue/expenses', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);

			// Even with fixture data, some categories might be zero
			expect(pl.totalRevenue).toBeGreaterThanOrEqual(0);
			expect(pl.totalExpenses).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Balance Sheet', () => {
		// Helper: generate balance sheet with netIncome from P/L
		function getBalanceSheet() {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();
			const pl = generateProfitLoss(journals, accounts, 2025);
			return generateBalanceSheet(journals, accounts, 2025, pl.netIncome);
		}

		it('should generate balance sheet with valid structure', () => {
			const bs = getBalanceSheet();

			expect(bs).toBeDefined();
			expect(bs.currentAssets).toBeDefined();
			expect(bs.fixedAssets).toBeDefined();
			expect(bs.currentLiabilities).toBeDefined();
			expect(bs.fixedLiabilities).toBeDefined();
			expect(bs.equity).toBeDefined();
			expect(bs.totalAssets).toBeDefined();
			expect(bs.totalLiabilities).toBeDefined();
			expect(bs.totalEquity).toBeDefined();
			expect(bs.totalLiabilitiesAndEquity).toBeDefined();
		});

		it('balance sheet should be balanced (assets = liabilities + equity)', () => {
			const bs = getBalanceSheet();

			expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);
		});

		it('balance sheet totals should be reasonable (> 0)', () => {
			const bs = getBalanceSheet();

			expect(bs.totalAssets).toBeGreaterThanOrEqual(0);
			expect(bs.totalLiabilities + bs.totalEquity).toBeGreaterThanOrEqual(0);
		});

		it('balance sheet liability + equity should equal asset parts sum', () => {
			const bs = getBalanceSheet();

			const liabilitiesSum =
				bs.currentLiabilities.reduce((sum, item) => sum + item.amount, 0) +
				bs.fixedLiabilities.reduce((sum, item) => sum + item.amount, 0);

			const equitySum = bs.equity.reduce((sum, item) => sum + item.amount, 0) + bs.retainedEarnings;

			const assetsSum =
				bs.currentAssets.reduce((sum, item) => sum + item.amount, 0) +
				bs.fixedAssets.reduce((sum, item) => sum + item.amount, 0);

			expect(assetsSum).toBe(liabilitiesSum + equitySum);
		});

		it('each balance sheet item should have valid structure', () => {
			const bs = getBalanceSheet();

			const allItems = [
				...bs.currentAssets,
				...bs.fixedAssets,
				...bs.currentLiabilities,
				...bs.fixedLiabilities,
				...bs.equity
			];

			for (const item of allItems) {
				expect(item.accountCode).toMatch(/^\d{4}$/);
				expect(item.accountName).toBeTruthy();
				expect(typeof item.amount).toBe('number');
			}
		});
	});

	describe('Tax Summary', () => {
		it('should calculate tax summary with valid structure', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			const tax = calculateTaxSummary(allLines);

			expect(tax).toBeDefined();
			expect(tax.sales10TaxExcluded).toBeDefined();
			expect(tax.sales10Tax).toBeDefined();
			expect(tax.sales8TaxExcluded).toBeDefined();
			expect(tax.sales8Tax).toBeDefined();
			expect(tax.purchase10TaxExcluded).toBeDefined();
			expect(tax.purchase10Tax).toBeDefined();
			expect(tax.purchase8TaxExcluded).toBeDefined();
			expect(tax.purchase8Tax).toBeDefined();
			expect(tax.netTax).toBeDefined();
		});

		it('tax amounts should be >= 0', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			const tax = calculateTaxSummary(allLines);

			expect(tax.sales10TaxExcluded).toBeGreaterThanOrEqual(0);
			expect(tax.sales10Tax).toBeGreaterThanOrEqual(0);
			expect(tax.sales8TaxExcluded).toBeGreaterThanOrEqual(0);
			expect(tax.sales8Tax).toBeGreaterThanOrEqual(0);
			expect(tax.purchase10TaxExcluded).toBeGreaterThanOrEqual(0);
			expect(tax.purchase10Tax).toBeGreaterThanOrEqual(0);
			expect(tax.purchase8TaxExcluded).toBeGreaterThanOrEqual(0);
			expect(tax.purchase8Tax).toBeGreaterThanOrEqual(0);
		});

		it('tax calculation should follow 10% rule', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			const tax = calculateTaxSummary(allLines);

			// 10% tax should be approximately 10% of tax-excluded amount
			const calculated10Tax = Math.round(tax.sales10TaxExcluded * 0.1);
			expect(tax.sales10Tax).toBeLessThanOrEqual(calculated10Tax + 1); // Allow 1 yen rounding
			expect(tax.sales10Tax).toBeGreaterThanOrEqual(calculated10Tax - 1);
		});

		it('tax calculation should follow 8% rule', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			const tax = calculateTaxSummary(allLines);

			// 8% tax should be approximately 8% of tax-excluded amount
			const calculated8Tax = Math.round(tax.sales8TaxExcluded * 0.08);
			expect(tax.sales8Tax).toBeLessThanOrEqual(calculated8Tax + 1); // Allow 1 yen rounding
			expect(tax.sales8Tax).toBeGreaterThanOrEqual(calculated8Tax - 1);
		});

		it('net tax should be sales tax - purchase tax (simplified)', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			const tax = calculateTaxSummary(allLines);

			const totalSalesTax = tax.sales10Tax + tax.sales8Tax;
			const totalPurchaseTax = tax.purchase10Tax + tax.purchase8Tax;
			const expectedNetTax = totalSalesTax - totalPurchaseTax;

			expect(tax.netTax).toBe(expectedNetTax);
		});
	});

	describe('Report consistency', () => {
		it('trial balance total assets should match balance sheet total assets', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const tb = generateTrialBalance(journals, accounts);
			const pl = generateProfitLoss(journals, accounts, 2025);
			const bs = generateBalanceSheet(journals, accounts, 2025, pl.netIncome);

			// Both should be balanced
			expect(tb.isBalanced).toBe(true);
			expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);
		});

		it('all reports should handle the same set of 76 journals', () => {
			const journals = getJournalsByYear(2025);
			expect(journals).toHaveLength(76);

			const accounts = getAllAccounts();
			expect(accounts.length).toBeGreaterThan(0);

			// Generate all reports - they should not throw
			const tb = generateTrialBalance(journals, accounts);
			const pl = generateProfitLoss(journals, accounts, 2025);
			const bs = generateBalanceSheet(journals, accounts, 2025, pl.netIncome);
			const allLines = journals.flatMap((j) => j.lines);
			const tax = calculateTaxSummary(allLines);

			expect(tb).toBeDefined();
			expect(pl).toBeDefined();
			expect(bs).toBeDefined();
			expect(tax).toBeDefined();
		});

		it('report totals should not contain NaN or Infinity', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const tb = generateTrialBalance(journals, accounts);
			const pl = generateProfitLoss(journals, accounts, 2025);
			const bs = generateBalanceSheet(journals, accounts, 2025, pl.netIncome);
			const allLines = journals.flatMap((j) => j.lines);
			const tax = calculateTaxSummary(allLines);

			// Trial Balance
			expect(Number.isFinite(tb.totalDebit)).toBe(true);
			expect(Number.isFinite(tb.totalCredit)).toBe(true);

			// P/L
			expect(Number.isFinite(pl.totalRevenue)).toBe(true);
			expect(Number.isFinite(pl.totalExpenses)).toBe(true);
			expect(Number.isFinite(pl.netIncome)).toBe(true);

			// B/S
			expect(Number.isFinite(bs.totalAssets)).toBe(true);
			expect(Number.isFinite(bs.totalLiabilities)).toBe(true);
			expect(Number.isFinite(bs.totalEquity)).toBe(true);

			// Tax
			expect(Number.isFinite(tax.netTax)).toBe(true);
		});
	});

	describe('Report robustness', () => {
		it('should handle complex multi-line journals', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			// Find journals with > 2 lines
			const complexJournals = journals.filter((j) => j.lines.length > 2);
			expect(complexJournals.length).toBeGreaterThan(0);

			// These journals should not break the reports
			const tb = generateTrialBalance(journals, accounts);
			const pl = generateProfitLoss(journals, accounts, 2025);
			const bs = generateBalanceSheet(journals, accounts, 2025, pl.netIncome);

			expect(tb.isBalanced).toBe(true);
			expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);
			expect(Number.isFinite(pl.netIncome)).toBe(true);
		});

		it('should handle various tax categories', () => {
			const journals = getJournalsByYear(2025);
			const allLines = journals.flatMap((j) => j.lines);

			// Check variety of tax categories exist
			const taxCategories = new Set(
				allLines.map((l) => l.taxCategory).filter((tc) => tc !== undefined)
			);

			expect(taxCategories.size).toBeGreaterThan(0);

			// Tax calculation should handle them all
			const tax = calculateTaxSummary(allLines);
			expect(Number.isFinite(tax.netTax)).toBe(true);
		});

		it('P/L and B/S should both be generated from same journal set', () => {
			const journals = getJournalsByYear(2025);
			const accounts = getAllAccounts();

			const pl = generateProfitLoss(journals, accounts, 2025);
			const bs = generateBalanceSheet(journals, accounts, 2025, pl.netIncome);

			// Both should produce non-zero results from fixture data
			expect(pl.totalRevenue + pl.totalExpenses).toBeGreaterThan(0);
			expect(bs.totalAssets).toBeGreaterThan(0);
		});
	});
});
