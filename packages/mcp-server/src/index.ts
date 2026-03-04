#!/usr/bin/env node

/**
 * e-shiwake MCP Server
 *
 * フリーランス・個人事業主向け仕訳入力・帳簿管理のMCPサーバー。
 * ローカルSQLiteデータベースを使用し、stdio トランスポートで動作する。
 *
 * 提供ツール:
 * - 仕訳CRUD（eshiwake_create_journal, eshiwake_list_journals, etc.）
 * - 勘定科目管理（eshiwake_list_accounts, eshiwake_create_account, etc.）
 * - 取引先管理（eshiwake_list_vendors, eshiwake_create_vendor, etc.）
 * - 帳簿レポート（eshiwake_trial_balance, eshiwake_profit_loss, etc.）
 */

import { getDatabase, seedDefaultAccounts } from '@e-shiwake/db';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAccountTools } from './tools/account-tools.js';
import { registerJournalTools } from './tools/journal-tools.js';
import { registerReportTools } from './tools/report-tools.js';
import { registerVendorTools } from './tools/vendor-tools.js';

// ==================== サーバー初期化 ====================

const server = new McpServer({
	name: 'e-shiwake-mcp-server',
	version: '0.1.0'
});

// ==================== ツール登録 ====================

registerJournalTools(server);
registerAccountTools(server);
registerVendorTools(server);
registerReportTools(server);

// ==================== メイン ====================

async function main(): Promise<void> {
	// DB初期化（環境変数 E_SHIWAKE_DB_PATH でパス指定可能）
	const dbPath = process.env.E_SHIWAKE_DB_PATH ?? 'e-shiwake.db';
	getDatabase(dbPath);

	// 初期勘定科目データを投入
	seedDefaultAccounts();

	// stdio トランスポートで起動
	const transport = new StdioServerTransport();
	await server.connect(transport);

	// stderr に起動メッセージ（stdoutはMCPプロトコル用）
	console.error(`e-shiwake MCP server started (DB: ${dbPath})`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
