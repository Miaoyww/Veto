import { writable } from 'svelte/store';
import type { BranchDefinition, CategoryDefinition, UnitTemplate, ModData } from './types';

/**
 * 每次 registry 数据变化（inject / setModEnabled）时递增。
 * Svelte 组件订阅此 store 即可响应式感知注册表更新。
 */
export const registryRevision = writable(0);

export interface LoadedMod {
	mod: ModData;
	enabled: boolean;
	/** 'system' = 基础游戏数据，'user' = 用户安装的 Mod */
	source: 'system' | 'user';
}

/**
 * ModRegistry — 全局单例注册表，所有军种/大类/单位模板/i18n 文本均通过此注册。
 *
 * 设计原则：
 * - 引擎是"空壳"，所有数据（军种、状态名、单位类型）均来自注册表
 * - 基础游戏和 Mod 使用完全相同的 inject(ModData) 接口
 * - 后注入的数据覆盖先前的同名条目（Mod 热补丁机制）
 *
 * @example 注入"星际文明"军种
 * ```ts
 * import { registry } from '$lib/registry/mod-registry';
 *
 * registry.inject({
 *   id: 'example.stellar-civ',
 *   branches: [{ id: 'stellar_force' }],
 *   categories: [{
 *     id: 'stellar_force.vanguard',
 *     branchId: 'stellar_force',
 *     natoCode: 'AFM----',
 *     componentGroups: [{ key: 'ships', types: ['dreadnought', 'cruiser'], qualities: ['mk1', 'mk2'], defaultCount: 5 }]
 *   }],
 *   unitTemplates: [{
 *     id: 'stellar-dreadnought',
 *     name: '无畏级战舰',
 *     branchId: 'stellar_force',
 *     categoryId: 'stellar_force.vanguard',
 *     tags: ['can_strike'],
 *     stats: { maxHp: 500, maxOrg: 200, softAttack: 80, hardAttack: 120, airAttack: 60, defense: 50, speed: 3000, attackRange: 800, hardness: 0.9 }
 *   }],
 *   i18n: {
 *     'branch.stellar_force': '星际军',
 *     'category.stellar_force.vanguard': '先锋舰队',
 *     'status.moving': '跃迁',      // 覆盖基础游戏"行军"
 *     'status.attacking': '轨道轰炸' // 覆盖基础游戏"攻击"
 *   }
 * });
 * ```
 */
class ModRegistry {
	/** 已注册军种（id → BranchDefinition） */
	readonly branches = new Map<string, BranchDefinition>();
	/** 已注册单位大类（id → CategoryDefinition） */
	readonly categories = new Map<string, CategoryDefinition>();
	/** 已注册单位模板（id → UnitTemplate） */
	readonly unitTemplates = new Map<string, UnitTemplate>();

	/** locale → (key → text) */
	private readonly _i18n = new Map<string, Map<string, string>>();
	/** 当前语言，默认 zh-CN */
	private _locale = 'zh-CN';
	/** 按注入顺序存储所有 Mod，含启用状态 */
	private readonly _mods: LoadedMod[] = [];

	/**
	 * 注入 Mod 数据包。同一 id 的 Mod 不会重复加载。
	 * 各 Map 条目：后注入覆盖先注入。
	 */
	inject(mod: ModData, source: LoadedMod['source'] = 'user'): void {
		const id = mod.id ?? `_anon_${this._mods.length}`;
		const normalized = { ...mod, id };
		if (this._mods.some((m) => m.mod.id === id)) return;

		// faction / scenario / ruleset / campaign 需战局显式激活，默认禁用
		// utility / dependency 以及系统数据立即激活
		const DEFERRED_TYPES = new Set(['faction', 'scenario', 'ruleset', 'campaign']);
		const enabledByDefault =
			source === 'system' || !DEFERRED_TYPES.has(normalized.type ?? '');

		this._mods.push({ mod: normalized, enabled: enabledByDefault, source });
		if (enabledByDefault) {
			this._applyModData(normalized);
			registryRevision.update((n) => n + 1);
		}
	}

	/** 实际将 mod 数据写入各 Map */
	private _applyModData(mod: ModData): void {
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
				for (const [locale, keys] of Object.entries(i18nData as Record<string, Record<string, string>>)) {
					if (!this._i18n.has(locale)) this._i18n.set(locale, new Map());
					const localeMap = this._i18n.get(locale)!;
					for (const [key, val] of Object.entries(keys)) localeMap.set(key, val);
				}
			} else {
				if (!this._i18n.has(this._locale)) this._i18n.set(this._locale, new Map());
				const localeMap = this._i18n.get(this._locale)!;
				for (const [key, val] of Object.entries(i18nData as Record<string, string>)) localeMap.set(key, val);
			}
		}
	}

	/** 启用/禁用某个 Mod（触发全量重建） */
	setModEnabled(id: string, enabled: boolean): void {
		const entry = this._mods.find((m) => m.mod.id === id);
		if (!entry || entry.enabled === enabled) return;
		entry.enabled = enabled;
		console.log(`Mod ${enabled ? 'enabled' : 'disabled'}:`, entry.mod.name);
		this._rebuild();
	}

	/** 重建 Map 数据（按已启用 Mod 顺序重新注入） */
	private _rebuild(): void {
		this.branches.clear();
		this.categories.clear();
		this.unitTemplates.clear();
		this._i18n.clear();
		for (const { mod, enabled } of this._mods) {
			if (enabled) this._applyModData(mod);
		}
		registryRevision.update((n) => n + 1);
	}

	/** 获取所有已加载 Mod 列表（含启用状态） */
	getModList(): LoadedMod[] {
		return [...this._mods];
	}

	/** 设置当前语言（如 'zh-CN'、'en'） */
	setLocale(locale: string): void {
		this._locale = locale;
	}

	/** 获取当前语言 */
	getLocale(): string {
		return this._locale;
	}

	/**
	 * 万能标签解析函数。
	 * 查找顺序：当前语言 → 第一个可用语言 → defaultText → path 本身
	 * @param path  点路径，如 "branch.army"、"status.moving"、"type.infantry.light"
	 * @param defaultText  找不到时的回退文本
	 */
	getLabel(path: string, defaultText?: string): string {
		return (
			this._i18n.get(this._locale)?.get(path) ??
			[...this._i18n.values()][0]?.get(path) ??
			defaultText ??
			path
		);
	}

	/** 按 id 查找单位模板 */
	findTemplate(id: string): UnitTemplate | undefined {
		return this.unitTemplates.get(id);
	}

	/** 获取指定军种下所有单位模板 */
	getBranchTemplates(branchId: string): UnitTemplate[] {
		return [...this.unitTemplates.values()].filter((t) => t.branchId === branchId);
	}

	/** 获取指定大类下所有单位模板 */
	getCategoryTemplates(categoryId: string): UnitTemplate[] {
		return [...this.unitTemplates.values()].filter((t) => t.categoryId === categoryId);
	}

	/** 获取指定军种下所有大类 */
	getBranchCategories(branchId: string): CategoryDefinition[] {
		return [...this.categories.values()].filter((c) => c.branchId === branchId);
	}

	/**
	 * 解析单位模板的北约 SIDC 功能代码（7 字符）。
	 * 优先级：template.natoCode > category.natoCode > 默认回退 "GUCI---"（地面步兵）
	 */
	getNatoCode(template: UnitTemplate): string {
		if (template.natoCode) return template.natoCode;
		const cat = this.categories.get(template.categoryId);
		if (cat?.natoCode) return cat.natoCode;
		return 'GUCI---'; // 默认 Ground Infantry
	}

	/**
	 * 重置所有注册数据（通常仅用于测试或热重载）。
	 * 调用后需重新调用 inject() 加载基础游戏数据。
	 */
	reset(): void {
		this.branches.clear();
		this.categories.clear();
		this.unitTemplates.clear();
		this._i18n.clear();
		this._mods.length = 0;
	}
}

/** 全局 ModRegistry 单例 */
export const registry = new ModRegistry();
