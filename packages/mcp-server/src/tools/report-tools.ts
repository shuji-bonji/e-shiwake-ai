/**
 * 帳簿・レポート関連のMCPツール定義
 * 試算表、損益計算書、貸借対照表、消費税集計
 */

import {
	calculateTaxSummary,
	formatAmount,
	generateBalanceSheet,
	generateProfitLoss,
	generateTrialBalance,
	groupTrialBalance
} from '@e-shiwake/core';
import { exportYearData, getAllAccounts, getJournalsByYear } from '@e-shiwake/db';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ==================== Zod スキーマ ====================

const FiscalYearSchema = z
	.object({
		fiscalYear: z.number().int().min(2000).max(2100).describe('会計年度（例: 2025）')
	})
	.strict();

// ==================== ツール登録 ====================

export function registerReportTools(server: McpServer): void {
	// --- 試算表 ---
	server.registerTool(
		'eshiwake_trial_balance',
		{
			title: '試算表',
			description: `指定した会計年度の試算表（合計残高試算表）を生成する。
勘定科目タイプ別にグループ化し、借方/貸方の合計と残高を表示。
貸借一致の確認にも使用できる。

Args:
  - fiscalYear (number): 会計年度

Returns:
  タイプ別グループの試算表（借方合計、貸方合計、借方残高、貸方残高）`,
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
				const accounts = getAllAccounts();

				if (journals.length === 0) {
					return {
						content: [
							{ type: 'text' as const, text: `${params.fiscalYear}年度の仕訳がありません。` }
						]
					};
				}

				const data = generateTrialBalance(journals, accounts);
				const grouped = groupTrialBalance(data);

				const lines = [
					`# 試算表 ${params.fiscalYear}年度`,
					'',
					`貸借一致: ${data.isBalanced ? '**OK**' : '**不一致**'}`,
					''
				];

				for (const group of grouped.groups) {
					lines.push(`## ${group.label}`);
					lines.push('');
					lines.push('| 科目 | 借方合計 | 貸方合計 | 借方残高 | 貸方残高 |');
					lines.push('|---|---:|---:|---:|---:|');

					for (const row of group.rows) {
						lines.push(
							`| ${row.accountName} | ${formatAmount(row.debitTotal)} | ${formatAmount(row.creditTotal)} | ${formatAmount(row.debitBalance)} | ${formatAmount(row.creditBalance)} |`
						);
					}

					lines.push(
						`| **小計** | **${formatAmount(group.subtotalDebit)}** | **${formatAmount(group.subtotalCredit)}** | **${formatAmount(group.subtotalDebitBalance)}** | **${formatAmount(group.subtotalCreditBalance)}** |`
					);
					lines.push('');
				}

				lines.push('## 合計');
				lines.push('');
				lines.push('| 項目 | 借方 | 貸方 |');
				lines.push('|---|---:|---:|');
				lines.push(
					`| 合計 | ${formatAmount(data.totalDebit)} | ${formatAmount(data.totalCredit)} |`
				);
				lines.push(
					`| 残高 | ${formatAmount(data.totalDebitBalance)} | ${formatAmount(data.totalCreditBalance)} |`
				);

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

	// --- 損益計算書 ---
	server.registerTool(
		'eshiwake_profit_loss',
		{
			title: '損益計算書',
			description: `指定した会計年度の損益計算書（P/L）を生成する。
収益と費用の各科目を集計し、当期純利益を計算する。

Args:
  - fiscalYear (number): 会計年度

Returns:
  損益計算書（収益明細、費用明細、当期純利益）`,
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
				const accounts = getAllAccounts();

				if (journals.length === 0) {
					return {
						content: [
							{ type: 'text' as const, text: `${params.fiscalYear}年度の仕訳がありません。` }
						]
					};
				}

				const pl = generateProfitLoss(journals, accounts, params.fiscalYear);

				const lines = [`# 損益計算書 ${params.fiscalYear}年度`, ''];

				// 収益
				lines.push('## 収益');
				lines.push('');
				lines.push('| 科目 | 金額 |');
				lines.push('|---|---:|');
				for (const item of pl.salesRevenue) {
					if (item.amount > 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				for (const item of pl.otherRevenue) {
					if (item.amount > 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				lines.push(`| **収益合計** | **${pl.totalRevenue.toLocaleString()}** |`);
				lines.push('');

				// 費用
				lines.push('## 費用');
				lines.push('');
				lines.push('| 科目 | 金額 |');
				lines.push('|---|---:|');
				for (const item of pl.costOfSales) {
					if (item.amount > 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				for (const item of pl.operatingExpenses) {
					if (item.amount > 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				lines.push(`| **費用合計** | **${pl.totalExpenses.toLocaleString()}** |`);
				lines.push('');

				// 利益
				lines.push('## 利益');
				lines.push('');
				lines.push(`**当期純利益: ${pl.netIncome.toLocaleString()}円**`);

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

	// --- 貸借対照表 ---
	server.registerTool(
		'eshiwake_balance_sheet',
		{
			title: '貸借対照表',
			description: `指定した会計年度の貸借対照表（B/S）を生成する。
資産、負債、純資産を集計し、貸借一致を確認する。

Args:
  - fiscalYear (number): 会計年度

Returns:
  貸借対照表（資産明細、負債明細、純資産明細、貸借一致チェック）`,
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
				const accounts = getAllAccounts();

				if (journals.length === 0) {
					return {
						content: [
							{ type: 'text' as const, text: `${params.fiscalYear}年度の仕訳がありません。` }
						]
					};
				}

				const bs = generateBalanceSheet(journals, accounts, params.fiscalYear);

				const isBalanced = bs.totalAssets === bs.totalLiabilitiesAndEquity;
				const lines = [
					`# 貸借対照表 ${params.fiscalYear}年度`,
					'',
					`貸借一致: ${isBalanced ? '**OK**' : '**不一致**'}`,
					''
				];

				// 資産
				lines.push('## 資産の部');
				lines.push('');
				lines.push('| 科目 | 金額 |');
				lines.push('|---|---:|');
				for (const item of bs.currentAssets) {
					if (item.amount !== 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				for (const item of bs.fixedAssets) {
					if (item.amount !== 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				lines.push(`| **資産合計** | **${bs.totalAssets.toLocaleString()}** |`);
				lines.push('');

				// 負債
				lines.push('## 負債の部');
				lines.push('');
				lines.push('| 科目 | 金額 |');
				lines.push('|---|---:|');
				for (const item of bs.currentLiabilities) {
					if (item.amount !== 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				for (const item of bs.fixedLiabilities) {
					if (item.amount !== 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				lines.push(`| **負債合計** | **${bs.totalLiabilities.toLocaleString()}** |`);
				lines.push('');

				// 純資産
				lines.push('## 純資産の部');
				lines.push('');
				lines.push(`| 項目 | 金額 |`);
				lines.push(`|---|---:|`);
				for (const item of bs.equity) {
					if (item.amount !== 0) {
						lines.push(`| ${item.accountName} | ${item.amount.toLocaleString()} |`);
					}
				}
				lines.push(`| 純資産合計 | ${bs.totalEquity.toLocaleString()} |`);
				lines.push('');

				lines.push(`**負債・純資産合計: ${bs.totalLiabilitiesAndEquity.toLocaleString()}円**`);

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

	// --- 消費税集計 ---
	server.registerTool(
		'eshiwake_tax_summary',
		{
			title: '消費税集計',
			description: `指定した会計年度の消費税集計を行う。
課税売上/仕入を税率別に集計し、仕入税額控除と納付税額を計算する。

Args:
  - fiscalYear (number): 会計年度

Returns:
  消費税集計（課税売上、課税仕入、仕入税額控除、納付税額）`,
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
					return {
						content: [
							{ type: 'text' as const, text: `${params.fiscalYear}年度の仕訳がありません。` }
						]
					};
				}

				// Flatten all journal lines
				const allLines = journals.flatMap((j) => j.lines);
				const tax = calculateTaxSummary(allLines);

				const lines = [
					`# 消費税集計 ${params.fiscalYear}年度`,
					'',
					'## 課税売上',
					'',
					'| 項目 | 金額 |',
					'|---|---:|',
					`| 10%対象（税抜） | ${tax.sales10TaxExcluded.toLocaleString()} |`,
					`| 10%消費税 | ${tax.sales10Tax.toLocaleString()} |`,
					`| 8%対象（税抜） | ${tax.sales8TaxExcluded.toLocaleString()} |`,
					`| 8%消費税 | ${tax.sales8Tax.toLocaleString()} |`,
					`| **課税売上合計** | **${(tax.sales10TaxExcluded + tax.sales8TaxExcluded).toLocaleString()}** |`,
					`| **売上消費税合計** | **${(tax.sales10Tax + tax.sales8Tax).toLocaleString()}** |`,
					'',
					'## 課税仕入',
					'',
					'| 項目 | 金額 |',
					'|---|---:|',
					`| 10%対象（税抜） | ${tax.purchase10TaxExcluded.toLocaleString()} |`,
					`| 10%消費税 | ${tax.purchase10Tax.toLocaleString()} |`,
					`| 8%対象（税抜） | ${tax.purchase8TaxExcluded.toLocaleString()} |`,
					`| 8%消費税 | ${tax.purchase8Tax.toLocaleString()} |`,
					`| **課税仕入合計** | **${(tax.purchase10TaxExcluded + tax.purchase8TaxExcluded).toLocaleString()}** |`,
					`| **仕入消費税合計** | **${(tax.purchase10Tax + tax.purchase8Tax).toLocaleString()}** |`,
					'',
					'## 納付税額',
					'',
					`**納付すべき消費税額: ${tax.netTax.toLocaleString()}円**`
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

	// --- データエクスポート ---
	server.registerTool(
		'eshiwake_export_data',
		{
			title: 'データエクスポート',
			description: `指定した会計年度のデータをJSON形式でエクスポートする。
仕訳、勘定科目、取引先を含む完全なバックアップ用データ。

Args:
  - fiscalYear (number): エクスポート対象の会計年度

Returns:
  ExportDataDTO形式のJSON文字列`,
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
				const data = exportYearData(params.fiscalYear);
				const summary = [
					`# ${params.fiscalYear}年度 エクスポートデータ`,
					'',
					`| 項目 | 件数 |`,
					`|---|---:|`,
					`| 仕訳 | ${data.journals.length} |`,
					`| 勘定科目 | ${data.accounts.length} |`,
					`| 取引先 | ${data.vendors.length} |`,
					'',
					'```json',
					JSON.stringify(data, null, 2).slice(0, 10000),
					data.journals.length > 50 ? '\n... (truncated)' : '',
					'```'
				];

				return { content: [{ type: 'text' as const, text: summary.join('\n') }] };
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
