import { beforeEach, describe, it, expect } from 'vitest';
import { resetDatabase } from '../database.js';
import { seedDefaultAccounts } from '../seed.js';
import {
	getAllVendors,
	getVendorById,
	searchVendorsByName,
	saveVendor,
	updateVendor,
	deleteVendor
} from '../repositories/vendor-repository.js';

describe('vendor-repository', () => {
	beforeEach(() => {
		resetDatabase(':memory:');
		seedDefaultAccounts();
	});

	// ==================== getAllVendors ====================

	describe('getAllVendors', () => {
		it('should return empty array when no vendors exist', () => {
			const vendors = getAllVendors();
			expect(vendors).toEqual([]);
		});

		it('should return all vendors sorted by name', () => {
			saveVendor('株式会社B');
			saveVendor('株式会社A');
			saveVendor('株式会社C');

			const vendors = getAllVendors();
			expect(vendors).toHaveLength(3);
			expect(vendors[0].name).toBe('株式会社A');
			expect(vendors[1].name).toBe('株式会社B');
			expect(vendors[2].name).toBe('株式会社C');
		});

		it('should include vendor details', () => {
			const id = saveVendor('テスト会社');
			updateVendor(id, {
				address: '東京都渋谷区',
				contactName: '山田太郎'
			});

			const vendors = getAllVendors();
			const vendor = vendors.find((v) => v.name === 'テスト会社');
			expect(vendor).toBeDefined();
			expect(vendor!.address).toBe('東京都渋谷区');
			expect(vendor!.contactName).toBe('山田太郎');
		});
	});

	// ==================== getVendorById ====================

	describe('getVendorById', () => {
		it('should return null for non-existent ID', () => {
			const vendor = getVendorById('non-existent-id');
			expect(vendor).toBeNull();
		});

		it('should retrieve vendor by ID', () => {
			const id = saveVendor('テスト会社');
			const vendor = getVendorById(id);

			expect(vendor).toBeDefined();
			expect(vendor!.id).toBe(id);
			expect(vendor!.name).toBe('テスト会社');
		});

		it('should include all vendor properties', () => {
			const id = saveVendor('テスト会社');
			updateVendor(id, {
				address: '東京都渋谷区',
				contactName: '田中花子',
				email: 'hanako@example.com',
				phone: '03-1234-5678',
				paymentTerms: '月末締め翌月末払い',
				note: 'テスト備考'
			});

			const vendor = getVendorById(id);
			expect(vendor!.id).toBe(id);
			expect(vendor!.name).toBe('テスト会社');
			expect(vendor!.address).toBe('東京都渋谷区');
			expect(vendor!.contactName).toBe('田中花子');
			expect(vendor!.email).toBe('hanako@example.com');
			expect(vendor!.phone).toBe('03-1234-5678');
			expect(vendor!.paymentTerms).toBe('月末締め翌月末払い');
			expect(vendor!.note).toBe('テスト備考');
			expect(vendor!.createdAt).toBeDefined();
			expect(vendor!.updatedAt).toBeDefined();
		});
	});

	// ==================== searchVendorsByName ====================

	describe('searchVendorsByName', () => {
		beforeEach(() => {
			saveVendor('Amazon Japan');
			saveVendor('Amazon Web Services');
			saveVendor('Google Japan');
			saveVendor('Microsoft Japan');
		});

		it('should search by partial name', () => {
			const results = searchVendorsByName('Amazon');
			expect(results).toHaveLength(2);
			expect(results[0].name).toBe('Amazon Japan');
			expect(results[1].name).toBe('Amazon Web Services');
		});

		it('should be case-insensitive', () => {
			const results1 = searchVendorsByName('amazon');
			const results2 = searchVendorsByName('AMAZON');
			expect(results1).toHaveLength(2);
			expect(results2).toHaveLength(2);
		});

		it('should return empty array when no matches', () => {
			const results = searchVendorsByName('Apple');
			expect(results).toEqual([]);
		});

		it('should sort results by name', () => {
			const results = searchVendorsByName('');
			// All vendors should match empty query (LIKE %%)
			expect(results.length).toBeGreaterThan(0);
			for (let i = 0; i < results.length - 1; i++) {
				expect(results[i].name <= results[i + 1].name).toBe(true);
			}
		});

		it('should match substring anywhere in name', () => {
			const results = searchVendorsByName('Japan');
			expect(results).toHaveLength(3); // Amazon Japan, Google Japan, Microsoft Japan
		});

		it('should match single character query', () => {
			const results = searchVendorsByName('A');
			expect(results.length).toBeGreaterThan(0);
			results.forEach((v) => {
				expect(v.name.toUpperCase()).toContain('A');
			});
		});
	});

	// ==================== saveVendor ====================

	describe('saveVendor', () => {
		it('should create new vendor when name does not exist', () => {
			const id = saveVendor('新規取引先');

			expect(id).toBeDefined();
			expect(typeof id).toBe('string');

			const vendor = getVendorById(id);
			expect(vendor).toBeDefined();
			expect(vendor!.name).toBe('新規取引先');
		});

		it('should return existing ID when vendor name already exists', () => {
			const id1 = saveVendor('既存取引先');
			const id2 = saveVendor('既存取引先');

			expect(id1).toBe(id2);
		});

		it('should handle duplicate inserts gracefully', () => {
			const id1 = saveVendor('テスト取引先');
			const id2 = saveVendor('テスト取引先');
			const id3 = saveVendor('テスト取引先');

			expect(id1).toBe(id2);
			expect(id2).toBe(id3);

			const allVendors = getAllVendors();
			const matching = allVendors.filter((v) => v.name === 'テスト取引先');
			expect(matching).toHaveLength(1);
		});

		it('should create vendor with minimal info (name only)', () => {
			const id = saveVendor('シンプル取引先');
			const vendor = getVendorById(id);

			expect(vendor!.name).toBe('シンプル取引先');
			expect(vendor!.address).toBeUndefined();
			expect(vendor!.contactName).toBeUndefined();
			expect(vendor!.email).toBeUndefined();
			expect(vendor!.phone).toBeUndefined();
		});

		it('should set createdAt timestamp', () => {
			const before = new Date();
			const id = saveVendor('タイムスタンプテスト');
			const after = new Date();

			const vendor = getVendorById(id);
			const createdAt = new Date(vendor!.createdAt);

			expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000); // +1s margin
		});

		it('should handle special characters in vendor name', () => {
			const names = [
				'(株)テスト',
				'株式会社＆パートナー',
				'Test & Co.',
				'名前-with-dash',
				"O'Reilly"
			];

			for (const name of names) {
				const id = saveVendor(name);
				const vendor = getVendorById(id);
				expect(vendor!.name).toBe(name);
			}
		});
	});

	// ==================== updateVendor ====================

	describe('updateVendor', () => {
		let vendorId: string;

		beforeEach(() => {
			vendorId = saveVendor('更新テスト取引先');
		});

		it('should update vendor name', () => {
			updateVendor(vendorId, { name: '更新済み取引先' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.name).toBe('更新済み取引先');
		});

		it('should update address', () => {
			updateVendor(vendorId, { address: '東京都新宿区' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.address).toBe('東京都新宿区');
		});

		it('should update contact name', () => {
			updateVendor(vendorId, { contactName: '山田太郎' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.contactName).toBe('山田太郎');
		});

		it('should update email', () => {
			updateVendor(vendorId, { email: 'info@example.com' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.email).toBe('info@example.com');
		});

		it('should update phone', () => {
			updateVendor(vendorId, { phone: '03-1234-5678' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.phone).toBe('03-1234-5678');
		});

		it('should update payment terms', () => {
			updateVendor(vendorId, { paymentTerms: '月末締め翌月末払い' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.paymentTerms).toBe('月末締め翌月末払い');
		});

		it('should update note', () => {
			updateVendor(vendorId, { note: 'テスト備考' });
			const vendor = getVendorById(vendorId);
			expect(vendor!.note).toBe('テスト備考');
		});

		it('should update multiple fields at once', () => {
			updateVendor(vendorId, {
				name: '新しい名前',
				address: '大阪府大阪市',
				contactName: '田中花子',
				email: 'tanaka@example.com'
			});

			const vendor = getVendorById(vendorId);
			expect(vendor!.name).toBe('新しい名前');
			expect(vendor!.address).toBe('大阪府大阪市');
			expect(vendor!.contactName).toBe('田中花子');
			expect(vendor!.email).toBe('tanaka@example.com');
		});

		it('should update updatedAt timestamp', () => {
			const before = getVendorById(vendorId)!.updatedAt;

			// Small delay
			const startTime = Date.now();
			while (Date.now()- startTime < 10) {
				// busy wait
			}

			updateVendor(vendorId, { contactName: '更新名前' });

			const after = getVendorById(vendorId)!.updatedAt;
			expect(after).toBeDefined();
			if (before) {
				expect(new Date(after!).getTime()).toBeGreaterThan(new Date(before).getTime());
			}
		});

		it('should allow clearing fields by passing undefined values', () => {
			updateVendor(vendorId, {
				address: '東京都渋谷区',
				email: 'test@example.com'
			});

			let vendor = getVendorById(vendorId);
			expect(vendor!.address).toBe('東京都渋谷区');
			expect(vendor!.email).toBe('test@example.com');

			// Clear fields
			updateVendor(vendorId, {
				address: undefined,
				email: undefined
			});

			vendor = getVendorById(vendorId);
			expect(vendor!.address).toBeUndefined();
			expect(vendor!.email).toBeUndefined();
		});

		it('should not affect other vendors', () => {
			const otherId = saveVendor('他の取引先');

			updateVendor(vendorId, { name: '更新済み', address: '東京' });

			const other = getVendorById(otherId);
			expect(other!.name).toBe('他の取引先');
			expect(other!.address).toBeUndefined();
		});
	});

	// ==================== deleteVendor ====================

	describe('deleteVendor', () => {
		it('should delete vendor', () => {
			const id = saveVendor('削除対象取引先');
			expect(getVendorById(id)).toBeDefined();

			deleteVendor(id);
			expect(getVendorById(id)).toBeNull();
		});

		it('should remove from list after deletion', () => {
			const id1 = saveVendor('保持取引先');
			const id2 = saveVendor('削除取引先');

			deleteVendor(id2);

			const vendors = getAllVendors();
			expect(vendors.some((v) => v.id === id2)).toBe(false);
			expect(vendors.some((v) => v.id === id1)).toBe(true);
		});

		it('should not error when deleting non-existent vendor', () => {
			expect(() => {
				deleteVendor('non-existent-id');
			}).not.toThrow();
		});

		it('should allow deleting and recreating with same name', () => {
			const id1 = saveVendor('テスト取引先');
			deleteVendor(id1);

			const id2 = saveVendor('テスト取引先');
			expect(id1).not.toBe(id2);

			const vendor = getVendorById(id2);
			expect(vendor!.name).toBe('テスト取引先');
		});
	});

	// ==================== Integration scenarios ====================

	describe('integration scenarios', () => {
		it('should handle vendor lifecycle: create -> update -> delete', () => {
			const id = saveVendor('ライフサイクルテスト');

			let vendor = getVendorById(id);
			expect(vendor!.name).toBe('ライフサイクルテスト');
			expect(vendor!.address).toBeUndefined();

			updateVendor(id, { address: '東京都' });
			vendor = getVendorById(id);
			expect(vendor!.address).toBe('東京都');

			deleteVendor(id);
			vendor = getVendorById(id);
			expect(vendor).toBeNull();
		});

		it('should maintain vendor list integrity', () => {
			const vendor1 = saveVendor('取引先1');
			const vendor2 = saveVendor('取引先2');
			const vendor3 = saveVendor('取引先3');

			const allBefore = getAllVendors();
			expect(allBefore).toHaveLength(3);

			deleteVendor(vendor2);

			const allAfter = getAllVendors();
			expect(allAfter).toHaveLength(2);
			expect(allAfter.some((v) => v.id === vendor1)).toBe(true);
			expect(allAfter.some((v) => v.id === vendor2)).toBe(false);
			expect(allAfter.some((v) => v.id === vendor3)).toBe(true);
		});
	});
});
