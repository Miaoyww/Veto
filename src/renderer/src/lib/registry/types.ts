// ============ 动态注册表类型定义 ============
// 所有硬编码的 Branch/Category/UnitType 枚举均已废除，统一用 string ID。

import type { PluginManifest } from "$lib/services/plugin-db";

/**
 * 灵活战斗属性字典。
 * 内置键：maxHp, maxOrg, softAttack, hardAttack, airAttack, defense, speed, attackRange, hardness
 * Mod 可自由添加新属性键（如 shield, fuel, psi_energy 等）。
 */
export type FlexStats = Record<string, number>;

/**
 * 单位编成组件条目。
 * type / quality 均为字符串 ID，由注册表的 i18n 提供显示文本。
 */
export interface ComponentEntry {
	id: string;
	/** 子类型 ID（如 "light"、"main_tank"，由 Mod 定义） */
	type: string;
	/** 装备质量 ID（如 "standard"、"gen4plus"，由 Mod 定义） */
	quality: string;
	count: number;
}

/**
 * 单位大类中某个组件分组的类型/质量配置。
 * 用于 UI 动态渲染创建单位的下拉菜单，无需硬编码。
 */
export interface ComponentTypeGroup {
	/** 组件分组键名，与 UnitTemplate.components 中的键一致（如 "infantry"、"missiles"） */
	key: string;
	/** 可选类型 ID 列表（如 ["light", "mechanized", "airborne", "marine"]） */
	types: string[];
	/** 可选质量 ID 列表（如 ["basic", "standard", "advanced", "elite"]） */
	qualities: string[];
	/** 新建时的默认数量 */
	defaultCount: number;
}

/** 军种定义 */
export interface BranchDefinition {
	id: string;
	/** 可选：北约符号框类型（保留扩展） */
	natoFrame?: string;
}

/**
 * 单位大类定义（如陆军步兵、海军水面舰艇）。
 * 通过 branchId 挂载到对应军种，可携带北约 SIDC 代码和组件类型配置。
 */
export interface CategoryDefinition {
	id: string;
	/** 所属军种 ID */
	branchId: string;
	/**
	 * 北约 SIDC 功能代码（维度字符 + 6 位功能 ID，共 7 字符）。
	 * 示例：陆军步兵 "GUCI---"，海军水面 "SC-----"，航空 "AMF----"
	 * UnitTemplate.natoCode 可覆盖此值。
	 */
	natoCode?: string;
	/** 组件分组配置（UI 渲染单位创建表单时使用） */
	componentGroups?: ComponentTypeGroup[];
}

/**
 * 单位模板（注册到 ModRegistry，Faction.units 中存储的就是此类型）。
 * 替代原先硬编码的 ArmyUnit / NavyUnit / AirForceUnit 三叉结构。
 */
export interface UnitTemplate {
	id: string;
	name: string;
	/** 所属军种 ID */
	branchId: string;
	/** 所属大类 ID */
	categoryId: string;
	/**
	 * 北约 SIDC 功能代码（覆盖 CategoryDefinition.natoCode）。
	 * 格式：维度(1) + 功能ID(6) = 7 字符，如 "GUCI---"。
	 */
	natoCode?: string;
	/**
	 * 能力标签（引擎逻辑 & 规则判断用）。
	 * 示例：["can_strike"] 表示可设置打击目标。
	 * Mod 可自由添加新标签。
	 */
	tags?: string[];
	/** 战斗属性字典（Mod 可添加任意数值键） */
	stats: FlexStats;
	/**
	 * 编成组件分组（key 为分组名，如 "infantry"、"armor"、"missiles"）。
	 * 替代原先的 infantry[]、armor[]、missiles[] 固定字段。
	 */
	components?: Record<string, ComponentEntry[]>;
}

/** Mod 战斗公式覆盖（均为可选，未提供则使用引擎默认值） */
export interface ModCombatOverrides {
	/** HP 伤害分配比例（0-1），默认 0.7 */
	hpDamageRatio?: number;
	/** Org 伤害分配比例（0-1），默认 0.3 */
	orgDamageRatio?: number;
	/** 防御减伤系数，默认 0.5 */
	defenseCoeff?: number;
	/** 组织度惩罚阈值（低于此比例时开始衰减），默认 0.2 */
	orgPenaltyThreshold?: number;
	/** 战斗结算间隔（真实毫秒），默认 500 */
	combatIntervalMs?: number;
}

export interface ModMetadata {
	id: string;
	name?: string;
	version?: string;
	author?: string;
	description?: string;
	type?: ModData['type'];
	source: 'system' | 'user';
}

/**
 * Mod 注入数据包。
 * 基础游戏通过 registry.inject(baseData) 加载；
 * 用户 Mod 也使用完全相同的接口，后注入的数据会覆盖先前已有条目。
 *
 * @example
 * // 注入"星际文明"军种
 * registry.inject({
 *   id: 'stellar-civ',
 *   branches: [{ id: 'stellar_force' }],
 *   categories: [{ id: 'stellar_force.vanguard', branchId: 'stellar_force', natoCode: 'AFM----' }],
 *   i18n: {
 *     'branch.stellar_force': '星际军',
 *     'status.moving': '跃迁',   // 覆盖基础游戏的"行军"
 *   }
 * });
 */
export interface ModData {
	/** Mod 唯一标识符（防止重复加载）。建议格式：'author.mod-name' */
	id?: string;
	metadata?: ModMetadata;
	/**
	 * Mod 类型。
	 * - faction / scenario / ruleset / campaign：需由战局显式激活才加载
	 * - utility / dependency：注入时立即激活
	 */
	type?: 'faction' | 'scenario' | 'ruleset' | 'campaign' | 'utility' | 'dependency';
	dependencies?: string[];
	conflicts?: string[];
	/** 新增军种定义（后注入可覆盖同 id 的条目） */
	branches?: BranchDefinition[];
	/** 新增单位大类定义 */
	categories?: CategoryDefinition[];
	/** 新增/覆盖单位模板 */
	unitTemplates?: UnitTemplate[];

	/**
	 * 国际化文本，支持两种格式：
	 * - 扁平格式（单语言/兼容旧版）：{ "branch.army": "陆军" }，将作为默认语言存储
	 * - 分层格式（多语言）：{ "zh-CN": { "branch.army": "陆军" }, "en": { "branch.army": "Army" } }
	 * 后注入的值覆盖先前已有的同名键。
	 */
	i18n?: Record<string, string> | Record<string, Record<string, string>>;
	/** 战斗公式覆盖 */
	combatOverrides?: ModCombatOverrides;

}
