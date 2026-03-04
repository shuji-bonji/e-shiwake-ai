# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

#### @e-shiwake/core v0.1.0
- 型定義: `JournalEntry`, `JournalLine`, `Account`, `Vendor`, `Attachment`, `Invoice` 等
- 勘定科目定数: システム初期勘定科目（資産・負債・純資産・収益・費用）
- 試算表生成（`generateTrialBalance`）: 合計残高試算表の計算
- 損益計算書生成（`generateProfitLoss`）: 売上総利益・営業利益・当期純利益の算出
- 貸借対照表生成（`generateBalanceSheet`）: 資産・負債・純資産の集計、貸借一致チェック
- 消費税集計（`generateTaxSummary`）: 課税売上/仕入・納付税額計算
- 消費税ユーティリティ（`tax.ts`）: 税込→税抜変換、税額計算
- 勘定科目コード自動採番（`generateNextCode`）: カテゴリ別の連番管理
- 仕訳バリデーション: 借方・貸方合計の一致チェック
- テスト: 163件（Vitest）

#### @e-shiwake/db v0.1.0
- SQLite データベース層（better-sqlite3、同期API）
- DB接続管理: シングルトンパターン、インメモリDB対応
- スキーマ定義: journals, journal_lines, accounts, vendors テーブル
- 仕訳リポジトリ: CRUD、年度別取得、年度一覧、全年度横断検索
- 勘定科目リポジトリ: CRUD、タイプ別フィルタ、使用中チェック、消費税区分一括更新
- 取引先リポジトリ: CRUD、名前検索、文字列/オブジェクト両対応の保存
- 初期データ投入（seed）: システム勘定科目の自動登録
- エクスポート/インポート: JSON形式でのデータ入出力
- テスト: 126件（Vitest）

#### @e-shiwake/mcp-server v0.1.0
- MCP サーバー実装（`@modelcontextprotocol/sdk` v1.x、stdio トランスポート）
- 仕訳ツール: `eshiwake_list_fiscal_years`, `eshiwake_list_journals`, `eshiwake_get_journal`, `eshiwake_create_journal`, `eshiwake_update_journal`, `eshiwake_delete_journal`, `eshiwake_delete_year_data`
- 勘定科目ツール: `eshiwake_list_accounts`, `eshiwake_get_account`, `eshiwake_create_account`, `eshiwake_update_account`, `eshiwake_delete_account`
- 取引先ツール: `eshiwake_list_vendors`, `eshiwake_get_vendor`, `eshiwake_create_vendor`, `eshiwake_update_vendor`, `eshiwake_delete_vendor`
- レポートツール: `eshiwake_trial_balance`, `eshiwake_profit_loss`, `eshiwake_balance_sheet`, `eshiwake_tax_summary`, `eshiwake_export_data`
- Zod スキーマバリデーション
- Markdown レスポンスフォーマット
- E2Eテスト: 102件（Vitest）

#### モノレポ基盤
- pnpm workspaces によるモノレポ構成
- 共通 TypeScript 設定（`tsconfig.base.json`）
- ビルドスクリプト: core → db → mcp-server の依存順ビルド
- テストスクリプト: 全パッケージ一括実行

[0.1.0]: https://github.com/shuji-bonji/e-shiwake-ai/releases/tag/v0.1.0
