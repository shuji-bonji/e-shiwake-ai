# e-shiwake-ai

[English](./README.en.md)

日本の複式簿記に対応した MCP（Model Context Protocol）サーバーです。Claude などの AI エージェントから、仕訳入力・勘定科目管理・取引先管理・帳簿生成を自然言語で操作できます。

[e-shiwake](https://github.com/shuji-bonji/e-shiwake)（フリーランス・個人事業主向けのローカルファースト仕訳 PWA）の AI 統合レイヤーとして構築されています。

## 特徴

- **仕訳管理** — 複合仕訳（借方・貸方複数行）に対応した CRUD
- **勘定科目管理** — 5カテゴリ（資産・負債・純資産・収益・費用）の科目管理、自動採番
- **取引先管理** — 取引先情報の登録・検索
- **帳簿生成** — 試算表、損益計算書、貸借対照表、消費税集計
- **データエクスポート** — JSON 形式でのバックアップ・移行
- **消費税対応** — 10%・8%軽減税率、非課税、不課税、対象外

## アーキテクチャ

```
┌──────────────────────────────────┐
│      AI エージェント（Claude）     │
└───────────────┬──────────────────┘
                │ MCP Protocol (stdio)
┌───────────────▼──────────────────┐
│     @e-shiwake/mcp-server        │
│     MCPツール定義 + Zodバリデーション │
├──────────────────────────────────┤
│     @e-shiwake/db                │
│     SQLite（better-sqlite3）      │
├──────────────────────────────────┤
│     @e-shiwake/core              │
│     型定義 + ビジネスロジック      │
└──────────────────────────────────┘
```

## クイックスタート

### 前提条件

- Node.js >= 18
- pnpm

### インストール＆ビルド

```bash
git clone https://github.com/shuji-bonji/e-shiwake-ai.git
cd e-shiwake-ai
pnpm install
pnpm run build
```

### Claude Desktop への設定

`claude_desktop_config.json` に以下を追加してください。

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

### トラブルシューティング: Node.js バージョン不一致

`better-sqlite3` はネイティブモジュールのため、ビルド時と実行時の Node.js バージョンが一致している必要があります。Claude Desktop が異なるバージョンの Node.js を使用している場合、以下のようなエラーが発生します：

```
NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 115.
```

**対処法**: `claude_desktop_config.json` で `pnpm install` 時と同じ Node.js バイナリの絶対パスを指定：

```json
"command": "/path/to/.nvm/versions/node/v22.x.x/bin/node"
```

> **注意**: `"command": "node"` だけでは、ビルド時と異なるバージョンの Node.js が使われる場合があります。絶対パスの指定を推奨します。

### 動作確認

Claude Desktop を再起動後、e-shiwake のツールが利用可能になります。以下のように話しかけてみてください。

> 「年度一覧を表示して」

> 「2025年度の仕訳を見せて」

> 「旅費交通費で電車代1,200円の仕訳を作成して。支払いは現金で」

## サンプルプロンプト集

AIエージェント上で仕訳入力から帳簿確認まで、UIなしで完結できます。コピペで試せるプロンプト例を用意しています。

**→ [サンプルプロンプト集](./docs/sample-prompts.md)**

経費記帳、家事按分、売上計上、源泉徴収、帳簿確認、月次ルーティンなど、フリーランスの日常業務を網羅しています。

## MCP ツール一覧

### 仕訳（Journal）

| ツール名                     | 機能               |
| ---------------------------- | ------------------ |
| `eshiwake_list_fiscal_years` | 年度一覧取得       |
| `eshiwake_list_journals`     | 年度別仕訳一覧     |
| `eshiwake_get_journal`       | 仕訳詳細取得       |
| `eshiwake_create_journal`    | 仕訳作成           |
| `eshiwake_update_journal`    | 仕訳更新           |
| `eshiwake_delete_journal`    | 仕訳削除           |
| `eshiwake_delete_year_data`  | 年度データ一括削除 |

### 勘定科目（Account）

| ツール名                  | 機能                           |
| ------------------------- | ------------------------------ |
| `eshiwake_list_accounts`  | 科目一覧（タイプ別フィルタ可） |
| `eshiwake_get_account`    | 科目詳細                       |
| `eshiwake_create_account` | 科目追加（自動採番）           |
| `eshiwake_update_account` | 科目更新                       |
| `eshiwake_delete_account` | 科目削除（使用中は不可）       |

### 取引先（Vendor）

| ツール名                 | 機能                         |
| ------------------------ | ---------------------------- |
| `eshiwake_list_vendors`  | 取引先一覧・検索             |
| `eshiwake_get_vendor`    | 取引先詳細                   |
| `eshiwake_create_vendor` | 取引先作成（同名は既存返却） |
| `eshiwake_update_vendor` | 取引先更新                   |
| `eshiwake_delete_vendor` | 取引先削除                   |

### 帳簿・レポート（Report）

| ツール名                 | 機能                     |
| ------------------------ | ------------------------ |
| `eshiwake_trial_balance` | 試算表（合計残高試算表） |
| `eshiwake_profit_loss`   | 損益計算書               |
| `eshiwake_balance_sheet` | 貸借対照表               |
| `eshiwake_tax_summary`   | 消費税集計               |
| `eshiwake_export_data`   | JSON データエクスポート  |

## パッケージ構成

```
packages/
├── core/         # @e-shiwake/core — 型定義・ビジネスロジック（依存なし）
├── db/           # @e-shiwake/db — SQLite リポジトリ層（better-sqlite3）
└── mcp-server/   # @e-shiwake/mcp-server — MCP サーバー本体
```

## E2E テスト（Cowork スキル）

MCP ツールを実際に呼び出して全機能を検証する E2E テストスキルを同梱しています。Claude Desktop の Cowork モードで使用できます。

### スキルの場所

```
skills/e-shiwake-e2e/SKILL.md
```

### インストール

1. `skills/e-shiwake-e2e.skill` ファイルを Cowork にドラッグ＆ドロップ
2. または、Cowork の設定からスキルとして `skills/e-shiwake-e2e/` ディレクトリを追加

### 使い方

e-shiwake MCP サーバーが接続された状態で、以下のように話しかけます：

> 「e2eテストを実行して」

> 「e-shiwake の動作確認をして」

> 「MCPツールのヘルスチェックをして」

### テスト内容（7フェーズ）

| Phase | 内容 | テスト数 |
|---|---|---|
| 0 | 事前確認（年度・科目マスタ） | 1 |
| 1 | 仕訳 CRUD（作成→取得→更新→削除） | 5 |
| 2 | 複合仕訳 + データ投入（家事按分等） | 5 |
| 3 | 帳簿レポート（試算表・P/L・B/S・消費税） | 4 |
| 4 | 取引先 CRUD | 5 |
| 5 | 勘定科目 CRUD | 4 |
| 6 | データエクスポート | 1 |
| 7 | クリーンアップ（テストデータ削除） | 2 |

テスト用年度 **2099** を使用するため、実データへの影響はありません。

### カスタマイズ

- 特定フェーズのみ実行: 「Phase 1 だけ実行して」
- レポートのみテスト: 「レポートだけテストして」
- テスト年度の変更も可能（実データがある年度は避けてください）

## 開発

```bash
# 全テスト実行（391件）
pnpm run test

# コードフォーマット
pnpm run format

# lint チェック
pnpm run lint

# フォーマット + lint + 自動修正
pnpm run check
```

## 技術スタック

- **言語**: TypeScript（strict mode、ESM）
- **ランタイム**: Node.js >= 18
- **パッケージマネージャ**: pnpm（workspaces）
- **データベース**: SQLite（better-sqlite3）
- **MCP**: @modelcontextprotocol/sdk v1.x
- **バリデーション**: Zod
- **リンター/フォーマッター**: Biome
- **テスト**: Vitest

## 環境変数

| 変数名              | 説明                              | デフォルト     |
| ------------------- | --------------------------------- | -------------- |
| `E_SHIWAKE_DB_PATH` | SQLite データベースファイルのパス | `e-shiwake.db` |

## ライセンス

[MIT](./LICENSE)
