/**
 * plugin-db.ts — IndexedDB 持久化层，存储用户已安装的插件数据。
 *
 * 📌 现代用法（推荐）：
 *   import { getPluginStorage } from './plugin-db';
 *   const storage = getPluginStorage();
 *   await storage.savePlugin(plugin);
 *
 * 📌 兼容性用法（向后兼容）：
 *   import { dbSavePlugin, dbGetPlugin } from './plugin-db';
 *   await dbSavePlugin(plugin);
 *
 * DB: veto-mods  version: 2
 * Object store: plugins    (keyPath: "id")
 * Object store: mod_assets (keyPath: "key")  — 图片等 Blob 资源
 */

import { writable } from 'svelte/store';
import { getPluginStorage, initPluginStorage } from './plugin-storage/plugin-storage-factory';
import { setPluginListChangeCallback } from './plugin-storage/plugin-storage';

// ─── 导出新 API ────────────────────────────────────────────────────
export { getPluginStorage, initPluginStorage } from './plugin-storage/plugin-storage-factory';
export type { PluginStorage } from './plugin-storage/plugin-storage';

/**
 * 存储初始化状态和错误信息
 */
export const storageInitialized = writable(false);
export const storageError = writable<string | null>(null);

/**
 * 每次调用 dbSavePlugin / dbDeletePlugin 后递增。
 * 组件订阅此 store 即可响应式感知已安装列表变化。
 */
export const installedPluginsRevision = writable(0);

// ─── 初始化存储和响应式回调 ──────────────────────────────────────

// 在模块加载时初始化存储后端
initPluginStorage()
	.then(() => {
		storageInitialized.set(true);
		console.log('[plugin-db] Storage initialized successfully');
	})
	.catch((err) => {
		const errorMsg = err instanceof Error ? err.message : String(err);
		storageError.set(errorMsg);
		console.error('[plugin-db] Failed to initialize storage:', err);
	});

// 绑定存储变化回调到 Svelte Store
setPluginListChangeCallback(() => {
	installedPluginsRevision.update((n) => n + 1);
});

/**
 * 等待存储初始化完成，超时时间为 5 秒。
 * 如果初始化失败会抛出错误。
 */
export async function ensureStorageInitialized(): Promise<void> {
	// 如果已经初始化，立即返回
	let initialized: boolean;
	storageInitialized.subscribe((v) => {
		initialized = v;
	})();

	if (initialized) return;

	// 等待初始化完成或超时
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			unsubscribe();
			reject(new Error('Storage initialization timeout'));
		}, 5000);

		const unsubscribe = storageInitialized.subscribe((initialized) => {
			if (initialized) {
				clearTimeout(timeout);
				unsubscribe();
				resolve();
			}
		});

		// 检查是否有初始化错误
		storageError.subscribe((error) => {
			if (error) {
				clearTimeout(timeout);
				unsubscribe();
				reject(new Error(`Storage initialization failed: ${error}`));
			}
		});
	});
}

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

// ─── 向后兼容的包装函数 ────────────────────────────────────────────

/**
 * @deprecated 使用 getPluginStorage().savePlugin() 代替
 */
export async function dbSavePlugin(plugin: InstalledPlugin): Promise<void> {
	await ensureStorageInitialized();
	return await getPluginStorage().savePlugin(plugin);
}

/**
 * @deprecated 使用 getPluginStorage().getPlugin() 代替
 */
export async function dbGetPlugin(id: string): Promise<InstalledPlugin | undefined> {
	await ensureStorageInitialized();
	return await getPluginStorage().getPlugin(id);
}

/**
 * @deprecated 使用 getPluginStorage().getAllPlugins() 代替
 */
export async function dbGetAllPlugins(): Promise<InstalledPlugin[]> {
	await ensureStorageInitialized();
	return await getPluginStorage().getAllPlugins();
}

/**
 * @deprecated 使用 getPluginStorage().deletePlugin() 代替
 */
export async function dbDeletePlugin(id: string): Promise<void> {
	await ensureStorageInitialized();
	await getPluginStorage().deletePlugin(id);
}

/**
 * @deprecated 使用 getPluginStorage().isInstalled() 代替
 */
export async function dbIsInstalled(id: string): Promise<boolean> {
	await ensureStorageInitialized();
	return await getPluginStorage().isInstalled(id);
}

// ─── Mod Asset CRUD ───────────────────────────────────────────────────────────

/**
 * @deprecated 使用 getPluginStorage().saveAsset() 代替
 */
export async function dbSaveAsset(asset: ModAsset): Promise<void> {
	await getPluginStorage().saveAsset(asset);
}

/**
 * @deprecated 使用 getPluginStorage().getAsset() 代替
 */
export async function dbGetAsset(key: string): Promise<ModAsset | undefined> {
	return await getPluginStorage().getAsset(key);
}

/**
 * @deprecated 使用 getPluginStorage().getAssetUrl() 代替
 */
export async function dbGetAssetUrl(key: string): Promise<string | null> {
	return await getPluginStorage().getAssetUrl(key);
}

/**
 * @deprecated 使用 getPluginStorage().deleteAssets() 代替
 */
export async function dbDeletePluginAssets(assetKeys: string[]): Promise<void> {
	await getPluginStorage().deleteAssets(assetKeys);
}
