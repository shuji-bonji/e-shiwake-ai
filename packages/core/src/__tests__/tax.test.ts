import { describe, it, expect } from 'vitest';
import {
	getTaxRateFromCategory,
	isTaxable,
	isSalesCategory,
	isPurchaseCategory,
	calculateTaxExcluded,
	calculateTaxAmount,
	calculateTaxIncluded,
	calculateTaxIncludedByCategory,
	calculateTotalTax,
	calculateTaxSummary,
	getSimplifiedTaxRate,
	calculateSimplifiedTax
} from '../utils/tax.js';
import type { JournalLine, TaxCategory } from '../types/index.js';

describe('Tax Utilities', () => {
	describe('getTaxRateFromCategory', () => {
		it('should return 10 for sales_10', () => {
			expect(getTaxRateFromCategory('sales_10')).toBe(10);
		});

		it('should return 10 for purchase_10', () => {
			expect(getTaxRateFromCategory('purchase_10')).toBe(10);
		});

		it('should return 8 for sales_8', () => {
			expect(getTaxRateFromCategory('sales_8')).toBe(8);
		});

		it('should return 8 for purchase_8', () => {
			expect(getTaxRateFromCategory('purchase_8')).toBe(8);
		});

		it('should return 0 for exempt', () => {
			expect(getTaxRateFromCategory('exempt')).toBe(0);
		});

		it('should return 0 for out_of_scope', () => {
			expect(getTaxRateFromCategory('out_of_scope')).toBe(0);
		});

		it('should return 0 for na', () => {
			expect(getTaxRateFromCategory('na')).toBe(0);
		});

		it('should return 0 for undefined', () => {
			expect(getTaxRateFromCategory(undefined)).toBe(0);
		});
	});

	describe('isTaxable', () => {
		it('should return true for sales_10', () => {
			expect(isTaxable('sales_10')).toBe(true);
		});

		it('should return true for sales_8', () => {
			expect(isTaxable('sales_8')).toBe(true);
		});

		it('should return true for purchase_10', () => {
			expect(isTaxable('purchase_10')).toBe(true);
		});

		it('should return true for purchase_8', () => {
			expect(isTaxable('purchase_8')).toBe(true);
		});

		it('should return false for exempt', () => {
			expect(isTaxable('exempt')).toBe(false);
		});

		it('should return false for out_of_scope', () => {
			expect(isTaxable('out_of_scope')).toBe(false);
		});

		it('should return false for na', () => {
			expect(isTaxable('na')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isTaxable(undefined)).toBe(false);
		});
	});

	describe('isSalesCategory', () => {
		it('should return true for sales_10', () => {
			expect(isSalesCategory('sales_10')).toBe(true);
		});

		it('should return true for sales_8', () => {
			expect(isSalesCategory('sales_8')).toBe(true);
		});

		it('should return false for purchase_10', () => {
			expect(isSalesCategory('purchase_10')).toBe(false);
		});

		it('should return false for purchase_8', () => {
			expect(isSalesCategory('purchase_8')).toBe(false);
		});

		it('should return false for non-sales categories', () => {
			expect(isSalesCategory('exempt')).toBe(false);
			expect(isSalesCategory('na')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isSalesCategory(undefined)).toBe(false);
		});
	});

	describe('isPurchaseCategory', () => {
		it('should return true for purchase_10', () => {
			expect(isPurchaseCategory('purchase_10')).toBe(true);
		});

		it('should return true for purchase_8', () => {
			expect(isPurchaseCategory('purchase_8')).toBe(true);
		});

		it('should return false for sales_10', () => {
			expect(isPurchaseCategory('sales_10')).toBe(false);
		});

		it('should return false for sales_8', () => {
			expect(isPurchaseCategory('sales_8')).toBe(false);
		});

		it('should return false for non-purchase categories', () => {
			expect(isPurchaseCategory('exempt')).toBe(false);
			expect(isPurchaseCategory('na')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isPurchaseCategory(undefined)).toBe(false);
		});
	});

	describe('calculateTaxExcluded', () => {
		it('should calculate tax excluded amount for 10% rate', () => {
			// 110,000 = 100,000 + 10,000 (10%)
			expect(calculateTaxExcluded(110000, 10)).toBe(100000);
		});

		it('should calculate tax excluded amount for 8% rate', () => {
			// 108,000 = 100,000 + 8,000 (8%)
			expect(calculateTaxExcluded(108000, 8)).toBe(100000);
		});

		it('should return same amount for 0% rate', () => {
			expect(calculateTaxExcluded(100000, 0)).toBe(100000);
		});

		it('should handle fractional results by flooring', () => {
			// 10,000 / 1.1 = 9,090.909... -> 9,090
			expect(calculateTaxExcluded(10000, 10)).toBe(9090);
		});

		it('should handle zero amount', () => {
			expect(calculateTaxExcluded(0, 10)).toBe(0);
		});
	});

	describe('calculateTaxAmount', () => {
		it('should calculate tax amount for 10% rate', () => {
			// 110,000 - 100,000 = 10,000
			expect(calculateTaxAmount(110000, 10)).toBe(10000);
		});

		it('should calculate tax amount for 8% rate', () => {
			// 108,000 - 100,000 = 8,000
			expect(calculateTaxAmount(108000, 8)).toBe(8000);
		});

		it('should return 0 for 0% rate', () => {
			expect(calculateTaxAmount(100000, 0)).toBe(0);
		});

		it('should handle fractional results correctly', () => {
			// 10,000 => 9,090 (10%) => tax = 910
			expect(calculateTaxAmount(10000, 10)).toBe(910);
		});

		it('should handle zero amount', () => {
			expect(calculateTaxAmount(0, 10)).toBe(0);
		});
	});

	describe('calculateTaxIncluded', () => {
		it('should calculate tax included amount for 10% rate', () => {
			// 100,000 * 1.1 = 110,000
			expect(calculateTaxIncluded(100000, 10)).toBe(110000);
		});

		it('should calculate tax included amount for 8% rate', () => {
			// 100,000 * 1.08 = 108,000
			expect(calculateTaxIncluded(100000, 8)).toBe(108000);
		});

		it('should return same amount for 0% rate', () => {
			expect(calculateTaxIncluded(100000, 0)).toBe(100000);
		});

		it('should handle fractional results by flooring', () => {
			// 10,000 * 1.1 = 11,000
			expect(calculateTaxIncluded(10000, 10)).toBe(11000);
		});

		it('should handle zero amount', () => {
			expect(calculateTaxIncluded(0, 10)).toBe(0);
		});
	});

	describe('calculateTaxIncludedByCategory', () => {
		it('should sum amounts for sales_10 category', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'credit',
					accountCode: '4001',
					amount: 220000,
					taxCategory: 'sales_10'
				}
			];

			expect(calculateTaxIncludedByCategory(lines)).toBe(330000);
		});

		it('should use custom filter when provided', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'credit',
					accountCode: '4001',
					amount: 108000,
					taxCategory: 'sales_8'
				}
			];

			const filter = (cat: TaxCategory) => cat === 'sales_10';
			expect(calculateTaxIncludedByCategory(lines, filter)).toBe(110000);
		});

		it('should return 0 for empty lines', () => {
			expect(calculateTaxIncludedByCategory([])).toBe(0);
		});

		it('should ignore lines without taxCategory', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000
				}
			];

			expect(calculateTaxIncludedByCategory(lines)).toBe(0);
		});

		it('should ignore non-taxable categories by default', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 100000,
					taxCategory: 'exempt'
				}
			];

			expect(calculateTaxIncludedByCategory(lines)).toBe(0);
		});
	});

	describe('calculateTotalTax', () => {
		it('should calculate total tax for sales_10', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				}
			];

			expect(calculateTotalTax(lines)).toBe(10000);
		});

		it('should calculate total tax for multiple rates', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'credit',
					accountCode: '4001',
					amount: 108000,
					taxCategory: 'sales_8'
				}
			];

			// 10,000 + 8,000 = 18,000
			expect(calculateTotalTax(lines)).toBe(18000);
		});

		it('should use custom filter when provided', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'debit',
					accountCode: '5001',
					amount: 110000,
					taxCategory: 'purchase_10'
				}
			];

			const filter = (cat: TaxCategory) => isSalesCategory(cat);
			expect(calculateTotalTax(lines, filter)).toBe(10000);
		});

		it('should return 0 for empty lines', () => {
			expect(calculateTotalTax([])).toBe(0);
		});

		it('should return 0 for non-taxable categories', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 100000,
					taxCategory: 'exempt'
				}
			];

			expect(calculateTotalTax(lines)).toBe(0);
		});
	});

	describe('calculateTaxSummary', () => {
		it('should generate empty summary for no lines', () => {
			const summary = calculateTaxSummary([]);

			expect(summary.sales10TaxIncluded).toBe(0);
			expect(summary.sales10TaxExcluded).toBe(0);
			expect(summary.sales10Tax).toBe(0);
			expect(summary.purchase10TaxIncluded).toBe(0);
			expect(summary.purchase10TaxExcluded).toBe(0);
			expect(summary.purchase10Tax).toBe(0);
			expect(summary.netTax).toBe(0);
		});

		it('should calculate sales 10% summary', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.sales10TaxIncluded).toBe(110000);
			expect(summary.sales10TaxExcluded).toBe(100000);
			expect(summary.sales10Tax).toBe(10000);
			expect(summary.totalSalesTax).toBe(10000);
			expect(summary.netTax).toBe(10000);
		});

		it('should calculate purchase 10% summary', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'debit',
					accountCode: '5001',
					amount: 110000,
					taxCategory: 'purchase_10'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.purchase10TaxIncluded).toBe(110000);
			expect(summary.purchase10TaxExcluded).toBe(100000);
			expect(summary.purchase10Tax).toBe(10000);
			expect(summary.totalPurchaseTax).toBe(10000);
			expect(summary.netTax).toBe(-10000);
		});

		it('should calculate mixed sales and purchase', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'debit',
					accountCode: '5001',
					amount: 55000,
					taxCategory: 'purchase_10'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.sales10Tax).toBe(10000);
			expect(summary.purchase10Tax).toBe(5000);
			expect(summary.netTax).toBe(5000); // 10,000 - 5,000
		});

		it('should calculate all tax rates', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000,
					taxCategory: 'sales_10'
				},
				{
					id: '2',
					type: 'credit',
					accountCode: '4001',
					amount: 108000,
					taxCategory: 'sales_8'
				},
				{
					id: '3',
					type: 'debit',
					accountCode: '5001',
					amount: 110000,
					taxCategory: 'purchase_10'
				},
				{
					id: '4',
					type: 'debit',
					accountCode: '5001',
					amount: 108000,
					taxCategory: 'purchase_8'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.sales10Tax).toBe(10000);
			expect(summary.sales8Tax).toBe(8000);
			expect(summary.purchase10Tax).toBe(10000);
			expect(summary.purchase8Tax).toBe(8000);
			expect(summary.totalSalesTax).toBe(18000);
			expect(summary.totalPurchaseTax).toBe(18000);
			expect(summary.netTax).toBe(0);
		});

		it('should handle exempt and out_of_scope for credit (sales)', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 100000,
					taxCategory: 'exempt'
				},
				{
					id: '2',
					type: 'credit',
					accountCode: '4001',
					amount: 100000,
					taxCategory: 'out_of_scope'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.exemptSales).toBe(100000);
			expect(summary.outOfScopeSales).toBe(100000);
			expect(summary.exemptPurchase).toBe(0);
			expect(summary.outOfScopePurchase).toBe(0);
		});

		it('should handle exempt and out_of_scope for debit (purchase)', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'debit',
					accountCode: '5001',
					amount: 100000,
					taxCategory: 'exempt'
				},
				{
					id: '2',
					type: 'debit',
					accountCode: '5001',
					amount: 100000,
					taxCategory: 'out_of_scope'
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.exemptPurchase).toBe(100000);
			expect(summary.outOfScopePurchase).toBe(100000);
			expect(summary.exemptSales).toBe(0);
			expect(summary.outOfScopeSales).toBe(0);
		});

		it('should ignore lines without taxCategory', () => {
			const lines: JournalLine[] = [
				{
					id: '1',
					type: 'credit',
					accountCode: '4001',
					amount: 110000
				}
			];

			const summary = calculateTaxSummary(lines);

			expect(summary.sales10TaxIncluded).toBe(0);
			expect(summary.netTax).toBe(0);
		});
	});

	describe('getSimplifiedTaxRate', () => {
		it('should return 90% for wholesale', () => {
			expect(getSimplifiedTaxRate('wholesale')).toBe(90);
		});

		it('should return 80% for retail', () => {
			expect(getSimplifiedTaxRate('retail')).toBe(80);
		});

		it('should return 70% for manufacturing', () => {
			expect(getSimplifiedTaxRate('manufacturing')).toBe(70);
		});

		it('should return 60% for other', () => {
			expect(getSimplifiedTaxRate('other')).toBe(60);
		});

		it('should return 50% for services', () => {
			expect(getSimplifiedTaxRate('services')).toBe(50);
		});

		it('should return 40% for realestate', () => {
			expect(getSimplifiedTaxRate('realestate')).toBe(40);
		});
	});

	describe('calculateSimplifiedTax', () => {
		it('should calculate simplified tax for services', () => {
			// Sales: 110,000 (10% tax rate)
			// Deemed tax rate: 50%
			// Sales tax: 10,000
			// Deemed purchase tax: 5,000 (10,000 * 50%)
			// Net tax: 5,000

			const result = calculateSimplifiedTax(110000, 'services');

			expect(result.salesTax).toBe(10000);
			expect(result.deemedPurchaseTax).toBe(5000);
			expect(result.netTax).toBe(5000);
		});

		it('should calculate simplified tax for wholesale', () => {
			const result = calculateSimplifiedTax(110000, 'wholesale');

			expect(result.salesTax).toBe(10000);
			expect(result.deemedPurchaseTax).toBe(9000); // 10,000 * 90%
			expect(result.netTax).toBe(1000);
		});

		it('should calculate simplified tax for realestate', () => {
			const result = calculateSimplifiedTax(110000, 'realestate');

			expect(result.salesTax).toBe(10000);
			expect(result.deemedPurchaseTax).toBe(4000); // 10,000 * 40%
			expect(result.netTax).toBe(6000);
		});

		it('should handle zero sales', () => {
			const result = calculateSimplifiedTax(0, 'services');

			expect(result.salesTax).toBe(0);
			expect(result.deemedPurchaseTax).toBe(0);
			expect(result.netTax).toBe(0);
		});
	});
});
