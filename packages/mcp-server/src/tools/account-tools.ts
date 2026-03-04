/**
 * 勘定科目関連のMCPツール定義
 */

import type { AccountType, TaxCategory } from '@e-shiwake/core';
import {
	addAccount,
	deleteAccount,
	generateNextCode,
	getAccountByCode,
	getAccountsByType,
	getAllAccounts,
	isAccountInUse,
	updateAccount
} from '@e-shiwake/db';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ==================== Zod スキーマ ====================

const AccountTypeEnum = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);

const ListAccountsSchema = z
	.object({
		type: AccountTypeEnum.optional().describe('勘定科目タイプでフィルタ（省略で全件取得）')
	})
	.strict();

const AccountCodeSchema = z
	.object({
		code: z
			.string()
			.regex(/^\d{4}$/, '4桁の数字で入力してください')
			.describe('勘定科目コード（4桁）')
	})
	.strict();

const CreateAccountSchema = z
	.object({
		type: AccountTypeEnum.describe('勘定科目タイプ（asset/liability/equity/revenue/expense）'),
		name: z.string().min(1).max(50).describe('勘定科目名'),
		defaultTaxCategory: z
			.enum(['sales_10', 'sales_8', 'purchase_10', 'purchase_8', 'exempt', 'out_of_scope', 'na'])
			.optional()
			.describe('デフォルト消費税区分')
	})
	.strict();

const UpdateAccountSchema = z
	.object({
		code: z
			.string()
			.regex(/^\d{4}$/)
			.describe('更新対象の勘定科目コード'),
		name: z.string().min(1).max(50).optional().describe('勘定科目名'),
		defaultTaxCategory: z
			.enum(['sales_10', 'sales_8', 'purchase_10', 'purchase_8', 'exempt', 'out_of_scope', 'na'])
			.optional()
			.describe('デフォルト消費税区分'),
		businessRatioEnabled: z.boolean().optional().describe('家事按分を有効にするか'),
		defaultBusinessRatio: z.number().min(0).max(100).optional().describe('デフォルト按分率（%）')
	})
	.strict();

// ==================== ヘルパー ====================

const TYPE_LABELS: Record<string, string> = {
	asset: '資産',
	liability: '負債',
	equity: '純資産',
	revenue: '収益',
	expense: '費用'
};

// ==================== ツール登録 ====================

export function registerAccountTools(server: McpServer): void {
	// --- 勘定科目一覧 ---
	server.registerTool(
		'eshiwake_list_accounts',
		{
			title: '勘定科目一覧',
			description: `勘定科目の一覧を取得する。タイプ別にフィルタ可能。
仕訳入力時に利用可能な科目コードを確認する際に使用。

Args:
  - type (string, optional): フィルタ（asset/liability/equity/revenue/expense）

Returns:
  勘定科目の一覧（コード、名前、タイプ、システム/ユーザー区分）`,
			inputSchema: ListAccountsSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const accounts = params.type
					? getAccountsByType(params.type as AccountType)
					: getAllAccounts();

				if (accounts.length === 0) {
					return { content: [{ type: 'text' as const, text: '勘定科目がありません。' }] };
				}

				const title = params.type
					? `# 勘定科目一覧（${TYPE_LABELS[params.type]}）`
					: '# 勘定科目一覧';

				const lines = [
					title,
					'',
					'| コード | 名前 | タイプ | 区分 | デフォルト税区分 |',
					'|---|---|---|---|---|'
				];

				for (const a of accounts) {
					lines.push(
						`| ${a.code} | ${a.name} | ${TYPE_LABELS[a.type] ?? a.type} | ${a.isSystem ? 'システム' : 'カスタム'} | ${a.defaultTaxCategory ?? '-'} |`
					);
				}

				lines.push('', `計 ${accounts.length} 科目`);

				return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `エラー: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);

	// --- 勘定科目詳細 ---
	server.registerTool(
		'eshiwake_get_account',
		{
			title: '勘定科目詳細',
			description: `勘定科目コードを指定して詳細を取得する。

Args:
  - code (string): 勘定科目コード（4桁）

Returns:
  勘定科目の全情報`,
			inputSchema: AccountCodeSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const account = getAccountByCode(params.code);
				if (!account) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `科目コード "${params.code}" が見つかりませんでした。`
							}
						]
					};
				}

				const inUse = isAccountInUse(params.code);
				const lines = [
					`## ${account.name}（${account.code}）`,
					'',
					`| 項目 | 値 |`,
					`|---|---|`,
					`| コード | ${account.code} |`,
					`| 名前 | ${account.name} |`,
					`| タイプ | ${TYPE_LABELS[account.type]} |`,
					`| 区分 | ${account.isSystem ? 'システム' : 'カスタム'} |`,
					`| デフォルト税区分 | ${account.defaultTaxCategory ?? '未設定'} |`,
					`| 按分有効 | ${account.businessRatioEnabled ? 'はい' : 'いいえ'} |`,
					`| デフォルト按分率 | ${account.defaultBusinessRatio != null ? `${account.defaultBusinessRatio}%` : '未設定'} |`,
					`| 使用中 | ${inUse ? 'はい（削除不可）' : 'いいえ'} |`
				];

				return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `エラー: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);

	// --- 勘定科目追加 ---
	server.registerTool(
		'eshiwake_create_account',
		{
			title: '勘定科目追加',
			description: `新しいユーザー定義の勘定科目を追加する。
科目コードは自動採番される（例: 費用なら5101〜）。

Args:
  - type (string): 科目タイプ（asset/liability/equity/revenue/expense）
  - name (string): 科目名
  - defaultTaxCategory (string, optional): デフォルト消費税区分

Returns:
  作成された勘定科目の詳細`,
			inputSchema: CreateAccountSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const code = generateNextCode(params.type as AccountType);
				const _accountId = addAccount({
					code,
					name: params.name,
					type: params.type as AccountType,
					defaultTaxCategory: params.defaultTaxCategory as TaxCategory | undefined
				});

				const _account = getAccountByCode(code);

				return {
					content: [
						{
							type: 'text' as const,
							text: `勘定科目を追加しました: ${code} ${params.name}（${TYPE_LABELS[params.type]}）`
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `エラー: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);

	// --- 勘定科目更新 ---
	server.registerTool(
		'eshiwake_update_account',
		{
			title: '勘定科目更新',
			description: `既存の勘定科目を更新する。
システム科目の場合は按分設定とデフォルト消費税区分のみ変更可能。

Args:
  - code (string): 更新対象の科目コード
  - name, defaultTaxCategory, businessRatioEnabled, defaultBusinessRatio: 更新フィールド

Returns:
  更新結果のメッセージ`,
			inputSchema: UpdateAccountSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getAccountByCode(params.code);
				if (!existing) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `科目コード "${params.code}" が見つかりませんでした。`
							}
						]
					};
				}

				updateAccount(params.code, {
					name: params.name,
					defaultTaxCategory: params.defaultTaxCategory as TaxCategory | undefined,
					businessRatioEnabled: params.businessRatioEnabled,
					defaultBusinessRatio: params.defaultBusinessRatio
				});

				return {
					content: [
						{
							type: 'text' as const,
							text: `勘定科目を更新しました: ${params.code} ${params.name ?? existing.name}`
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `エラー: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);

	// --- 勘定科目削除 ---
	server.registerTool(
		'eshiwake_delete_account',
		{
			title: '勘定科目削除',
			description: `ユーザー定義の勘定科目を削除する。
システム科目（isSystem=true）は削除不可。仕訳で使用中の科目も削除不可。

Args:
  - code (string): 削除対象の科目コード

Returns:
  削除結果のメッセージ`,
			inputSchema: AccountCodeSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getAccountByCode(params.code);
				if (!existing) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `科目コード "${params.code}" が見つかりませんでした。`
							}
						]
					};
				}

				if (existing.isSystem) {
					return {
						content: [
							{ type: 'text' as const, text: `システム科目 "${existing.name}" は削除できません。` }
						]
					};
				}

				if (isAccountInUse(params.code)) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `科目 "${existing.name}" は仕訳で使用中のため削除できません。`
							}
						]
					};
				}

				deleteAccount(params.code);
				return {
					content: [
						{
							type: 'text' as const,
							text: `勘定科目を削除しました: ${params.code} ${existing.name}`
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `エラー: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);
}
