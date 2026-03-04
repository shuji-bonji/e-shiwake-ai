/**
 * 取引先関連のMCPツール定義
 */

import {
	deleteVendor,
	getAllVendors,
	getVendorById,
	saveVendor,
	searchVendorsByName,
	updateVendor
} from '@e-shiwake/db';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ==================== Zod スキーマ ====================

const SearchVendorsSchema = z
	.object({
		query: z.string().optional().describe('取引先名で検索（省略で全件取得）')
	})
	.strict();

const VendorIdSchema = z
	.object({
		id: z.string().describe('取引先ID（UUID）')
	})
	.strict();

const CreateVendorSchema = z
	.object({
		name: z.string().min(1).max(100).describe('取引先名'),
		address: z.string().optional().describe('住所'),
		contactName: z.string().optional().describe('担当者名'),
		email: z.string().email().optional().describe('メールアドレス'),
		phone: z.string().optional().describe('電話番号'),
		paymentTerms: z.string().optional().describe('支払条件'),
		note: z.string().optional().describe('備考')
	})
	.strict();

const UpdateVendorSchema = z
	.object({
		id: z.string().describe('更新対象の取引先ID'),
		name: z.string().min(1).max(100).optional().describe('取引先名'),
		address: z.string().optional().describe('住所'),
		contactName: z.string().optional().describe('担当者名'),
		email: z.string().email().optional().describe('メールアドレス'),
		phone: z.string().optional().describe('電話番号'),
		paymentTerms: z.string().optional().describe('支払条件'),
		note: z.string().optional().describe('備考')
	})
	.strict();

// ==================== ツール登録 ====================

export function registerVendorTools(server: McpServer): void {
	// --- 取引先一覧/検索 ---
	server.registerTool(
		'eshiwake_list_vendors',
		{
			title: '取引先一覧・検索',
			description: `取引先の一覧を取得する。名前で部分一致検索可能。

Args:
  - query (string, optional): 取引先名で検索（省略で全件取得）

Returns:
  取引先の一覧（ID、名前、住所、担当者、メール、電話）`,
			inputSchema: SearchVendorsSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const vendors = params.query ? searchVendorsByName(params.query) : getAllVendors();

				if (vendors.length === 0) {
					const msg = params.query
						? `"${params.query}" に一致する取引先はありません。`
						: '取引先が登録されていません。';
					return { content: [{ type: 'text' as const, text: msg }] };
				}

				const lines = [
					`# 取引先一覧（${vendors.length}件）`,
					'',
					'| 名前 | 住所 | 担当者 | メール | 電話 |',
					'|---|---|---|---|---|'
				];

				for (const v of vendors) {
					lines.push(
						`| ${v.name} | ${v.address ?? '-'} | ${v.contactName ?? '-'} | ${v.email ?? '-'} | ${v.phone ?? '-'} |`
					);
				}

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

	// --- 取引先詳細 ---
	server.registerTool(
		'eshiwake_get_vendor',
		{
			title: '取引先詳細',
			description: `取引先IDを指定して詳細を取得する。

Args:
  - id (string): 取引先ID

Returns:
  取引先の全情報`,
			inputSchema: VendorIdSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const vendor = getVendorById(params.id);
				if (!vendor) {
					return {
						content: [
							{ type: 'text' as const, text: `取引先ID "${params.id}" が見つかりませんでした。` }
						]
					};
				}

				const lines = [
					`## ${vendor.name}`,
					'',
					'| 項目 | 値 |',
					'|---|---|',
					`| ID | \`${vendor.id}\` |`,
					`| 名前 | ${vendor.name} |`,
					`| 住所 | ${vendor.address ?? '未設定'} |`,
					`| 担当者 | ${vendor.contactName ?? '未設定'} |`,
					`| メール | ${vendor.email ?? '未設定'} |`,
					`| 電話 | ${vendor.phone ?? '未設定'} |`,
					`| 支払条件 | ${vendor.paymentTerms ?? '未設定'} |`,
					`| 備考 | ${vendor.note ?? '-'} |`
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

	// --- 取引先作成 ---
	server.registerTool(
		'eshiwake_create_vendor',
		{
			title: '取引先作成',
			description: `新しい取引先を登録する。同名の取引先が存在する場合は既存のものを返す。

Args:
  - name (string): 取引先名
  - address, contactName, email, phone, paymentTerms, note: 任意フィールド

Returns:
  作成（または既存）の取引先情報`,
			inputSchema: CreateVendorSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const vendorId = saveVendor(params.name);

				// Update with additional fields if provided
				if (
					params.address ||
					params.contactName ||
					params.email ||
					params.phone ||
					params.paymentTerms ||
					params.note
				) {
					updateVendor(vendorId, {
						address: params.address,
						contactName: params.contactName,
						email: params.email,
						phone: params.phone,
						paymentTerms: params.paymentTerms,
						note: params.note
					});
				}

				const _vendor = getVendorById(vendorId);

				return {
					content: [
						{
							type: 'text' as const,
							text: `取引先を登録しました: ${params.name}（ID: ${vendorId}）`
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

	// --- 取引先更新 ---
	server.registerTool(
		'eshiwake_update_vendor',
		{
			title: '取引先更新',
			description: `既存の取引先情報を更新する。指定したフィールドのみ更新される。

Args:
  - id (string): 更新対象の取引先ID
  - name, address, contactName, email, phone, paymentTerms, note: 更新フィールド

Returns:
  更新結果のメッセージ`,
			inputSchema: UpdateVendorSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getVendorById(params.id);
				if (!existing) {
					return {
						content: [
							{ type: 'text' as const, text: `取引先ID "${params.id}" が見つかりませんでした。` }
						]
					};
				}

				updateVendor(params.id, {
					name: params.name ?? existing.name,
					address: params.address ?? existing.address,
					contactName: params.contactName ?? existing.contactName,
					email: params.email ?? existing.email,
					phone: params.phone ?? existing.phone,
					paymentTerms: params.paymentTerms ?? existing.paymentTerms,
					note: params.note ?? existing.note
				});

				return {
					content: [
						{
							type: 'text' as const,
							text: `取引先を更新しました: ${params.name ?? existing.name}`
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

	// --- 取引先削除 ---
	server.registerTool(
		'eshiwake_delete_vendor',
		{
			title: '取引先削除',
			description: `取引先を削除する。

Args:
  - id (string): 削除対象の取引先ID

Returns:
  削除結果のメッセージ`,
			inputSchema: VendorIdSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getVendorById(params.id);
				if (!existing) {
					return {
						content: [
							{ type: 'text' as const, text: `取引先ID "${params.id}" が見つかりませんでした。` }
						]
					};
				}

				deleteVendor(params.id);
				return {
					content: [
						{
							type: 'text' as const,
							text: `取引先を削除しました: ${existing.name}`
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
