// ===========================================
// @e-shiwake/core
// e-shiwake のビジネスロジック・型定義パッケージ
// ===========================================

// --- Types ---
export type {
	AccountType,
	TaxRate,
	TaxCategory,
	Account,
	Vendor,
	EvidenceStatus,
	StorageType,
	DocumentType,
	JournalLine,
	Attachment,
	ExportAttachment,
	JournalEntry,
	ExportJournalEntry,
	SettingsKey,
	SettingsValueMap,
	Settings,
	ExportData,
	ExportDataDTO,
	StorageUsage,
	ProfitLossRow,
	ProfitLossData,
	BalanceSheetRow,
	BalanceSheetData,
	ConsumptionTaxRow,
	ConsumptionTaxData
} from './types/index.js';

export {
	AccountTypeLabels,
	TaxCategoryLabels,
	TaxCategoryShortLabels,
	DocumentTypeLabels
} from './types/index.js';

export type {
	BusinessInfo,
	FixedAssetCategory,
	DepreciationMethod,
	FixedAsset,
	DepreciationAssetRow,
	MonthlySalesData,
	MonthlyTotals,
	AccountYearlyTotal,
	ExpenseRow,
	BalanceSheetDetailRow,
	RentDetailRow,
	SalaryDetailRow,
	InterestDetailRow,
	Page1ProfitLoss,
	Page2Details,
	Page3Depreciation,
	Page4BalanceSheet,
	BlueReturnData
} from './types/blue-return-types.js';

export {
	AccountTypeLabels as BankAccountTypeLabels
} from './types/blue-return-types.js';

export type {
	InvoiceItem,
	InvoiceStatus,
	Invoice,
	InvoiceInput,
	InvoiceUpdate
} from './types/invoice.js';

export { InvoiceStatusLabels } from './types/invoice.js';

// --- Constants ---
export {
	OWNER_WITHDRAWAL_CODE,
	BUSINESS_RATIO_CONFIGURABLE_ACCOUNTS
} from './constants/accounts.js';

// --- Utils: Accounting ---
export { generateProfitLoss, formatPLAmount, profitLossToCsv } from './utils/profit-loss.js';
export {
	generateBalanceSheet,
	formatBSAmount,
	balanceSheetToCsv
} from './utils/balance-sheet.js';
export { generateConsumptionTax, consumptionTaxToCsv } from './utils/consumption-tax.js';
export {
	generateTrialBalance,
	groupTrialBalance,
	formatAmount
} from './utils/trial-balance.js';
export type {
	TrialBalanceRow,
	TrialBalanceData,
	TrialBalanceGroup,
	GroupedTrialBalanceData
} from './utils/trial-balance.js';
export { generateLedger, getUsedAccounts } from './utils/ledger.js';
export type { LedgerEntry, LedgerData } from './utils/ledger.js';

// --- Utils: Tax ---
export {
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
	calculateAnnualTaxSummary,
	getSimplifiedTaxRate,
	calculateSimplifiedTax
} from './utils/tax.js';
export type { TaxSummary, BusinessCategory } from './utils/tax.js';

// --- Utils: Blue Return / Depreciation ---
export { generateBlueReturnData } from './utils/blue-return.js';
export { generatePage3Depreciation } from './utils/depreciation.js';
export { generatePage2Details } from './utils/monthly-summary.js';

// --- Utils: Business Ratio ---
export {
	applyBusinessRatio,
	removeBusinessRatio,
	hasBusinessRatioApplied
} from './utils/business-ratio.js';

// --- Utils: Journal ---
export { parseSearchQuery, filterJournals } from './utils/journal-search.js';
export type { SearchCriteria } from './utils/journal-search.js';
export { copyJournalForNew } from './utils/journal-copy.js';

// --- Utils: Invoice ---
export {
	calculateInvoiceAmounts,
	calculateItemAmount,
	formatCurrency,
	validateInvoiceNumber
} from './utils/invoice.js';
export {
	generateSalesJournal,
	generateDepositJournal
} from './utils/invoice-journal.js';

// --- Utils: Misc ---
export { cloneJournal } from './utils/clone.js';
export { createDebounce } from './utils/debounce.js';
