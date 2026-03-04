// ===========================================
// @e-shiwake/db
// SQLite ベースのデータベース層
// ===========================================

// --- Database ---
export { getDatabase, closeDatabase, resetDatabase } from './database.js';

// --- Repositories ---
export {
	getJournalsByYear,
	getAllJournals,
	getAvailableYears,
	getJournalById,
	addJournal,
	updateJournal,
	deleteJournal,
	countJournalLinesByAccountCode,
	updateTaxCategoryByAccountCode,
	deleteYearData
} from './repositories/journal-repository.js';

export {
	getAllAccounts,
	getAccountsByType,
	getAccountByCode,
	addAccount,
	updateAccount,
	deleteAccount,
	isAccountInUse,
	generateNextCode
} from './repositories/account-repository.js';

export {
	getAllVendors,
	getVendorById,
	searchVendorsByName,
	saveVendor,
	updateVendor,
	deleteVendor
} from './repositories/vendor-repository.js';

export { exportYearData } from './repositories/import-export.js';

// --- Seed ---
export { seedDefaultAccounts } from './seed.js';

// --- Schema ---
export { initializeSchema } from './schema/init.js';
