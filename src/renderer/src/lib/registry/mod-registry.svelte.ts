import type {
	BranchDefinition,
	CategoryDefinition,
	UnitTemplate,
	ModData,
	ModMetadata
} from './types';
import type { PluginManifest } from '$lib/services/plugin-db';

/** Mod 元数据（轻量，仅从 manifest 读取，供大厅列表展示） */

// ── ModRegistry ───────────────────────────────────────────────────────────────

/**
 * ModRegistry — 全局单例注册表。
 *
 * 两级数据隔离：
 * - **_sys（系统快照）**：仅含 source='system' 的基础游戏数据，始终有效，不受战局影响。
 * - **_battle（战局快照）**：含系统数据 + 本局选定用户 Mod，仅在战局期间有效。
 *
 * 大厅状态：`registry.branches` 等访问系统快照。
 * 战局状态：`registry.branches` 等访问战局快照；大厅切换开关不影响此快照。
 */
class ModRegistry {
	/** 所有已注册 Mod 条目（按注入顺序）- Svelte 5 响应式状态 */
	private _entries = $state<ModData[]>([]);
	private _loaded: boolean = false;
	// ── 注册 ──────────────────────────────────────────────────────────────────

	/**
	 * 注入 Mod 数据包。同一 id 不会重复加载。
	 * - `source='system'`：立即写入系统快照，始终生效。
	 * - `source='user'`：仅登记元数据与数据包，**不写入任何快照**；
	 *   须调用 `prepareBattleRegistry()` 才能在战局中生效。
	 */
	load(mod: ModData): void {
		const id = mod.id ?? `_anon_${this._entries.length}`;
		if (this._entries.some((e) => e.id === id)) {
			console.log('[ModRegistry.load] duplicate detected:', id);
			return;
		}
		this._entries.push(mod);
		console.log('[ModRegistry.load] loaded:', id, 'total entries:', this._entries.length);
	}

	// ── 查询 API ──────────────────────────────────────────────────────────────
	/** 获取所有已注册 Mod 条目 */
	getModList(): ModData[] {
		const list = [...this._entries];
		console.log(
			'[ModRegistry.getModList]',
			list.length,
			list.map((m) => m.id)
		);
		return list;
	}
	getBranchesSize(): number {
		return this._entries.reduce((sum, mod) => sum + (mod.branches?.length ?? 0), 0);
	}
	getCategoriesSize(): number {
		return this._entries.reduce((sum, mod) => sum + (mod.categories?.length ?? 0), 0);
	}
	getUnitTemplatesSize(): number {
		return this._entries.reduce((sum, mod) => sum + (mod.unitTemplates?.length ?? 0), 0);
	}
	getMod(id: string): ModData | undefined {
		return this._entries.find((e) => e.id === id);
	}

	/** 重置所有数据（用于测试或热重载） */
	reset(): void {
		this._entries = [];
	}
}

// ── Mods ── 战局内实际启用的Mod ────────────────────────
class Mods {
	private readonly branches = new Map<string, BranchDefinition>();
	private readonly categories = new Map<string, CategoryDefinition>();
	private readonly unitTemplates = new Map<string, UnitTemplate>();
	private readonly _i18n = new Map<string, Map<string, string>>();

	private readonly _entries: ModData[] = [];
	/** 当前语言，默认 zh-CN */
	private _locale = 'zh-CN';

	/** 实际将 mod 数据写入各 Map */
	private _applyModData(mod: ModData): void {
		console.log(`Applying mod data: ${mod.id} - ${mod.metadata?.name}`);

		for (const branch of mod.branches ?? []) {
			this.branches.set(branch.id, branch);
		}

		for (const cat of mod.categories ?? []) {
			this.categories.set(cat.id, cat);
		}

		for (const template of mod.unitTemplates ?? []) {
			this.unitTemplates.set(template.id, template);
		}

		const i18nData = mod.i18n;
		if (i18nData) {
			const firstVal = Object.values(i18nData)[0];
			if (firstVal !== undefined && typeof firstVal === 'object') {
				for (const [locale, keys] of Object.entries(
					i18nData as Record<string, Record<string, string>>
				)) {
					if (!this._i18n.has(locale)) this._i18n.set(locale, new Map());
					const localeMap = this._i18n.get(locale)!;
					for (const [key, val] of Object.entries(keys)) localeMap.set(key, val);
				}
			} else {
				if (!this._i18n.has(this._locale)) this._i18n.set(this._locale, new Map());
				const localeMap = this._i18n.get(this._locale)!;
				for (const [key, val] of Object.entries(i18nData as Record<string, string>))
					localeMap.set(key, val);
			}
		}
		console.log(
			`Mod ${mod.id} applied: branches=${mod.branches?.length ?? 0}, categories=${mod.categories?.length ?? 0}, unitTemplates=${mod.unitTemplates?.length ?? 0}`
		);
		console.log('Mod', mod);
	}

	load(mod: ModData): void {
		const id = mod.id ?? `_anon_${this._entries.length}`;
		if (this._entries.some((e) => e.id === id)) return;

		this._applyModData(mod);
		this._entries.push(mod);
	}

	loadMods(modIds: string[]): void {
		for (const id of modIds) {
			const mod = registry.getMod(id);
			if (mod) this.load(mod);
		}
	}

	clear(): void {
		this.branches.clear();
		this.categories.clear();
		this.unitTemplates.clear();
		this._i18n.clear();
		this._entries.length = 0;
	}

	// ── 查询 API ──────────────────────────────────────────────────────────────
	get_branches(): Map<string, BranchDefinition> {
		return this.branches;
	}

	get_categories(): Map<string, CategoryDefinition> {
		return this.categories;
	}

	get_unitTemplates(): Map<string, UnitTemplate> {
		return this.unitTemplates;
	}

	private get_activeI18n(): Map<string, Map<string, string>> {
		return this._i18n;
	}

	setLocale(locale: string): void {
		this._locale = locale;
	}

	getLocale(): string {
		return this._locale;
	}

	getModList(): ModData[] {
		return [...this._entries];
	}

	getBranchTemplates(branchId: string): UnitTemplate[] {
		return [...this.unitTemplates.values()].filter((t) => t.branchId === branchId);
	}
	getCategoryTemplates(categoryId: string): UnitTemplate[] {
		return [...this.unitTemplates.values()].filter((t) => t.categoryId === categoryId);
	}
	getBranchCategories(branchId: string): CategoryDefinition[] {
		return [...this.categories.values()].filter((c) => c.branchId === branchId);
	}
	/**
	 * 万能标签解析函数。
	 * 查找顺序：当前语言 → 第一个可用语言 → defaultText → path 本身
	 */
	getLabel(path: string, defaultText?: string): string {
		const i18n = this.get_activeI18n();
		return (
			i18n.get(this._locale)?.get(path) ?? [...i18n.values()][0]?.get(path) ?? defaultText ?? path
		);
	}

	findTemplate(id: string): UnitTemplate | undefined {
		return this.unitTemplates.get(id);
	}

	getNatoCode(template: UnitTemplate): string {
		if (template.natoCode) return template.natoCode;
		const cat = this.categories.get(template.categoryId);
		if (cat?.natoCode) return cat.natoCode;
		return 'GUCI---';
	}
}
/** 全局 ModRegistry 单例 */
export const registry = new ModRegistry();

/** 全局 Mods 单例 */
export const mods = new Mods();

/** 插件加载完成的 Promise（由 +layout.svelte 触发） */
let pluginsReadyResolve: (() => void) | null = null;
export const pluginsReady = new Promise<void>((resolve) => {
	pluginsReadyResolve = resolve;
});

/** 标记插件加载完成（由 +layout.svelte 调用） */
export function markPluginsReady() {
	if (pluginsReadyResolve) {
		pluginsReadyResolve();
		pluginsReadyResolve = null;
	}
}
