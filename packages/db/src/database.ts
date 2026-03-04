import type Database from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';
import { initializeSchema } from './schema/init.js';

let _db: Database.Database | null = null;

/**
 * データベース接続を取得（シングルトン）
 */
export function getDatabase(dbPath?: string): Database.Database {
	if (!_db) {
		const path = dbPath ?? ':memory:';
		_db = new BetterSqlite3(path);
		initializeSchema(_db);
	}
	return _db;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
	if (_db) {
		_db.close();
		_db = null;
	}
}

/**
 * データベースを初期化（テスト用）
 */
export function resetDatabase(dbPath?: string): Database.Database {
	closeDatabase();
	return getDatabase(dbPath);
}
