import { getDatabase } from './database.js';

/**
 * デフォルトの勘定科目マスタを挿入
 * 個人事業主（フリーランス）向け
 */
export function seedDefaultAccounts(): void {
	const db = getDatabase();

	const insert = db.prepare(`
		INSERT OR IGNORE INTO accounts (code, name, type, is_system, default_tax_category, created_at)
		VALUES (?, ?, ?, 1, ?, datetime('now'))
	`);

	const accounts: [string, string, string, string | null][] = [
		// 資産
		['1001', '現金', 'asset', null],
		['1002', '普通預金', 'asset', null],
		['1003', '売掛金', 'asset', null],
		['1004', '事業主貸', 'asset', 'na'],
		['1005', '前払金', 'asset', null],
		['1006', '貯蔵品', 'asset', null],
		['1007', '仮払金', 'asset', null],
		['1008', '立替金', 'asset', null],
		['1009', '未収入金', 'asset', null],
		// 負債
		['2001', '買掛金', 'liability', null],
		['2002', '未払金', 'liability', null],
		['2003', '未払費用', 'liability', null],
		['2004', '預り金', 'liability', null],
		['2005', '仮受金', 'liability', null],
		['2006', '前受金', 'liability', null],
		['2007', '短期借入金', 'liability', null],
		['2008', '長期借入金', 'liability', null],
		// 純資産
		['3001', '元入金', 'equity', 'na'],
		['3002', '事業主借', 'equity', 'na'],
		// 収益
		['4001', '売上高', 'revenue', 'sales_10'],
		['4002', '雑収入', 'revenue', null],
		// 費用
		['5001', '仕入高', 'expense', 'purchase_10'],
		['5002', '租税公課', 'expense', 'out_of_scope'],
		['5003', '荷造運賃', 'expense', 'purchase_10'],
		['5004', '水道光熱費', 'expense', 'purchase_10'],
		['5005', '旅費交通費', 'expense', 'purchase_10'],
		['5006', '通信費', 'expense', 'purchase_10'],
		['5007', '広告宣伝費', 'expense', 'purchase_10'],
		['5008', '接待交際費', 'expense', 'purchase_10'],
		['5009', '損害保険料', 'expense', 'out_of_scope'],
		['5010', '修繕費', 'expense', 'purchase_10'],
		['5011', '消耗品費', 'expense', 'purchase_10'],
		['5012', '減価償却費', 'expense', 'na'],
		['5013', '福利厚生費', 'expense', null],
		['5014', '給料賃金', 'expense', 'out_of_scope'],
		['5015', '外注工賃', 'expense', 'purchase_10'],
		['5016', '利子割引料', 'expense', 'out_of_scope'],
		['5017', '地代家賃', 'expense', 'purchase_10'],
		['5018', '貸倒金', 'expense', null],
		['5019', '雑費', 'expense', 'purchase_10'],
		['5020', '新聞図書費', 'expense', 'purchase_10'],
		['5021', '研修費', 'expense', 'purchase_10'],
		['5022', '支払手数料', 'expense', 'purchase_10'],
		['5023', '諸会費', 'expense', 'out_of_scope']
	];

	const transaction = db.transaction(() => {
		for (const [code, name, type, taxCategory] of accounts) {
			insert.run(code, name, type, taxCategory);
		}
	});

	transaction();
}
