/**
 * 仕訳関連のMCPツール定義
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
	getJournalsByYear,
	getAllJournals,
	getAvailableYears,
	getJournalById,
	addJournal,
	updateJournal,
	deleteJournal,
	deleteYearData
} from '@e-shiwake/db';
import type { TaxCategory, JournalLine } from '@e-shiwake/core';

// ==================== Zod スキーマ ====================

const JournalLineSchema = z.object({
	type: z.enum(['debit', 'credit']).describe('借方(debit) or 貸方(credit)'),
	accountCode: z.string().describe('勘定科目コード（4桁, 例: "5001"）'),
	amount: z.number().int().min(1).describe('金額（正の整数）'),
	taxCategory: z.enum([
		'sales_10', 'sales_8', 'purchase_10', 'purchase_8',
		'exempt', 'out_of_scope', 'na'
	]).optional().describe('消費税区分'),
	memo: z.string().optional().describe('行メモ（按分理由など）')
});

const CreateJournalSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください').describe('取引日（YYYY-MM-DD）'),
	lines: z.array(JournalLineSchema).min(2).describe('仕訳明細行（借方・貸方それぞれ1行以上）'),
	vendor: z.string().min(1).describe('取引先名'),
	description: z.string().min(1).describe('摘要'),
	evidenceStatus: z.enum(['none', 'paper', 'digital']).default('none').describe('証跡ステータス')
}).strict();

const UpdateJournalSchema = z.object({
	id: z.string().describe('仕訳ID（UUID）'),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('取引日（YYYY-MM-DD）'),
	lines: z.array(JournalLineSchema).min(2).optional().describe('仕訳明細行'),
	vendor: z.string().min(1).optional().describe('取引先名'),
	description: z.string().min(1).optional().describe('摘要'),
	evidenceStatus: z.enum(['none', 'paper', 'digital']).optional().describe('証跡ステータス')
}).strict();

const FiscalYearSchema = z.object({
	fiscalYear: z.number().int().min(2000).max(2100).describe('会計年度（例: 2025）')
}).strict();

const JournalIdSchema = z.object({
	id: z.string().describe('仕訳ID（UUID）')
}).strict();

// ==================== ヘルパー ====================

function formatJournalMarkdown(journal: ReturnType<typeof getJournalById>): string {
	if (!journal) return '仕訳が見つかりませんでした。';

	const lines: string[] = [
		`## 仕訳: ${journal.description}`,
		'',
		`| 項目 | 値 |`,
		`|---|---|`,
		`| ID | \`${journal.id}\` |`,
		`| 日付 | ${journal.date} |`,
		`| 取引先 | ${journal.vendor} |`,
		`| 摘要 | ${journal.description} |`,
		`| 証跡 | ${journal.evidenceStatus} |`,
		'',
		'### 明細',
		'',
		'| 借方/貸方 | 科目コード | 金額 | 消費税区分 | メモ |',
		'|---|---|---:|---|---|'
	];

	for (const line of journal.lines) {
		const typeLabel = line.type === 'debit' ? '借方' : '貸方';
		lines.push(`| ${typeLabel} | ${line.accountCode} | ${line.amount.toLocaleString()} | ${line.taxCategory ?? '-'} | ${line.memo ?? '-'} |`);
	}

	return lines.join('\n');
}

function validateDebitCreditBalance(lines: Array<{ type: string; amount: number }>): string | null {
	const debitSum = lines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
	const creditSum = lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
	if (debitSum !== creditSum) {
		return `借方合計(${debitSum})と貸方合計(${creditSum})が一致しません。`;
	}
	return null;
}

// ==================== ツール登録 ====================

export function registerJournalTools(server: McpServer): void {

	// --- 年度一覧取得 ---
	server.registerTool(
		'eshiwake_list_fiscal_years',
		{
			title: '年度一覧',
			description: `仕訳が存在する会計年度の一覧を取得する。
年度選択や、データの存在確認に使用する。

Returns:
  年度の配列 (例: [2023, 2024, 2025])`,
			inputSchema: {},
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => {
			try {
				const years = getAvailableYears();
				return {
					content: [{
						type: 'text' as const,
						text: years.length > 0
							? `利用可能な年度: ${years.join(', ')}`
							: '仕訳データがまだありません。'
					}]
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 年度別仕訳一覧 ---
	server.registerTool(
		'eshiwake_list_journals',
		{
			title: '仕訳一覧取得',
			description: `指定した会計年度の仕訳一覧を取得する。

Args:
  - fiscalYear (number): 会計年度（例: 2025）

Returns:
  仕訳の一覧（日付、摘要、取引先、借方/貸方明細）`,
			inputSchema: FiscalYearSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const journals = getJournalsByYear(params.fiscalYear);
				if (journals.length === 0) {
					return { content: [{ type: 'text' as const, text: `${params.fiscalYear}年度の仕訳はありません。` }] };
				}

				const lines = [
					`# ${params.fiscalYear}年度 仕訳一覧（${journals.length}件）`,
					'',
					'| 日付 | 摘要 | 取引先 | 借方計 | 貸方計 | 証跡 |',
					'|---|---|---|---:|---:|---|'
				];

				for (const j of journals) {
					const debitSum = j.lines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
					const creditSum = j.lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
					lines.push(`| ${j.date} | ${j.description} | ${j.vendor} | ${debitSum.toLocaleString()} | ${creditSum.toLocaleString()} | ${j.evidenceStatus} |`);
				}

				return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 仕訳詳細取得 ---
	server.registerTool(
		'eshiwake_get_journal',
		{
			title: '仕訳詳細',
			description: `仕訳IDを指定して仕訳の詳細を取得する。

Args:
  - id (string): 仕訳ID（UUID）

Returns:
  仕訳の全情報（日付、摘要、取引先、明細行、証跡ステータス等）`,
			inputSchema: JournalIdSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const journal = getJournalById(params.id);
				if (!journal) {
					return { content: [{ type: 'text' as const, text: `仕訳ID "${params.id}" が見つかりませんでした。` }] };
				}
				return { content: [{ type: 'text' as const, text: formatJournalMarkdown(journal) }] };
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 仕訳作成 ---
	server.registerTool(
		'eshiwake_create_journal',
		{
			title: '仕訳作成',
			description: `新しい仕訳を作成する。複合仕訳（複数行の借方/貸方）に対応。
借方合計と貸方合計は必ず一致させること。

Args:
  - date (string): 取引日（YYYY-MM-DD）
  - lines (array): 仕訳明細行（各行に type, accountCode, amount を含む）
  - vendor (string): 取引先名
  - description (string): 摘要
  - evidenceStatus (string): 証跡ステータス（none/paper/digital、デフォルト: none）

Returns:
  作成された仕訳の詳細

Examples:
  - 交通費の記帳: date="2025-03-01", vendor="JR東日本", description="電車代",
    lines=[{type:"debit", accountCode:"5005", amount:1200}, {type:"credit", accountCode:"1001", amount:1200}]`,
			inputSchema: CreateJournalSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				// 貸借バランスチェック
				const balanceError = validateDebitCreditBalance(params.lines);
				if (balanceError) {
					return { content: [{ type: 'text' as const, text: `バリデーションエラー: ${balanceError}` }] };
				}

				const journalId = addJournal({
					date: params.date,
					lines: params.lines.map(l => ({
						...l,
						taxCategory: l.taxCategory as TaxCategory | undefined
					})) as JournalLine[],
					vendor: params.vendor,
					description: params.description,
					evidenceStatus: params.evidenceStatus,
					attachments: []
				});

				const journal = getJournalById(journalId);

				return {
					content: [{
						type: 'text' as const,
						text: `仕訳を作成しました。\n\n${formatJournalMarkdown(journal)}`
					}]
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 仕訳更新 ---
	server.registerTool(
		'eshiwake_update_journal',
		{
			title: '仕訳更新',
			description: `既存の仕訳を更新する。指定したフィールドのみ更新される。
linesを更新する場合は借方合計と貸方合計を一致させること。

Args:
  - id (string): 更新対象の仕訳ID
  - date, lines, vendor, description, evidenceStatus: 更新するフィールド（省略可）

Returns:
  更新後の仕訳の詳細`,
			inputSchema: UpdateJournalSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getJournalById(params.id);
				if (!existing) {
					return { content: [{ type: 'text' as const, text: `仕訳ID "${params.id}" が見つかりませんでした。` }] };
				}

				const newLines = params.lines
					? params.lines.map(l => ({ ...l, taxCategory: l.taxCategory as TaxCategory | undefined })) as JournalLine[]
					: existing.lines;

				// 貸借バランスチェック
				if (params.lines) {
					const balanceError = validateDebitCreditBalance(params.lines);
					if (balanceError) {
						return { content: [{ type: 'text' as const, text: `バリデーションエラー: ${balanceError}` }] };
					}
				}

				updateJournal(params.id, {
					date: params.date ?? existing.date,
					lines: newLines,
					vendor: params.vendor ?? existing.vendor,
					description: params.description ?? existing.description,
					evidenceStatus: params.evidenceStatus ?? existing.evidenceStatus,
					attachments: existing.attachments
				});

				const updated = getJournalById(params.id);

				return {
					content: [{
						type: 'text' as const,
						text: `仕訳を更新しました。\n\n${formatJournalMarkdown(updated)}`
					}]
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 仕訳削除 ---
	server.registerTool(
		'eshiwake_delete_journal',
		{
			title: '仕訳削除',
			description: `指定した仕訳を削除する。この操作は元に戻せない。

Args:
  - id (string): 削除対象の仕訳ID

Returns:
  削除結果のメッセージ`,
			inputSchema: JournalIdSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const existing = getJournalById(params.id);
				if (!existing) {
					return { content: [{ type: 'text' as const, text: `仕訳ID "${params.id}" が見つかりませんでした。` }] };
				}

				deleteJournal(params.id);
				return {
					content: [{
						type: 'text' as const,
						text: `仕訳を削除しました: ${existing.date} ${existing.description} (${existing.vendor})`
					}]
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);

	// --- 年度データ削除 ---
	server.registerTool(
		'eshiwake_delete_year_data',
		{
			title: '年度データ削除',
			description: `指定した会計年度の仕訳を全て削除する。この操作は元に戻せない。
エクスポート後の容量削減に使用する。

Args:
  - fiscalYear (number): 削除対象の会計年度

Returns:
  削除件数`,
			inputSchema: FiscalYearSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async (params) => {
			try {
				const result = deleteYearData(params.fiscalYear);
				return {
					content: [{
						type: 'text' as const,
						text: `${params.fiscalYear}年度のデータを削除しました。仕訳: ${result.journalCount}件、証憑: ${result.attachmentCount}件`
					}]
				};
			} catch (error) {
				return { content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : String(error)}` }] };
			}
		}
	);
}
