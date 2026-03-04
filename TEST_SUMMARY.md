# Unit Tests for @e-shiwake/db Package

## Overview

Created comprehensive unit tests for the `@e-shiwake/db` package (SQLite database layer). Total of **1,954 lines** of test code across 4 test files, covering all repository layers with in-memory SQLite testing.

## Files Created

### Test Files (in `/packages/db/src/__tests__/`)

1. **journal-repository.test.ts** (688 lines)
   - Tests for `addJournal`, `getJournalById`, `getJournalsByYear`, `updateJournal`, `deleteJournal`
   - Tests for `getAvailableYears`, `deleteYearData`, `getAllJournals`
   - Tests for `countJournalLinesByAccountCode`, `updateTaxCategoryByAccountCode`
   - Covers complex multi-line journals, date filtering, cascading deletes, tax categories

2. **account-repository.test.ts** (452 lines)
   - Tests for `getAllAccounts`, `getAccountsByType`, `getAccountByCode`
   - Tests for `addAccount`, `updateAccount`, `deleteAccount`
   - Tests for `isAccountInUse`, `generateNextCode`
   - Covers system vs custom accounts, code auto-generation, business ratio settings

3. **vendor-repository.test.ts** (415 lines)
   - Tests for `getAllVendors`, `getVendorById`, `searchVendorsByName`
   - Tests for `saveVendor`, `updateVendor`, `deleteVendor`
   - Covers deduplication, partial updates, vendor lifecycle
   - Tests substring search and sorting

4. **import-export.test.ts** (399 lines)
   - Tests for `importData` and `exportYearData`
   - Uses real fixture data: `packages/db/test/fixtures/export-2025.json`
   - Covers merge vs overwrite modes
   - Validates round-trip import/export integrity
   - Tests with real 76-journal, 66-account, 27-vendor dataset

### Configuration File

5. **vitest.config.ts** (in `/packages/db/`)
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
   	test: {
   		globals: true
   	}
   });
   ```

### Updated Files

6. **package.json** (updated)
   - Added `vitest` v2.0.0 to devDependencies

## Test Coverage

### Journal Repository (10 test suites, 40+ test cases)
- ✅ Create journals with 2+ lines
- ✅ Complex multi-line journals (family expenses, source deduction)
- ✅ Auto-generated line IDs
- ✅ Tax category preservation
- ✅ Year-based filtering and sorting
- ✅ Update header fields and lines
- ✅ Evidence status changes
- ✅ Cascading deletes
- ✅ Available years calculation
- ✅ Year data deletion with cascade
- ✅ Debit/credit line counting by account
- ✅ Tax category bulk updates

### Account Repository (8 test suites, 35+ test cases)
- ✅ Retrieve all accounts (sorted by code)
- ✅ Type-based filtering (asset/liability/equity/revenue/expense)
- ✅ System vs custom account distinction
- ✅ Add custom accounts with auto-assigned codes
- ✅ Update account properties (name, tax category, business ratio)
- ✅ Delete protection for system accounts
- ✅ In-use detection for safe deletion
- ✅ Sequential code generation for each category
- ✅ Category limit enforcement (99 user slots per type)
- ✅ Business ratio settings

### Vendor Repository (8 test suites, 40+ test cases)
- ✅ CRUD operations (create, read, update, delete)
- ✅ Vendor name deduplication (same name returns existing ID)
- ✅ Search by partial name
- ✅ Case-insensitive search
- ✅ Sorting by name
- ✅ All vendor properties (address, contact, email, phone, payment terms, note)
- ✅ Update timestamp tracking
- ✅ Vendor lifecycle testing
- ✅ Special characters in names
- ✅ List integrity after deletion

### Import/Export (6 test suites, 30+ test cases)
- ✅ Import with merge mode (preserves existing)
- ✅ Import with overwrite mode (replaces year data)
- ✅ Import real fixture data (2025 export with 76 journals)
- ✅ Correct journal/account/vendor counts
- ✅ Preserve journal details (date, vendor, description, lines)
- ✅ Tax category preservation
- ✅ Export structure validation
- ✅ Round-trip import/export integrity
- ✅ Fixture data validation
- ✅ Debit/credit balance verification
- ✅ Account code validity
- ✅ Journal date range verification

## Testing Strategy

### Database Setup
All tests use **in-memory SQLite** (`:memory:`) via `beforeEach`:
```typescript
beforeEach(() => {
	resetDatabase(':memory:');
	seedDefaultAccounts();
});
```

### Isolation
- Each test gets a fresh database instance
- Default accounts are seeded before each test
- No test dependencies on previous test state

### Real Data
- `import-export.test.ts` uses actual fixture data from `test/fixtures/export-2025.json`
- Validates against real-world 76-journal, 66-account, 27-vendor dataset
- Tests round-trip import/export with actual data structure

### Type Safety
- Full TypeScript strict mode
- Proper types from `@e-shiwake/core`
- Type assertions only where necessary

## Running the Tests

```bash
# Install dependencies (if needed)
pnpm install

# Run all tests in db package
cd packages/db
pnpm test

# Run specific test file
pnpm test journal-repository.test.ts

# Run in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## Key Testing Patterns

### In-Memory Database
```typescript
beforeEach(() => {
	resetDatabase(':memory:');
	seedDefaultAccounts();
});
```

### Journal Creation
```typescript
const id = addJournal({
	date: '2025-01-15',
	vendor: 'Amazon',
	description: 'Test',
	evidenceStatus: 'none',
	lines: [
		{ id: '', type: 'debit', accountCode: '5011', amount: 1000 },
		{ id: '', type: 'credit', accountCode: '1002', amount: 1000 }
	],
	attachments: []
});
```

### Account Code Generation
```typescript
const nextCode = generateNextCode('expense');
// Returns "5101", "5102", etc. (skip 5001-5099 system range)
```

### Import/Export Round Trip
```typescript
const fixture = loadFixture();
importData(fixture, 'merge');
const exported = exportYearData(2025);
expect(exported.journals.length).toBe(fixture.journals.length);
```

## Edge Cases Covered

- ✅ Empty database queries
- ✅ Non-existent IDs (undefined returns)
- ✅ Duplicate vendor names
- ✅ System account deletion prevention
- ✅ Account code upper limit (99 per category)
- ✅ Debit/credit balance validation
- ✅ Tax category nullability
- ✅ Timestamp updates on modification
- ✅ Cascade deletes (journals with lines)
- ✅ Year data separation and isolation

## Data Model Coverage

### JournalEntry
- ✅ date (YYYY-MM-DD format)
- ✅ lines (complex multi-line support)
- ✅ vendor (transaction partner)
- ✅ description (摘要)
- ✅ evidenceStatus ('none' | 'paper' | 'digital')
- ✅ attachments (empty for DB layer)

### JournalLine
- ✅ type ('debit' | 'credit')
- ✅ accountCode (勘定科目コード)
- ✅ amount (金額)
- ✅ taxCategory (消費税区分)
- ✅ memo (行メモ)
- ✅ Business ratio fields (_businessRatioApplied, _originalAmount, etc.)

### Account
- ✅ code (4-digit unique)
- ✅ name (勘定科目名)
- ✅ type (asset/liability/equity/revenue/expense)
- ✅ isSystem (system vs custom)
- ✅ defaultTaxCategory (税区分デフォルト)
- ✅ businessRatioEnabled (家事按分対応)

### Vendor
- ✅ id (UUID)
- ✅ name (取引先名)
- ✅ address (住所)
- ✅ contactName (担当者名)
- ✅ email (メール)
- ✅ phone (電話)
- ✅ paymentTerms (支払条件)
- ✅ note (メモ)

## Next Steps

To run these tests:

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run tests:
   ```bash
   cd packages/db
   pnpm test
   ```

3. The tests will:
   - Create in-memory SQLite databases for each test
   - Run all 100+ test cases
   - Verify all CRUD operations
   - Validate real fixture data import/export
   - Check round-trip data integrity

## Notes

- Tests are **synchronous** (better-sqlite3 is sync, no async needed)
- Uses **in-memory SQLite** for speed (no file I/O)
- Each test is **fully isolated** (fresh DB per test)
- **Type-safe** throughout (full TypeScript coverage)
- Tests **real fixture data** from `export-2025.json`
- Covers all **edge cases** and **error conditions**
