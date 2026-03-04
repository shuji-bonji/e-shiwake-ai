# e-shiwake-ai

[日本語](./README.ja.md)

MCP (Model Context Protocol) server for Japanese double-entry bookkeeping. Enables AI agents like Claude to manage journal entries, chart of accounts, vendors, and generate financial reports through natural language.

Built as the AI integration layer for [e-shiwake](https://github.com/shuji-bonji/e-shiwake) — a local-first PWA for freelancers and sole proprietors in Japan.

## Features

- **Journal Management** — Create, read, update, delete journal entries with compound entry support
- **Chart of Accounts** — Manage accounts across 5 categories (Assets, Liabilities, Equity, Revenue, Expenses)
- **Vendor Management** — Track business partners with contact details
- **Financial Reports** — Trial balance, Profit & Loss, Balance Sheet, Consumption Tax summary
- **Data Export** — JSON export for backup and migration
- **Japanese Tax Compliance** — Consumption tax categories (10%, 8% reduced rate, exempt, out-of-scope)

## Architecture

```
┌──────────────────────────────────┐
│        AI Agent (Claude)         │
└───────────────┬──────────────────┘
                │ MCP Protocol (stdio)
┌───────────────▼──────────────────┐
│     @e-shiwake/mcp-server        │
│     MCP tools + Zod validation   │
├──────────────────────────────────┤
│     @e-shiwake/db                │
│     SQLite (better-sqlite3)      │
├──────────────────────────────────┤
│     @e-shiwake/core              │
│     Types + Business logic       │
└──────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm

### Install & Build

```bash
git clone https://github.com/shuji-bonji/e-shiwake-ai.git
cd e-shiwake-ai
pnpm install
pnpm run build
```

### Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "e-shiwake": {
      "command": "node",
      "args": ["/path/to/e-shiwake-ai/packages/mcp-server/dist/index.js"],
      "env": {
        "E_SHIWAKE_DB_PATH": "/path/to/your/e-shiwake.db"
      }
    }
  }
}
```

### Troubleshooting: Node.js Version Mismatch

`better-sqlite3` is a native module that must be compiled for the same Node.js version used at runtime. If Claude Desktop uses a different Node.js version than the one used during `pnpm install`, you'll see an error like:

```
NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 115.
```

**Fix**: Specify the absolute path to the same Node.js binary used during `pnpm install`:

```json
"command": "/path/to/.nvm/versions/node/v22.x.x/bin/node"
```

> **Note**: Using just `"command": "node"` may resolve to a different Node.js version than the one used to build the native modules. Always use the absolute path to ensure version consistency.

### Verify

After restarting Claude Desktop, you should see e-shiwake tools available. Try:

> "Show me the list of fiscal years"

## MCP Tools

### Journals

| Tool | Description |
|---|---|
| `eshiwake_list_fiscal_years` | List available fiscal years |
| `eshiwake_list_journals` | List journals by fiscal year |
| `eshiwake_get_journal` | Get journal entry details |
| `eshiwake_create_journal` | Create a new journal entry |
| `eshiwake_update_journal` | Update a journal entry |
| `eshiwake_delete_journal` | Delete a journal entry |
| `eshiwake_delete_year_data` | Delete all data for a fiscal year |

### Accounts

| Tool | Description |
|---|---|
| `eshiwake_list_accounts` | List accounts (filterable by type) |
| `eshiwake_get_account` | Get account details |
| `eshiwake_create_account` | Create account (auto-numbered) |
| `eshiwake_update_account` | Update an account |
| `eshiwake_delete_account` | Delete account (if unused) |

### Vendors

| Tool | Description |
|---|---|
| `eshiwake_list_vendors` | List/search vendors |
| `eshiwake_get_vendor` | Get vendor details |
| `eshiwake_create_vendor` | Create vendor (deduplicates by name) |
| `eshiwake_update_vendor` | Update a vendor |
| `eshiwake_delete_vendor` | Delete a vendor |

### Reports

| Tool | Description |
|---|---|
| `eshiwake_trial_balance` | Generate trial balance |
| `eshiwake_profit_loss` | Generate profit & loss statement |
| `eshiwake_balance_sheet` | Generate balance sheet |
| `eshiwake_tax_summary` | Generate consumption tax summary |
| `eshiwake_export_data` | Export data as JSON |

## Package Structure

```
packages/
├── core/         # @e-shiwake/core — Types & business logic (zero dependencies)
├── db/           # @e-shiwake/db — SQLite repositories (better-sqlite3)
└── mcp-server/   # @e-shiwake/mcp-server — MCP server entry point
```

## Development

```bash
# Run all tests (391 tests)
pnpm run test

# Format code
pnpm run format

# Lint
pnpm run lint

# Format + Lint + Fix
pnpm run check
```

## Tech Stack

- **Language**: TypeScript (strict mode, ESM)
- **Runtime**: Node.js >= 18
- **Package Manager**: pnpm (workspaces)
- **Database**: SQLite via better-sqlite3
- **MCP**: @modelcontextprotocol/sdk v1.x
- **Validation**: Zod
- **Linter/Formatter**: Biome
- **Testing**: Vitest

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `E_SHIWAKE_DB_PATH` | Path to SQLite database file | `e-shiwake.db` |

## License

[MIT](./LICENSE)
