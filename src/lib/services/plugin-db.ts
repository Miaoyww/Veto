/**
 * plugin-db.ts — IndexedDB 持久化层，存储用户已安装的插件数据。
 *
 * DB: veto-mods  version: 2
 * Object store: plugins    (keyPath: "id")
 * Object store: mod_assets (keyPath: "key")  — 图片等 Blob 资源
 */

export interface InstalledPlugin {
	id: string;
	manifest: PluginManifest;
	/** definitions.json 的原始内容（字符串，按需解析） */
	definitions: string | null;
	/** i18n locale → JSON 字符串 */
	i18n: Record<string, string>;
	/** 已存入 mod_assets 的资源 key 列表（格式："{pluginId}/{assetPath}"） */
	assetKeys: string[];
	installedAt: number;
}

/** dist/registry.json 中每个条目的结构（manifest 字段 + 注册中心元数据） */
export interface PluginManifest {
	manifest_version: number;
	id: string;
	name: string;
	version: string;
	author: string;
	type: 'faction' | 'scenario' | 'ruleset' | 'campaign' | 'utility' | 'dependency';
	/** .vmod 包的下载地址 */
	download_url?: string;
	/** 包文件的 SHA-256 十六进制哈希，用于完整性校验 */
	repo: string; // GitHub 仓库路径，格式 "owner/repo"，如 "VetoExpress/veto-modern-war"
	hash?: string;
	preview?: string;
	description?: string;
	min_engine_version?: string;
	definitions?: string | Record<string, string>;
	i18n?: string | Record<string, string>;
	dependencies?: string[];
	tags?: string[];
	license?: string;
}

/** Blob 资源条目（图片、地图底图等） */
export interface ModAsset {
	/** 格式："{pluginId}/{assetPath}"，如 "my-mod/assets/map.png" */
	key: string;
	blob: Blob;
	mimeType: string;
}

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

export async function dbSavePlugin(plugin: InstalledPlugin): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(plugin);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function dbGetPlugin(id: string): Promise<InstalledPlugin | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
		req.onsuccess = () => resolve(req.result as InstalledPlugin | undefined);
		req.onerror = () => reject(req.error);
	});
}

export async function dbGetAllPlugins(): Promise<InstalledPlugin[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
		req.onsuccess = () => resolve(req.result as InstalledPlugin[]);
		req.onerror = () => reject(req.error);
	});
}

export async function dbDeletePlugin(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function dbIsInstalled(id: string): Promise<boolean> {
	return (await dbGetPlugin(id)) !== undefined;
}

// ─── Mod Asset CRUD ───────────────────────────────────────────────────────────

export async function dbSaveAsset(asset: ModAsset): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(ASSET_STORE, 'readwrite');
		tx.objectStore(ASSET_STORE).put(asset);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function dbGetAsset(key: string): Promise<ModAsset | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(ASSET_STORE, 'readonly').objectStore(ASSET_STORE).get(key);
		req.onsuccess = () => resolve(req.result as ModAsset | undefined);
		req.onerror = () => reject(req.error);
	});
}

/** 获取资源并创建 Object URL（调用方负责在不再需要时 URL.revokeObjectURL）*/
export async function dbGetAssetUrl(key: string): Promise<string | null> {
	const asset = await dbGetAsset(key);
	if (!asset) return null;
	return URL.createObjectURL(asset.blob);
}

/** 删除某插件的全部资源（卸载时调用） */
export async function dbDeletePluginAssets(assetKeys: string[]): Promise<void> {
	if (!assetKeys.length) return;
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(ASSET_STORE, 'readwrite');
		const store = tx.objectStore(ASSET_STORE);
		for (const key of assetKeys) store.delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
