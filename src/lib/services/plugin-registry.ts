/**
 * plugin-registry.ts — 拉取远程注册表、下载 .vmod 包、注入 ModRegistry。
 */
import JSZip from 'jszip';
import type { PluginManifest, InstalledPlugin, ModAsset } from './plugin-db';
import { dbSavePlugin, dbSaveAsset } from './plugin-db';
import { registry } from '$lib/registry/mod-registry';
import type { ModData } from '$lib/registry/types';

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg)$/i;

/** 根据文件名猜测 MIME 类型 */
function guessMime(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	const map: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml'
	};
	return map[ext] ?? 'application/octet-stream';
}

/** 计算 Blob 的 SHA-256 十六进制摘要 */
async function sha256Hex(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** 从已加载的 JSZip 实例中提取全部图片资源并存入 IndexedDB */
async function extractAndSaveAssets(zip: JSZip, pluginId: string): Promise<string[]> {
	const imageFiles = zip.filter((_, f) => !f.dir && IMAGE_EXTENSIONS.test(f.name));
	const assetKeys: string[] = [];
	for (const f of imageFiles) {
		const blob = await f.async('blob');
		const key = `${pluginId}/${f.name}`;
		const asset: ModAsset = { key, blob, mimeType: guessMime(f.name) };
		await dbSaveAsset(asset);
		assetKeys.push(key);
	}
	return assetKeys;
}

const REGISTRY_URL =
	'https://raw.githubusercontent.com/VetoExpress/veto-plugins/main/dist/registry.json';

const STARS_URL =
	'https://raw.githubusercontent.com/VetoExpress/veto-plugins/main/stars.json';
	

/** 拉取远程注册表列表 */
export async function fetchPluginRegistry(): Promise<PluginManifest[]> {
	const res = await fetch(REGISTRY_URL);
	if (!res.ok) throw new Error(`获取注册表失败：HTTP ${res.status}`);
	return res.json() as Promise<PluginManifest[]>;
}

/** 拉取插件 Star 数（key 格式："owner/id"，如 "VetoExpress/veto-modern-war"） */
export async function fetchPluginStars(): Promise<Record<string, number>> {
	try {
		const res = await fetch(STARS_URL);
		if (!res.ok) return {};
		return res.json() as Promise<Record<string, number>>;
	} catch {
		return {};
	}
}

/**
 * 下载 .vmod 包并持久化到 IndexedDB，同时注入运行时 ModRegistry。
 *
 * 流程：单次 fetch → (可选) SHA-256 校验 → JSZip 内存解压
 *       → 提取 definitions / i18n / 图片资源 → IndexedDB → ModRegistry
 */
export async function installPlugin(manifest: PluginManifest): Promise<InstalledPlugin> {
	console.log("Installing plugin ",manifest);
	if (!manifest.download_url) {
		throw new Error(`插件 "${manifest.name}" 缺少 download_url，无法下载`);
	}

	// 1. 单次下载 .vmod
	const res = await fetch(manifest.download_url);
	if (!res.ok) throw new Error(`下载插件失败：HTTP ${res.status}`);
	const blob = await res.blob();

	// 2. (可选) SHA-256 哈希校验
	if (manifest.hash) {
		const actual = await sha256Hex(blob);
		if (actual !== manifest.hash) {
			throw new Error(
				`插件 "${manifest.name}" 哈希校验失败，文件可能已损坏或被篡改`
			);
		}
	}

	// 3. 内存解压
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(blob);
	} catch {
		throw new Error(`插件 "${manifest.name}" 解压失败：文件格式不正确`);
	}

	// 4. 读取 definitions
	let definitions: string | null = null;
	if (manifest.definitions) {
		const defPath =
			typeof manifest.definitions === 'string'
				? manifest.definitions
				: Object.values(manifest.definitions)[0];
		const defFile = zip.file(defPath);
		if (defFile) definitions = await defFile.async('string');
	}

	// 5. 读取 i18n
	const i18nRecord: Record<string, string> = {};
	if (manifest.i18n) {
		const i18nMap: Record<string, string> =
			typeof manifest.i18n === 'string' ? { default: manifest.i18n } : manifest.i18n;
		for (const [locale, path] of Object.entries(i18nMap)) {
			const f = zip.file(path);
			if (f) i18nRecord[locale] = await f.async('string');
		}
	}

	// 6. 提取图片资源并存入 IndexedDB
	const assetKeys = await extractAndSaveAssets(zip, manifest.id);

	// 7. 持久化插件记录
	// 使用 JSON 序列化/反序列化剥离 Svelte 响应式代理，确保对象可被 IndexedDB 结构化克隆
	const record: InstalledPlugin = {
		id: manifest.id,
		manifest: JSON.parse(JSON.stringify(manifest)),
		definitions,
		i18n: i18nRecord,
		assetKeys,
		installedAt: Date.now()
	};
	await dbSavePlugin(record);

	// 8. 注入运行时 ModRegistry
	injectToRegistry(record);

	return record;
}

/** 将 InstalledPlugin 数据注入运行时 ModRegistry */
export function injectToRegistry(plugin: InstalledPlugin): void {
	let modData: ModData = { id: plugin.id, name: plugin.manifest.name, version: plugin.manifest.version, author: plugin.manifest.author };

	if (plugin.definitions) {
		try {
			const parsed = JSON.parse(plugin.definitions) as ModData;
			modData = { ...parsed, id: plugin.id, name: plugin.manifest.name };
		} catch {
			// definitions 格式不兼容 ModData，跳过
		}
	}

	// 合并 i18n（优先 zh-CN，回退 default）
	const i18nSource = plugin.i18n['zh-CN'] ?? plugin.i18n['zh-cn'] ?? plugin.i18n['default'];
	if (i18nSource) {
		try {
			const i18nParsed = JSON.parse(i18nSource) as Record<string, string>;
			modData = { ...modData, i18n: { ...(modData.i18n as Record<string, string> ?? {}), ...i18nParsed } };
		} catch {
			// 忽略
		}
	}

	registry.inject(modData, 'user');
}
