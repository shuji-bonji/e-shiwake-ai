# E2E Test Suite for @e-shiwake/mcp-server

This directory contains comprehensive end-to-end (e2e) tests for the e-shiwake MCP Server, verifying that all MCP tools work correctly with real data imported from fixture files.

## Test Files Overview

### 1. **e2e-journal.test.ts** (Journal CRUD Workflow)
Comprehensive tests for journal (仕訳) operations including create, read, update, and delete.

**Test Coverage:**
- **Setup**: Loading and importing fixture data (76 journals, 66 accounts, 27 vendors, FY2025)
- **List fiscal years**: Verify available years after import
- **List journals**: Get all journals for a fiscal year with proper sorting
- **Get journal by ID**: Retrieve individual journal details
- **Create journal**:
  - Simple 2-line journals
  - Complex multi-line (compound) journals with family business ratio splits
  - Journals with various tax categories
- **Update journal**:
  - Update descriptions and vendor names
  - Update journal lines while maintaining debit/credit balance
  - Partial field updates
- **Delete journal**: Remove journals and verify deletion
- **Data integrity**:
  - Verify all accounts in journals exist
  - Ensure debit/credit balance for all journals
  - Validate date formats and structure

**Key Assertions:**
- 76 journals imported correctly
- Debit sum === Credit sum for all journals
- Journals sorted by date (newest first)
- CRUD operations maintain data consistency

### 2. **e2e-report.test.ts** (Report Generation)
Tests for generating accounting reports using real fixture data.

**Test Coverage:**
- **Trial Balance (試算表)**:
  - Generate trial balance and verify structure
  - Verify debit/credit balance (balanced == true)
  - Group trial balance by account type
  - Verify subtotals match main totals

- **Profit & Loss Statement (損益計算書)**:
  - Generate P/L with correct revenue/expense aggregation
  - Verify netIncome = totalRevenue - totalExpenses
  - All items have valid structure and reasonable amounts

- **Balance Sheet (貸借対照表)**:
  - Generate balance sheet with asset/liability/equity breakdown
  - Verify balance sheet equation: Assets = Liabilities + Equity
  - Verify subtotals and groupings

- **Tax Summary (消費税集計)**:
  - Calculate tax summary from journal lines
  - Verify 10% and 8% tax calculations
  - Verify net tax = sales tax - purchase tax
  - All tax amounts >= 0

- **Report Consistency**:
  - All reports use same journal set
  - Trial balance and balance sheet both balanced
  - No NaN or Infinity values in any report

**Key Assertions:**
- Trial balance is balanced (debit == credit)
- Balance sheet is balanced (assets == liabilities + equity)
- Tax calculations follow proper percentage rules
- All totals are finite numbers (no NaN/Infinity)

### 3. **e2e-accounts.test.ts** (Account & Vendor Management)
Tests for account (勘定科目) and vendor (取引先) management operations.

**Test Coverage:**
- **Account Management**:
  - List all accounts (66 total from fixture)
  - Filter accounts by type (asset, liability, equity, revenue, expense)
  - Get account details by code
  - Create custom accounts with auto-incremented codes
  - Update account properties (name, tax category, business ratio)
  - Delete unused accounts (cannot delete system accounts or in-use accounts)
  - Track account usage in journals

- **Vendor Management**:
  - List all vendors (27 total from fixture)
  - Get vendor by ID
  - Search vendors by name (partial, case-insensitive)
  - Create new vendors with full optional fields
  - Prevent duplicate vendors by name
  - Update vendor information
  - Delete vendors

- **Relationships**:
  - Verify all vendor names in journals exist in vendor table
  - Verify all account codes in journals exist in account table
  - Identify in-use accounts that cannot be deleted

**Key Assertions:**
- 66 accounts and 27 vendors imported correctly
- Account type filtering works correctly
- Auto-generated codes follow naming convention (11xx for assets, 21xx for liabilities, etc.)
- System accounts cannot be deleted
- In-use accounts cannot be deleted
- Vendor search is case-insensitive and partial-match capable

## Fixture Data

The tests use a real-world fixture file at:
```
packages/db/test/fixtures/export-2025.json
```

**Fixture Contents:**
- **Version**: 1.0.0
- **Fiscal Year**: 2025
- **Journals**: 76 entries with balanced debit/credit
- **Accounts**: 66 items (mix of system and custom)
- **Vendors**: 27 unique trading partners
- **Settings**: Empty (placeholder for settings)

All journals have:
- Valid YYYY-MM-DD dates
- At least 2 lines (debit + credit)
- Balanced debit/credit amounts
- Various tax categories (sales_10, sales_8, purchase_10, purchase_8, exempt, out_of_scope, na)
- Valid evidence status (none, paper, digital)

## Running the Tests

### Prerequisites
```bash
# Install dependencies (from workspace root)
pnpm install
```

### Run All Tests
```bash
# From mcp-server directory
pnpm test

# Or from workspace root
pnpm --filter @e-shiwake/mcp-server test
```

### Run Specific Test File
```bash
pnpm vitest run src/__tests__/e2e-journal.test.ts
pnpm vitest run src/__tests__/e2e-report.test.ts
pnpm vitest run src/__tests__/e2e-accounts.test.ts
```

### Run in Watch Mode
```bash
pnpm vitest src/__tests__/
```

### Generate Coverage Report
```bash
pnpm vitest run --coverage
```

## Test Execution Flow

Each test file follows this pattern:

```
1. beforeEach()
   ├── resetDatabase()           # Clear existing data
   ├── getDatabase()              # Initialize SQLite
   ├── seedDefaultAccounts()      # Populate system accounts
   └── importData(fixture)        # Load fixture data

2. Test Suite
   ├── Test 1: Verify structure
   ├── Test 2: Verify calculations
   ├── Test 3: Verify relationships
   └── Test N: Comprehensive workflow

3. afterEach()
   └── resetDatabase()            # Clean up
```

## Key Testing Strategies

### 1. **Import-First Approach**
Tests begin by importing real fixture data to ensure all scenarios are tested against actual business records.

### 2. **Balance Verification**
For accounting operations, tests always verify:
- Debit balance = Credit balance (journals and trial balance)
- Assets = Liabilities + Equity (balance sheet)

### 3. **Data Consistency**
Tests verify:
- All referenced accounts exist
- All referenced vendors exist
- No orphaned data after operations

### 4. **Comprehensive Coverage**
Each test covers:
- **Happy path**: Normal operation
- **Edge cases**: Boundary conditions (empty results, max values)
- **Relationships**: Data integrity across tables
- **Workflow**: Complete CRUD scenarios

## Expected Test Results

When all tests pass:

```
✓ e2e-journal.test.ts (42 tests)
  ✓ Setup: Import fixture data (2)
  ✓ List fiscal years (2)
  ✓ List journals for fiscal year (5)
  ✓ Get journal by ID (3)
  ✓ Create journal (5)
  ✓ Update journal (3)
  ✓ Delete journal (3)
  ✓ Comprehensive workflow (1)
  ✓ Data integrity checks (3)

✓ e2e-report.test.ts (35 tests)
  ✓ Trial Balance (5)
  ✓ Profit & Loss Statement (6)
  ✓ Balance Sheet (5)
  ✓ Tax Summary (5)
  ✓ Report consistency (3)
  ✓ Report robustness (3)

✓ e2e-accounts.test.ts (48 tests)
  ✓ Account Management (15)
  ✓ Vendor Management (18)
  ✓ Relationships (3)
  ✓ Comprehensive workflow (1)

Total: 125 tests passed
```

## Troubleshooting

### Tests Fail: "FIXTURE_PATH not found"
**Cause**: Running tests from wrong directory
**Solution**:
```bash
cd packages/mcp-server
pnpm test
```

### Tests Fail: "Database already exists"
**Cause**: Previous test did not clean up properly
**Solution**:
```bash
# Force cleanup
rm -f e-shiwake.db e-shiwake.db-journal
pnpm test
```

### Tests Slow Down
**Cause**: Database operations accumulating
**Solution**: Tests include `resetDatabase()` in beforeEach and afterEach, but you can force cleanup:
```bash
pnpm vitest run --clearCache
```

## Architecture Notes

### DB Layer Integration
Tests directly call repository functions:
```typescript
import {
  getDatabase,
  getJournalsByYear,
  addJournal,
  updateJournal,
  deleteJournal
} from '@e-shiwake/db';
```

This is intentional - MCP tools are thin wrappers around these repository functions, so testing the repositories directly verifies the tools work correctly.

### Report Generation
Tests call core utility functions directly:
```typescript
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  calculateTaxSummary
} from '@e-shiwake/core';
```

### Fixture Data
Fixture is loaded as JSON and imported using `importData()`, which:
1. Resets the target fiscal year (if overwrite mode)
2. Imports accounts, vendors, and journals
3. Validates structure and returns import stats

## Future Enhancements

Potential areas for additional testing:

1. **Performance Tests**: Verify operations on larger datasets (1000+ journals)
2. **Concurrent Operations**: Test thread safety of database operations
3. **Error Handling**: Test error conditions (invalid inputs, corrupt data)
4. **Integration Tests**: Test full MCP server startup and tool invocation
5. **Regression Tests**: Create tests for specific bug fixes

## Contributing

When adding new tests:

1. Follow the existing pattern (describe > it > expect)
2. Always include beforeEach/afterEach for database setup/cleanup
3. Use meaningful test names (e.g., "should create journal with tax category")
4. Document any new fixture data requirements
5. Update this README with new test coverage

## References

- [Vitest Documentation](https://vitest.dev/)
- [e-shiwake DB Layer](../../../db/)
- [e-shiwake Core Utils](../../../core/)
- [MCP Tools](../tools/)
- [Test Fixture Data](../../../db/test/fixtures/export-2025.json)
