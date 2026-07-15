/**
 * plugin-storage-idb.ts — IndexedDB 存储实现
 *
 * 将原 plugin-db.ts 的功能迁移到此处，作为 PluginStorage 接口的 IndexedDB 实现
 * 适用于 Web (Vercel) 环境
 */

import type { PluginStorage, onPluginListChanged } from './plugin-storage';
import { onPluginListChanged as notifyChanged } from './plugin-storage';
import type { InstalledPlugin, ModAsset } from '../plugin-db';

const DB_NAME = 'veto-mods';
const DB_VERSION = 2;
const STORE = 'plugins';
const ASSET_STORE = 'mod_assets';

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(ASSET_STORE)) {
				db.createObjectStore(ASSET_STORE, { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/**
 * IndexedDB 存储实现
 *
 * 提供跨浏览器的离线存储能力，特别适合 Web 端。
 * 存储限制通常为 50MB ~ 100MB，取决于浏览器。
 */
export class IndexedDBPluginStorage implements PluginStorage {
	async savePlugin(plugin: InstalledPlugin): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readwrite');
			tx.objectStore(STORE).put(plugin);
			tx.oncomplete = () => {
				notifyChanged?.();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	}

	async getPlugin(id: string): Promise<InstalledPlugin | undefined> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
			req.onsuccess = () => resolve(req.result as InstalledPlugin | undefined);
			req.onerror = () => reject(req.error);
		});
	}

	async getAllPlugins(): Promise<InstalledPlugin[]> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
			req.onsuccess = () => resolve(req.result as InstalledPlugin[]);
			req.onerror = () => reject(req.error);
		});
	}

	async deletePlugin(id: string): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, 'readwrite');
			tx.objectStore(STORE).delete(id);
			tx.oncomplete = () => {
				notifyChanged?.();
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	}

	async isInstalled(id: string): Promise<boolean> {
		return (await this.getPlugin(id)) !== undefined;
	}

	// ─── Asset 操作 ────────────────────────────────────────────────────

	async saveAsset(asset: ModAsset): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(ASSET_STORE, 'readwrite');
			tx.objectStore(ASSET_STORE).put(asset);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async getAsset(key: string): Promise<ModAsset | undefined> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction(ASSET_STORE, 'readonly').objectStore(ASSET_STORE).get(key);
			req.onsuccess = () => resolve(req.result as ModAsset | undefined);
			req.onerror = () => reject(req.error);
		});
	}

	async getAssetUrl(key: string): Promise<string | null> {
		const asset = await this.getAsset(key);
		if (!asset) return null;
		return URL.createObjectURL(asset.blob);
	}

	async deleteAsset(key: string): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(ASSET_STORE, 'readwrite');
			tx.objectStore(ASSET_STORE).delete(key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async deleteAssets(keys: string[]): Promise<void> {
		if (!keys.length) return;
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(ASSET_STORE, 'readwrite');
			const store = tx.objectStore(ASSET_STORE);
			for (const key of keys) store.delete(key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async getAllAssetKeys(): Promise<string[]> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction(ASSET_STORE, 'readonly').objectStore(ASSET_STORE).getAllKeys();
			req.onsuccess = () => resolve(req.result as string[]);
			req.onerror = () => reject(req.error);
		});
	}

	async clear(): Promise<void> {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([STORE, ASSET_STORE], 'readwrite');
			tx.objectStore(STORE).clear();
			tx.objectStore(ASSET_STORE).clear();
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}
}
