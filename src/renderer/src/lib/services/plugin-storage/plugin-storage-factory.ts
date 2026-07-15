/**
 * plugin-storage-factory.ts — 存储后端工厂函数
 *
 * 使用 IndexedDB 作为存储后端（Electron 环境）。
 */

import type { PluginStorage } from './plugin-storage';
import { IndexedDBPluginStorage } from './plugin-storage-idb';

let storageInstance: PluginStorage | null = null;

/**
 * 初始化存储后端
 * 应在应用启动时调用一次
 *
 * @returns 初始化后的存储实例
 * @throws 初始化失败时抛出错误
 */
export async function initPluginStorage(): Promise<PluginStorage> {
	if (storageInstance) return storageInstance;

	try {
		storageInstance = new IndexedDBPluginStorage();
		console.log('[PluginStorage] Initialized with IndexedDB backend');
	} catch (err) {
		console.error('[PluginStorage] Initialization failed:', err);
		throw err;
	}

	return storageInstance;
}

/**
 * 获取存储实例
 * 必须在 initPluginStorage() 之后调用
 *
 * @returns 存储实例
 * @throws 未初始化时抛出错误
 */
export function getPluginStorage(): PluginStorage {
	if (!storageInstance) {
		throw new Error(
			'PluginStorage not initialized. Call initPluginStorage() first.'
		);
	}
	return storageInstance;
}

/**
 * 重置存储实例（仅用于测试或重新初始化）
 */
export function resetPluginStorage(): void {
	storageInstance = null;
}
