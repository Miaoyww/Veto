/**
 * plugin-storage-factory.ts — 存储后端工厂函数
 *
 * Electron 桌面环境：插件存储由主进程管理（文件系统），
 * 渲染进程通过 IPC (window.veto) 访问。
 *
 * 此文件保留 PluginStorage 接口以实现向后兼容，
 * 但推荐使用 window.veto.plugins / window.veto.assets API。
 */

import type { PluginStorage } from './plugin-storage';

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
		// Electron 桌面环境：主进程管理文件系统存储
		// 渲染进程通过 IPC 访问，此接口保留用于兼容
		const { IndexedDBPluginStorage } = await import('./plugin-storage-idb');
		storageInstance = new IndexedDBPluginStorage();
		console.log('[PluginStorage] Initialized with IndexedDB backend (legacy compatibility)');
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
