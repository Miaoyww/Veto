// ============ 注册表类型 & 单例（再导出供其他模块使用） ============
export type {
	FlexStats,
	ComponentEntry,
	ComponentTypeGroup,
	BranchDefinition,
	CategoryDefinition,
	UnitTemplate,
	ModCombatOverrides,
	ModData
} from '$lib/registry/types';

export { registry } from '$lib/registry/mod-registry.svelte';

// ============ 阵营立场 ============

/**
 * 阵营立场（决定北约图标框架颜色）。
 * 开放字符串：内置值为 'blue' | 'red' | 'neutral'，Mod 可自定义新立场。
 */
export type UnitSide = string;

// ============ 地图上放置的单位 ============

import type { FlexStats } from '$lib/registry/types';

export interface PlacedUnit {
	id: string;
	/** 引用 Faction.units 中某个 UnitTemplate 的 id */
	unitId: string;
	factionId: string;
	lat: number;
	lng: number;
	/** 行动路线坐标点 */
	route: [number, number][];
	/** 打击目标坐标 */
	strikeTarget?: { lat: number; lng: number };
	/** 打击范围半径（米） */
	strikeRadius: number;
	/**
	 * 单位状态（开放字符串，Mod 可自定义新状态，如"跃迁"）。
	 * 内置值：'idle' | 'moving' | 'attacking' | 'defending' | 'retreating' | 'destroyed'
	 */
	status: string;
	/**
	 * 可选覆盖：覆盖从模板/大类推导的北约符号功能代码（7 字符：维度 + 功能ID）。
	 * 示例："GUCI---" 表示地面步兵。
	 */
	natoCode?: string;
	/** 当前生命值（运行时状态，耗尽则单位被摧毁） */
	hp: number;
	/** 当前组织度（运行时状态，耗尽则单位溃退） */
	org: number;
	/**
	 * 运行时战斗属性（从 UnitTemplate.stats 初始化，运行时可因战损/Mod 偏离）。
	 * 灵活字典：内置键 maxHp/maxOrg/softAttack/hardAttack/airAttack/defense/speed/attackRange/hardness，
	 * Mod 可添加任意属性键（如 shield、fuel、psi_energy）。
	 * 伤害公式：effectiveDmg = softAttack × (1 - hardness) + hardAttack × hardness
	 */
	stats: FlexStats;
}

// ============ 势力 ============

import type { UnitTemplate } from '$lib/registry/types';

export interface Faction {
	id: string;
	name: string;
	color: string;
	/** 阵营立场（决定北约图标框架颜色） */
	side: UnitSide;
	/** 国旗 URL（可选） */
	flagUrl?: string;
	/** 该势力拥有的单位模板列表（可来自全局注册表或自定义） */
	units: UnitTemplate[];
}

// ============ 突发事件配置 ============

export interface EventSetting {
	id: string;
	label: string;
	enabled: boolean;
	/** 触发概率 0-100 */
	probability: number;
}

// ============ 战局 ============

export interface Battle {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	/** 地图中心 */
	mapCenter: [number, number];
	mapZoom: number;
	factions: Faction[];
	placedUnits: PlacedUnit[];
	/** 行动日志 */
	actionLog: ActionLogEntry[];
	/** 推演起始日期（ISO 日期字符串 YYYY-MM-DD） */
	startDate?: string;
	/** 时间流速倍率（模拟秒/真实秒） */
	timeScale?: number;
	/** 地图比例尺（像素/千米） */
	pixelsPerKm?: number;
	/** 图标风格 */
	iconStyle?: 'nato' | 'simple';
	/** 突发事件配置列表 */
	eventSettings?: EventSetting[];
	/** 此战局启用的 Mod ID 列表，按加载顺序排列（越靠后优先级越高） */
	enabledMods?: string[];
}

export interface ActionLogEntry {
	id: string;
	timestamp: number;
	message: string;
}
