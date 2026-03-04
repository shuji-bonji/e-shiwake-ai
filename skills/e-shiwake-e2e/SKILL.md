---
name: e-shiwake-e2e
description: |
  e-shiwake MCP サーバーの E2E テストを実行するスキル。MCP ツール（eshiwake_*）を実際に呼び出し、
  仕訳 CRUD、複合仕訳、帳簿レポート、取引先・勘定科目管理、データエクスポートの全機能を
  一気通貫でテストする。テスト後はデータをクリーンアップし、結果サマリーを Markdown テーブルで報告する。
  「e2eテスト」「MCPテスト」「e-shiwake テスト」「動作確認」「ヘルスチェック」などの
  キーワードで呼び出す。e-shiwake の MCP ツールが接続済みの環境で使用すること。
---

# e-shiwake E2E テスト

e-shiwake MCP サーバーの全機能を、実際の MCP ツール呼び出しで検証する E2E テストスキル。

## 前提条件

- e-shiwake MCP サーバーが接続済みであること（`eshiwake_*` ツールが使えること）
- テスト用データを作成・削除するため、本番データへの影響に注意すること

## テスト実行の流れ

テストは以下の順序で実行する。各ステップは独立しているため、途中で失敗しても後続テストは続行する。
失敗したテストは結果テーブルに記録し、最後にまとめて報告する。

**実行効率のヒント**: 依存関係がない MCP 呼び出しは並列実行してよい。
たとえば Phase 2 の仕訳4件投入、Phase 3 の帳簿レポート4種生成は同時呼び出し可能。

### Phase 0: 事前確認

テスト対象の年度に既存データがないか確認する。
既存データがある場合はユーザーに確認を取ってから進める（上書き防止）。

1. `eshiwake_list_fiscal_years` で年度一覧を取得
2. テスト用年度（デフォルト: **2099**）にデータがないことを確認
3. `eshiwake_list_accounts` で勘定科目マスタの存在を確認

テスト用年度を 2099 にすることで、ユーザーの実データとの衝突を避ける。
なお、fiscalYear のバリデーションは 2000〜2100 の範囲制約があるため、2099 等は使用不可。

### Phase 1: 仕訳 CRUD

単純な仕訳の作成→取得→更新→削除の一連フローを検証する。

```
テスト 1-1: 仕訳作成（単純仕訳）
  eshiwake_create_journal:
    date: "2099-01-10"
    description: "[E2E] 電車代テスト"
    vendor: "E2Eテスト交通"
    lines:
      - type: debit, accountCode: "5005", amount: 500, taxCategory: purchase_10
      - type: credit, accountCode: "1001", amount: 500, taxCategory: na
    evidenceStatus: none
  検証: レスポンスに ID が含まれること、借方合計＝貸方合計

テスト 1-2: 仕訳取得
  eshiwake_get_journal: id = (1-1で取得したID)
  検証: 摘要・取引先・金額が作成時と一致

テスト 1-3: 仕訳更新
  eshiwake_update_journal:
    id = (1-1で取得したID)
    description: "[E2E] 電車代テスト（更新）"
    lines: 金額を 500 → 800 に変更
  検証: 更新後の摘要と金額が反映されている

テスト 1-4: 仕訳削除
  eshiwake_delete_journal: id = (1-1で取得したID)
  検証: 削除成功メッセージ

テスト 1-5: 削除確認
  eshiwake_list_journals: fiscalYear = 2099
  検証: 仕訳が 0 件であること
```

### Phase 2: 複合仕訳 + データ投入

帳簿レポート検証のために、複数の仕訳をまとめて投入する。
家事按分パターン（借方2行/貸方1行）も含める。

```
テスト 2-1: 複合仕訳（家事按分）
  eshiwake_create_journal:
    date: "2099-01-05"
    description: "[E2E] 通信費（事業80%/家事20%）"
    vendor: "E2Eテスト通信"
    lines:
      - type: debit, accountCode: "5006", amount: 8000, taxCategory: purchase_10, memo: "事業分80%"
      - type: debit, accountCode: "1004", amount: 2000, taxCategory: na, memo: "家事分20%"
      - type: credit, accountCode: "1002", amount: 10000, taxCategory: na
  検証: 借方合計(10,000) ＝ 貸方合計(10,000)、明細行が3行

テスト 2-2: 売上仕訳
  eshiwake_create_journal:
    date: "2099-01-15"
    description: "[E2E] 開発費売上"
    vendor: "E2Eテストクライアント"
    lines:
      - type: debit, accountCode: "1003", amount: 550000, taxCategory: na
      - type: credit, accountCode: "4001", amount: 550000, taxCategory: sales_10
  検証: 作成成功

テスト 2-3: 入金仕訳
  eshiwake_create_journal:
    date: "2099-01-31"
    description: "[E2E] 開発費入金"
    vendor: "E2Eテストクライアント"
    lines:
      - type: debit, accountCode: "1002", amount: 550000, taxCategory: na
      - type: credit, accountCode: "1003", amount: 550000, taxCategory: na
  検証: 作成成功

テスト 2-4: 経費仕訳
  eshiwake_create_journal:
    date: "2099-02-10"
    description: "[E2E] 消耗品購入"
    vendor: "E2Eテストショップ"
    lines:
      - type: debit, accountCode: "5011", amount: 3300, taxCategory: purchase_10
      - type: credit, accountCode: "1001", amount: 3300, taxCategory: na
  検証: 作成成功

テスト 2-5: 仕訳一覧確認
  eshiwake_list_journals: fiscalYear = 2099
  検証: 4件の仕訳が返ること、全件で借方合計＝貸方合計
```

### Phase 3: 帳簿レポート

投入したデータをもとに各種帳簿を生成し、数値の整合性を検証する。

```
テスト 3-1: 試算表
  eshiwake_trial_balance: fiscalYear = 2099
  検証:
    - 借方合計 ＝ 貸方合計（貸借一致）
    - 売上高（4001）が 550,000 を含むこと

テスト 3-2: 損益計算書
  eshiwake_profit_loss: fiscalYear = 2099
  検証:
    - 収益合計 > 0
    - 費用合計 > 0
    - 当期純利益 ＝ 収益合計 − 費用合計

テスト 3-3: 貸借対照表
  eshiwake_balance_sheet: fiscalYear = 2099
  検証:
    - 資産合計 > 0
    - レスポンスにエラーがないこと
    - 注意: テストデータには元入金（期首資本）がないため、貸借「不一致」は想定通りの挙動

テスト 3-4: 消費税集計
  eshiwake_tax_summary: fiscalYear = 2099
  検証:
    - 課税売上合計 > 0（売上仕訳があるため）
    - 課税仕入合計 > 0（経費仕訳があるため）
    - 納付税額 ＝ 売上消費税 − 仕入消費税
```

### Phase 4: 取引先 CRUD

```
テスト 4-1: 取引先作成
  eshiwake_create_vendor:
    name: "E2Eテスト取引先"
    address: "東京都テスト区1-1-1"
    email: "e2e@test.example.com"
  検証: ID が返ること

テスト 4-2: 取引先取得
  eshiwake_get_vendor: id = (4-1で取得したID)
  検証: name, address, email が一致

テスト 4-3: 取引先更新
  eshiwake_update_vendor:
    id = (4-1で取得したID)
    phone: "03-0000-0000"
  検証: 更新成功

テスト 4-4: 取引先検索
  eshiwake_list_vendors: query = "E2Eテスト"
  検証: 1件以上ヒット

テスト 4-5: 取引先削除
  eshiwake_delete_vendor: id = (4-1で取得したID)
  検証: 削除成功
```

### Phase 5: 勘定科目 CRUD

```
テスト 5-1: 勘定科目作成
  eshiwake_create_account:
    type: "expense"
    name: "E2Eテスト科目"
    defaultTaxCategory: purchase_10
  検証: コードが自動採番されること（5xxx）

テスト 5-2: 勘定科目取得
  eshiwake_get_account: code = (5-1で取得したコード)
  検証: name, type, defaultTaxCategory が一致

テスト 5-3: 勘定科目更新
  eshiwake_update_account:
    code = (5-1で取得したコード)
    name: "E2Eテスト科目（更新）"
  検証: 更新成功

テスト 5-4: 勘定科目削除
  eshiwake_delete_account: code = (5-1で取得したコード)
  検証: 削除成功（使用中でないため削除可能）
```

### Phase 6: データエクスポート

```
テスト 6-1: JSON エクスポート
  eshiwake_export_data: fiscalYear = 2099
  検証:
    - version フィールドが存在
    - journals 配列に 4 件
    - accounts 配列に 44 件以上
```

### Phase 7: クリーンアップ

```
テスト 7-1: 年度データ一括削除
  eshiwake_delete_year_data: fiscalYear = 2099
  検証: 仕訳 4 件が削除されたこと

テスト 7-2: クリーンアップ確認
  eshiwake_list_journals: fiscalYear = 2099
  検証: 0 件
```

## 結果報告フォーマット

全テスト完了後、以下のフォーマットで結果を報告する。

```markdown
## e-shiwake E2E テスト結果

**実行日時**: YYYY-MM-DD HH:MM
**テスト年度**: 2099
**MCP操作数**: XX回

| # | Phase | テスト項目 | 結果 | 備考 |
|---|---|---|---|---|
| 1-1 | 仕訳CRUD | 仕訳作成（単純） | PASS/FAIL | ... |
| 1-2 | 仕訳CRUD | 仕訳取得 | PASS/FAIL | ... |
| ... | ... | ... | ... | ... |

**総合**: XX テスト / XX パス / XX 失敗
```

失敗したテストがある場合は、エラー内容と考えられる原因も記載する。

## カスタマイズ

ユーザーが特定のフェーズだけ実行したい場合は、Phase 番号を指定して部分実行できる。

- 「Phase 1 だけ実行して」→ 仕訳 CRUD のみ
- 「レポートだけテストして」→ Phase 2（データ投入）+ Phase 3（レポート）を実行
- 「フルテスト」→ 全 Phase を実行（デフォルト）

テスト年度もカスタマイズ可能。ただし実データがある年度は避けるよう警告する。
