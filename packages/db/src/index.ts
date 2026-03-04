// ===========================================
// @e-shiwake/db
// SQLite ベースのデータベース層
// ===========================================

// --- Database ---
export { closeDatabase, getDatabase, resetDatabase } from './database.js';
export {
	addAccount,
	deleteAccount,
	generateNextCode,
	getAccountByCode,
	getAccountsByType,
	getAllAccounts,
	isAccountInUse,
	updateAccount
} from './repositories/account-repository.js';
export { exportYearData, importData } from './repositories/import-export.js';
// --- Repositories ---
export {
	addJournal,
	countJournalLinesByAccountCode,
	deleteJournal,
	deleteYearData,
	getAllJournals,
	getAvailableYears,
	getJournalById,
	getJournalsByYear,
	searchJournals,
	updateJournal,
	updateTaxCategoryByAccountCode
} from './repositories/journal-repository.js';
export {
	deleteVendor,
	getAllVendors,
	getVendorById,
	saveVendor,
	searchVendorsByName,
	updateVendor
} from './repositories/vendor-repository.js';
// --- Schema ---
export { initializeSchema } from './schema/init.js';
// --- Seed ---
export { seedDefaultAccounts } from './seed.js';
