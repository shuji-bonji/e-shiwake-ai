# e-shiwake-ai

## プロジェクト概要

e-shiwake PWA（フリーランス・個人事業主向け仕訳入力 + 証憑管理アプリ）のAI統合モノレポ。
MCP（Model Context Protocol）を通じてAIエージェントから仕訳・帳簿操作を可能にする。

**元アプリ**: [e-shiwake](https://github.com/shuji-bonji/e-shiwake) - SvelteKit + IndexedDB の PWA
**このリポジトリ**: ビジネスロジックを抽出し、SQLite + MCP Server として再構築

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│           AI Agent (Claude等)               │
│         MCP Client として動作                │
└──────────────┬──────────────────────────────┘
               │ MCP Protocol (stdio)
┌──────────────▼──────────────────────────────┐
│       @e-shiwake/mcp-server                 │
│  MCPツール定義（registerTool）               │
│  Zod スキーマバリデーション                   │
│  Markdown レスポンスフォーマット              │
├─────────────────────────────────────────────┤
│       @e-shiwake/db                         │
│  SQLite リポジトリ層 (better-sqlite3)        │
│  同期API / トランザクション対応              │
├─────────────────────────────────────────────┤
│       @e-shiwake/core                       │
│  型定義 / ビジネスロジック（ゼロ依存）       │
│  試算表・損益計算書・貸借対照表・消費税計算  │
└─────────────────────────────────────────────┘
```

## パッケージ構成

```
e-shiwake-ai/
├── packages/
│   ├── core/           # @e-shiwake/core - 型定義 + ビジネスロジック
│   │   └── src/
│   │       ├── types/       # 型定義（JournalEntry, Account, etc.）
│   │       ├── constants/   # 定数（勘定科目コード等）
│   │       └── utils/       # 純関数（試算表、P/L、B/S、消費税等）
│   ├── db/             # @e-shiwake/db - SQLite データベース層
│   │   └── src/
│   │       ├── schema/      # SQLite スキーマ定義
│   │       ├── repositories/ # CRUD リポジトリ
│   │       ├── database.ts  # DB接続管理（シングルトン）
│   │       └── seed.ts      # 初期データ投入
│   └── mcp-server/     # @e-shiwake/mcp-server - MCPサーバー
│       └── src/
│           ├── tools/       # ツール定義（ドメイン別）
│           └── index.ts     # エントリポイント
├── package.json         # pnpm workspaces設定
├── pnpm-workspace.yaml
└── tsconfig.base.json   # 共通TypeScript設定
```

## 技術スタック

- **言語**: TypeScript（strict mode）
- **ランタイム**: Node.js >= 18
- **パッケージマネージャ**: pnpm（workspace プロトコル使用）
- **モジュール**: ESM（`"type": "module"`）、Node16 module resolution
- **データベース**: SQLite（better-sqlite3、同期API）
- **MCPフレームワーク**: `@modelcontextprotocol/sdk` v1.x
- **バリデーション**: Zod
- **トランスポート**: stdio（ローカル実行）

## ビルド・実行

```bash
# 依存パッケージインストール
pnpm install

# 全パッケージビルド（core → db → mcp-server の順で）
pnpm run build

# 個別ビルド
pnpm --filter @e-shiwake/core build
pnpm --filter @e-shiwake/db build
pnpm --filter @e-shiwake/mcp-server build

# 型チェックのみ
pnpm run typecheck

# MCP サーバー起動
E_SHIWAKE_DB_PATH=./data.db node packages/mcp-server/dist/index.js
```

### ビルド順序

パッケージ間に依存関係があるため、ビルド順序は重要：
1. `@e-shiwake/core`（依存なし）
2. `@e-shiwake/db`（core に依存）
3. `@e-shiwake/mcp-server`（core, db に依存）

## MCP ツール一覧

### 仕訳（Journal）

| ツール名 | 機能 | 読取専用 | 破壊的 |
|---|---|---|---|
| `eshiwake_list_fiscal_years` | 年度一覧取得 | ✅ | - |
| `eshiwake_list_journals` | 年度別仕訳一覧 | ✅ | - |
| `eshiwake_get_journal` | 仕訳詳細取得 | ✅ | - |
| `eshiwake_create_journal` | 仕訳作成 | - | - |
| `eshiwake_update_journal` | 仕訳更新 | - | - |
| `eshiwake_delete_journal` | 仕訳削除 | - | ⚠️ |
| `eshiwake_delete_year_data` | 年度データ一括削除 | - | ⚠️ |

### 勘定科目（Account）

| ツール名 | 機能 | 読取専用 | 破壊的 |
|---|---|---|---|
| `eshiwake_list_accounts` | 科目一覧（タイプ別フィルタ可） | ✅ | - |
| `eshiwake_get_account` | 科目詳細 | ✅ | - |
| `eshiwake_create_account` | 科目追加（自動採番） | - | - |
| `eshiwake_update_account` | 科目更新 | - | - |
| `eshiwake_delete_account` | 科目削除（使用中は不可） | - | ⚠️ |

### 取引先（Vendor）

| ツール名 | 機能 | 読取専用 | 破壊的 |
|---|---|---|---|
| `eshiwake_list_vendors` | 取引先一覧・検索 | ✅ | - |
| `eshiwake_get_vendor` | 取引先詳細 | ✅ | - |
| `eshiwake_create_vendor` | 取引先作成（同名は既存返却） | - | - |
| `eshiwake_update_vendor` | 取引先更新 | - | - |
| `eshiwake_delete_vendor` | 取引先削除 | - | ⚠️ |

### 帳簿・レポート（Report）

| ツール名 | 機能 | 読取専用 |
|---|---|---|
| `eshiwake_trial_balance` | 試算表（合計残高試算表） | ✅ |
| `eshiwake_profit_loss` | 損益計算書 | ✅ |
| `eshiwake_balance_sheet` | 貸借対照表 | ✅ |
| `eshiwake_tax_summary` | 消費税集計 | ✅ |
| `eshiwake_export_data` | JSON データエクスポート | ✅ |

## コーディング規約

### TypeScript

- **strict モード**: 必須
- **ESM**: `"type": "module"` + `.js` 拡張子付きインポート
- **命名規則**:
  - ファイル: kebab-case（`journal-tools.ts`）
  - 関数/変数: camelCase
  - 型/インターフェース: PascalCase
  - 定数: UPPER_SNAKE_CASE
  - MCPツール名: snake_case（`eshiwake_create_journal`）

### MCP ツール実装パターン

```typescript
server.registerTool(
  'eshiwake_ツール名',
  {
    title: '表示名',
    description: `説明（Args/Returns/Examples形式）`,
    inputSchema: ZodSchema,
    annotations: {
      readOnlyHint: boolean,
      destructiveHint: boolean,
      idempotentHint: boolean,
      openWorldHint: false  // ローカルDBのため常にfalse
    }
  },
  async (params) => {
    try {
      // 処理
      return { content: [{ type: 'text' as const, text: markdownResponse }] };
    } catch (error) {
      return { content: [{ type: 'text' as const, text: `エラー: ${...}` }] };
    }
  }
);
```

### レスポンス形式

- **一覧**: Markdown テーブル形式
- **詳細**: Markdown テーブル + セクション形式
- **エラー**: `エラー: {メッセージ}` 形式
- **作成/更新/削除**: 操作結果メッセージ + 詳細

### 仕訳のバリデーション

- 借方合計 === 貸方合計 を必ず検証（`validateDebitCreditBalance`）
- 勘定科目コードの存在チェック
- 日付形式 YYYY-MM-DD

## データモデル（主要型）

### JournalEntry（仕訳）

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | UUID |
| date | string | 取引日（YYYY-MM-DD） |
| lines | JournalLine[] | 仕訳明細行 |
| vendor | string | 取引先名 |
| description | string | 摘要 |
| evidenceStatus | 'none' \| 'paper' \| 'digital' | 証跡ステータス |
| attachments | Attachment[] | 証憑 |

### Account（勘定科目）

| フィールド | 型 | 説明 |
|---|---|---|
| code | string | 4桁コード（1xxx:資産, 2xxx:負債, 3xxx:純資産, 4xxx:収益, 5xxx:費用） |
| name | string | 科目名 |
| type | AccountType | asset/liability/equity/revenue/expense |
| isSystem | boolean | システム初期データか |

### 消費税区分（TaxCategory）

- `sales_10` / `sales_8`: 課税売上（10% / 8%軽減税率）
- `purchase_10` / `purchase_8`: 課税仕入
- `exempt`: 非課税
- `out_of_scope`: 不課税
- `na`: 対象外（事業主勘定等）

## 環境変数

| 変数名 | 説明 | デフォルト |
|---|---|---|
| `E_SHIWAKE_DB_PATH` | SQLite DBファイルパス | `e-shiwake.db` |

## 今後の予定

- [ ] テストコード追加（Vitest）
- [ ] 仕訳検索ツール（`eshiwake_search_journals`）
- [ ] 請求書ツール（CRUD + 仕訳自動生成）
- [ ] 固定資産・減価償却ツール
- [ ] 青色申告決算書生成ツール
- [ ] データインポートツール
- [ ] MCP クライアント実装（将来の別パッケージ）
