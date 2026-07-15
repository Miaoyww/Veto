/**
 * plugin-registry.ts — 拉取远程注册表、下载 .vmod 包、注入 ModRegistry。
 */
import JSZip from 'jszip';
import type { PluginManifest, InstalledPlugin, ModAsset } from './plugin-db';
import { dbSavePlugin, dbSaveAsset } from './plugin-db';
import { registry } from '$lib/registry/mod-registry.svelte';
import type { ModData, ModMetadata } from '$lib/registry/types';

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

/**
 * 为 faction / campaign 类型插件从 zip 内按约定路径结构化提取 ModData。
 * 约定路径（根目录或 assets/ 子目录均可）：
 *   branches.json          → ModData.branches
 *   categories.json        → ModData.categories
 *   unitTemplates/*.json   → ModData.unitTemplates（自动合并所有文件）
 * 若 manifest.definitions 已存在，先以其为基础后再补充缺失字段。
 */
export async function buildStructuredModData(
	zip: JSZip,
	manifest: PluginManifest
): Promise<string | null> {
	let modData: ModData = {};

	// 若 manifest.definitions 存在，先读取作为基础
	if (manifest.definitions) {
		const defPath =
			typeof manifest.definitions === 'string'
				? manifest.definitions
				: Object.values(manifest.definitions)[0];
		const defFile = zip.file(defPath);
		if (defFile) {
			try {
				modData = JSON.parse(await defFile.async('string')) as ModData;
			} catch {
				/* ignore */
			}
		}
	}

	// branches.json
	if (!modData.branches) {
		const f = zip.file('branches.json') ?? zip.file('assets/branches.json');
		if (f) {
			try {
				modData.branches = JSON.parse(await f.async('string'));
			} catch {
				/* ignore */
			}
		}
	}

	// categories.json
	if (!modData.categories) {
		const f = zip.file('categories.json') ?? zip.file('assets/categories.json');
		if (f) {
			try {
				modData.categories = JSON.parse(await f.async('string'));
			} catch {
				/* ignore */
			}
		}
	}

	// unitTemplates/*.json — 合并目录下所有 JSON 文件
	if (!modData.unitTemplates) {
		const templateFiles = zip.filter(
			(path, f) =>
				!f.dir &&
				(path.startsWith('unitTemplates/') || path.startsWith('assets/unitTemplates/')) &&
				path.endsWith('.json')
		);
		if (templateFiles.length > 0) {
			const all: unknown[] = [];
			for (const f of templateFiles) {
				try {
					const parsed = JSON.parse(await f.async('string'));
					if (Array.isArray(parsed)) all.push(...parsed);
				} catch {
					/* ignore */
				}
			}
			if (all.length > 0) modData.unitTemplates = all as ModData['unitTemplates'];
		}
	}

	if (!modData.branches && !modData.categories && !modData.unitTemplates) return null;
	return JSON.stringify(modData);
}

const REGISTRY_URL =
	'https://raw.githubusercontent.com/VetoExpress/veto-plugins/main/dist/registry.json';

const STARS_URL = 'https://raw.githubusercontent.com/VetoExpress/veto-plugins/main/stars.json';

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
	console.log('Installing plugin ', manifest);
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
			throw new Error(`插件 "${manifest.name}" 哈希校验失败，文件可能已损坏或被篡改`);
		}
	}

	// 3. 内存解压
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(blob);
	} catch {
		throw new Error(`插件 "${manifest.name}" 解压失败：文件格式不正确`);
	}

	// 4. 读取 definitions / 结构化数据
	let definitions: string | null = null;
	if (manifest.type === 'faction' || manifest.type === 'campaign') {
		// faction / campaign：从 zip 内按约定路径结构化加载 branches / categories / unitTemplates
		definitions = await buildStructuredModData(zip, manifest);
	} else if (manifest.definitions) {
		const defPath =
			typeof manifest.definitions === 'string'
				? manifest.definitions
				: Object.values(manifest.definitions)[0];
		const defFile = zip.file(defPath);
		if (defFile) definitions = await defFile.async('string');
	}

	// 5. 读取 i18n
	const i18nRecord: Record<string, string> = {};
	// 按 manifest.i18n 指定路径加载
	if (manifest.i18n) {
		const i18nMap: Record<string, string> =
			typeof manifest.i18n === 'string' ? { default: manifest.i18n } : manifest.i18n;
		for (const [locale, path] of Object.entries(i18nMap)) {
			const f = zip.file(path);
			if (f) i18nRecord[locale] = await f.async('string');
		}
	}
	// faction / campaign：额外扫描 i18n/ 或 assets/i18n/ 目录（补充 manifest.i18n 未覆盖的 locale）
	if (manifest.type === 'faction' || manifest.type === 'campaign') {
		const i18nFiles = zip.filter(
			(path, f) =>
				!f.dir &&
				(path.startsWith('i18n/') || path.startsWith('assets/i18n/')) &&
				path.endsWith('.json')
		);
		for (const f of i18nFiles) {
			const locale =
				f.name
					.split('/')
					.pop()
					?.replace(/\.json$/i, '') ?? '';
			if (locale && !i18nRecord[locale]) {
				i18nRecord[locale] = await f.async('string');
			}
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

/** 将 InstalledPlugin 数据注入运行时 Mods */
export function injectToRegistry(plugin: InstalledPlugin): void {
	let metaData: ModMetadata = {
		id: plugin.manifest.id,
		name: plugin.manifest.name,
		version: plugin.manifest.version,
		author: plugin.manifest.author,
		description: plugin.manifest.description,
		source: 'user'
	};

	let modData: ModData = {
		id: plugin.id,
		metadata: metaData,
		type: plugin.manifest.type,
		i18n: plugin.i18n
	};

	if (plugin.definitions) {
		try {
			const parsed = JSON.parse(plugin.definitions) as ModData;
			// 保留 manifest 的关键元数据，避免被 definitions 中的旧值覆盖
			modData = {
				...parsed,
				id: plugin.id,
				metadata: metaData,
				type: plugin.manifest.type
			};
		} catch {
			// definitions 格式不兼容 ModData，跳过
		}
	}

	// 将所有 i18n locale 以多语言分层格式注入（plugin.i18n: locale → JSON 字符串）
	const i18nFromPlugin: Record<string, Record<string, string>> = {};
	for (const [locale, jsonStr] of Object.entries(plugin.i18n)) {
		try {
			i18nFromPlugin[locale] = JSON.parse(jsonStr) as Record<string, string>;
		} catch {
			/* ignore */
		}
	}
	if (Object.keys(i18nFromPlugin).length > 0) {
		// 将 definitions 中已有的 i18n 与 plugin.i18n 合并（plugin.i18n 优先）
		const defI18n = modData.i18n;
		if (defI18n) {
			const isLayered = typeof Object.values(defI18n)[0] === 'object';
			if (isLayered) {
				for (const [locale, keys] of Object.entries(
					defI18n as Record<string, Record<string, string>>
				)) {
					i18nFromPlugin[locale] = { ...keys, ...(i18nFromPlugin[locale] ?? {}) };
				}
			} else {
				// 扁平格式视为 zh-CN（默认语言）
				i18nFromPlugin['zh-CN'] = {
					...(defI18n as Record<string, string>),
					...(i18nFromPlugin['zh-CN'] ?? {})
				};
			}
		}
		modData = { ...modData, i18n: i18nFromPlugin };
	}

	registry.load(modData);
}
