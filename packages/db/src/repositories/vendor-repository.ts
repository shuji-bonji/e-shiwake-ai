import type { Vendor } from '@e-shiwake/core';
import { getDatabase } from '../database.js';

interface VendorRow {
	id: string;
	name: string;
	address: string | null;
	contact_name: string | null;
	email: string | null;
	phone: string | null;
	payment_terms: string | null;
	note: string | null;
	created_at: string;
	updated_at: string | null;
}

function rowToVendor(row: VendorRow): Vendor {
	return {
		id: row.id,
		name: row.name,
		address: row.address ?? undefined,
		contactName: row.contact_name ?? undefined,
		email: row.email ?? undefined,
		phone: row.phone ?? undefined,
		paymentTerms: row.payment_terms ?? undefined,
		note: row.note ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at ?? undefined
	};
}

/**
 * 全取引先を取得
 */
export function getAllVendors(): Vendor[] {
	const db = getDatabase();
	const rows = db.prepare('SELECT * FROM vendors ORDER BY name').all() as VendorRow[];
	return rows.map(rowToVendor);
}

/**
 * 取引先の取得（ID指定）
 */
export function getVendorById(id: string): Vendor | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as VendorRow | undefined;
	return row ? rowToVendor(row) : null;
}

/**
 * 取引先名で検索
 */
export function searchVendorsByName(query: string): Vendor[] {
	const db = getDatabase();
	const rows = db
		.prepare('SELECT * FROM vendors WHERE name LIKE ? ORDER BY name')
		.all(`%${query}%`) as VendorRow[];
	return rows.map(rowToVendor);
}

/**
 * 取引先の追加（名前で重複チェック）
 */
export function saveVendor(
	vendorOrName: string | Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>
): string {
	const db = getDatabase();
	const vendor = typeof vendorOrName === 'string' ? { name: vendorOrName } : vendorOrName;

	const existing = db.prepare('SELECT id FROM vendors WHERE name = ?').get(vendor.name) as
		| { id: string }
		| undefined;
	if (existing) return existing.id;

	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.prepare(`
		INSERT INTO vendors (id, name, address, contact_name, email, phone, payment_terms, note, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		id,
		vendor.name,
		vendor.address ?? null,
		vendor.contactName ?? null,
		vendor.email ?? null,
		vendor.phone ?? null,
		vendor.paymentTerms ?? null,
		vendor.note ?? null,
		now,
		null
	);
	return id;
}

/**
 * 取引先の更新
 */
export function updateVendor(id: string, updates: Partial<Omit<Vendor, 'id' | 'createdAt'>>): void {
	const db = getDatabase();
	const now = new Date().toISOString();
	const sets: string[] = ['updated_at = ?'];
	const values: unknown[] = [now];

	if ('name' in updates) {
		sets.push('name = ?');
		values.push(updates.name ?? null);
	}
	if ('address' in updates) {
		sets.push('address = ?');
		values.push(updates.address ?? null);
	}
	if ('contactName' in updates) {
		sets.push('contact_name = ?');
		values.push(updates.contactName ?? null);
	}
	if ('email' in updates) {
		sets.push('email = ?');
		values.push(updates.email ?? null);
	}
	if ('phone' in updates) {
		sets.push('phone = ?');
		values.push(updates.phone ?? null);
	}
	if ('paymentTerms' in updates) {
		sets.push('payment_terms = ?');
		values.push(updates.paymentTerms ?? null);
	}
	if ('note' in updates) {
		sets.push('note = ?');
		values.push(updates.note ?? null);
	}

	values.push(id);
	db.prepare(`UPDATE vendors SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * 取引先の削除
 */
export function deleteVendor(id: string): void {
	const db = getDatabase();
	db.prepare('DELETE FROM vendors WHERE id = ?').run(id);
}
