/**
 * plugin-storage.ts — 存储抽象接口
 *
 * 定义平台无关的插件存储操作，允许不同平台有不同实现：
 * - Web (Vercel): IndexedDB 实现
 * - Tauri (Desktop): 文件系统实现
 */

import type { InstalledPlugin, PluginManifest, ModAsset } from '../plugin-db';

/**
 * 响应式版本号 Store（通知 UI 插件列表已变化）
 * 每次调用 savePlugin / deletePlugin 后，实现应调用 `notifyPluginListChanged()`
 */
export let onPluginListChanged: (() => void) | null = null;

export function setPluginListChangeCallback(callback: () => void): void {
	onPluginListChanged = callback;
}

/**
 * 抽象存储接口 — 实现类应实现所有方法
 */
export interface PluginStorage {
	// ─── 初始化 ────────────────────────────────────────────────────────

	/**
	 * 初始化存储后端（可选）
	 * 用于异步初始化操作（如创建目录、打开数据库连接等）
	 * 调用其他方法前会自动调用此方法
	 * @throws 初始化失败时抛出错误
	 */
	init?(): Promise<void>;

	// ─── Plugin 元数据存储 ──────────────────────────────────────────────

	/**
	 * 保存或更新插件记录
	 * @param plugin 安装的插件数据
	 * @throws 存储失败时抛出错误
	 */
	savePlugin(plugin: InstalledPlugin): Promise<void>;

	/**
	 * 获取单个插件记录
	 * @param id 插件 ID
	 * @returns 插件数据或 undefined
	 */
	getPlugin(id: string): Promise<InstalledPlugin | undefined>;

	/**
	 * 获取所有已安装插件
	 * @returns 插件数组
	 */
	getAllPlugins(): Promise<InstalledPlugin[]>;

	/**
	 * 删除插件及其所有资源
	 * @param id 插件 ID
	 * @throws 删除失败时抛出错误
	 */
	deletePlugin(id: string): Promise<void>;

	/**
	 * 检查插件是否已安装
	 * @param id 插件 ID
	 * @returns 是否存在
	 */
	isInstalled(id: string): Promise<boolean>;

	// ─── Asset 资源存储 ────────────────────────────────────────────────

	/**
	 * 保存或更新资源（图片、地图等）
	 * @param asset 资源条目
	 * @throws 存储失败时抛出错误
	 */
	saveAsset(asset: ModAsset): Promise<void>;

	/**
	 * 获取资源
	 * @param key 资源键，格式 "{pluginId}/{assetPath}"
	 * @returns 资源或 undefined
	 */
	getAsset(key: string): Promise<ModAsset | undefined>;

	/**
	 * 获取资源的可显示 URL
	 * - Web: blob: URL
	 * - Tauri: file:// URL 或自定义协议
	 * @param key 资源键
	 * @returns 可用 URL 或 null
	 */
	getAssetUrl(key: string): Promise<string | null>;

	/**
	 * 删除单个资源
	 * @param key 资源键
	 * @throws 删除失败时抛出错误
	 */
	deleteAsset(key: string): Promise<void>;

	/**
	 * 删除一组资源（通常在卸载插件时）
	 * @param keys 资源键数组
	 * @throws 删除失败时抛出错误
	 */
	deleteAssets(keys: string[]): Promise<void>;

	// ─── 元数据查询 ────────────────────────────────────────────────────

	/**
	 * 获取所有资源键（可选实现，某些平台可能不需要）
	 * @returns 所有资源键
	 */
	getAllAssetKeys?(): Promise<string[]>;

	/**
	 * 清空所有数据（仅用于测试或完全重置）
	 * @throws 清空失败时抛出错误
	 */
	clear?(): Promise<void>;
}
