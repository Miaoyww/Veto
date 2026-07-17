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

export { registry, mods } from '$lib/registry/mod-registry.svelte';

// ============ 阵营立场 ============

/**
 * 阵营立场（决定北约图标框架颜色）。
 * 开放字符串：内置值为 'blue' | 'red' | 'neutral'，Mod 可自定义新立场。
 */
export type UnitSide = string;

// ============ 战役相关类型 ============

/** 战役地图配置 */
export interface CampaignMapConfig {
	center: [number, number];
	zoom: number;
	pixelsPerKm?: number;
	/** 战役起始日期（ISO 格式 YYYY-MM-DD） */
	startDate?: string;
}

/** 战役初始部署 */
export interface CampaignDeployment {
	factions: CampaignFactionDeployment[];
}

export interface CampaignFactionDeployment {
	name: string;
	color: string;
	side: UnitSide;
	flagUrl?: string;
	initialUnits: CampaignUnitPlacement[];
}

export interface CampaignUnitPlacement {
	unitTemplateId: string;
	name?: string;
	lat: number;
	lng: number;
	route?: [number, number][];
	status?: string;
	/** 该单位装备的传感器 ID 列表（Phase 3） */
	sensorIds?: string[];
}

/** 设施类型 */
export type FacilityType =
	| 'fortress'
	| 'trench_network'
	| 'supply_depot'
	| 'railway_hub'
	| 'airfield'
	| 'artillery_position'
	| 'command_post'
	| 'hospital';

/** 设施 */
export interface Facility {
	id: string;
	type: FacilityType;
	name: string;
	lat: number;
	lng: number;
	factionId?: string;
	properties: Record<string, number>;
	maxCapacity?: number;
}

// ============ 状态系统（Phase 4） ============

/** 状态效果定义（可在 Mod 中注册） */
export interface StatusDefinition {
	id: string;
	name: string;
	description?: string;
	/** 属性乘数（1.0 = 不变，如 { defense: 2.0, speed: 0 } 表示防御翻倍、速度归零） */
	modifiers?: Record<string, number>;
	/** 默认持续时间（模拟秒，undefined = 永久直到被移除） */
	defaultDuration?: number;
	/** 互斥类别（同类别只保留最高优先级） */
	category?: 'posture' | 'condition' | 'ability';
	/** 优先级（同类别中数值越高越优先） */
	priority?: number;
	/** 行为标签 */
	tags?: string[];
}

/** 单位身上激活的状态效果实例 */
export interface StatusInstance {
	statusId: string;
	/** 生效时的模拟时间戳（ms epoch） */
	appliedAt: number;
	/** 持续时间（模拟秒，undefined = 永久） */
	duration?: number;
	/** 来源标识（eventId、"combat"、"command" 等） */
	source?: string;
}

/** 单位行为姿态（Phase 5） */
export type UnitBehavior = 'aggressive' | 'defensive' | 'cautious' | 'hold';

/** 传感器类型（Phase 3 使用） */
export type SensorType = 'visual' | 'sigint' | 'passive_acoustic';

/** 传感器定义（Phase 3 使用） */
export interface SensorDefinition {
	id: string;
	type: SensorType;
	properties: Record<string, number | boolean | string>;
}

/** 单位方向信号特征（Phase 3 使用） */
export interface UnitSignatures {
	visual?: { front: number; side: number; rear: number; top: number };
	acoustic?: { front: number; side: number; rear: number; top: number };
}

/** 接触/侦察标记（Phase 3 使用） */
export interface Contact {
	id: string;
	position: { lat: number; lng: number };
	uncertaintyRadius: number;
	identityLevel: 'activity' | 'estimated_size' | 'confirmed';
	estimatedType?: string;
	confirmedUnitId?: string;
	lastUpdated: number;
}

/** 战役事件（Phase 6 使用） */
export type EventTriggerType =
	| 'date'
	| 'unit_destroyed'
	| 'unit_enters_zone'
	| 'facility_captured'
	| 'variable';

export type EventConditionType =
	| 'faction_alive'
	| 'unit_count'
	| 'random'
	| 'facility_held'
	| 'variable_compare';

export type EventActionType =
	| 'spawn_unit'
	| 'send_message'
	| 'apply_status'
	| 'modify_stats'
	| 'change_faction_attitude'
	| 'activate_event'
	| 'set_variable';

export interface CampaignEvent {
	id: string;
	name: string;
	repeatable: boolean;
	cooldown?: number;
	trigger: { type: EventTriggerType; params: Record<string, unknown> };
	conditions: Array<{ type: EventConditionType; params: Record<string, unknown> }>;
	actions: Array<{ type: EventActionType; params: Record<string, unknown> }>;
}

export interface CampaignEventState {
	eventId: string;
	triggered: boolean;
	lastTriggerTime?: number;
}

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
	/** 激活的状态效果列表（Phase 4） */
	statusEffects?: import('./types').StatusInstance[];
	/** 该单位装备的传感器 ID 列表（Phase 3，覆盖模板默认值） */
	sensorIds?: string[];
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
	/** 关联的战役 Mod ID */
	campaignId?: string;
	/** 设施列表（Phase 2 使用） */
	facilities?: Facility[];
	/** 各阵营的侦察接触列表（Phase 3 使用） */
	factionContacts?: Record<string, Contact[]>;
	/** 战争迷雾开关（Phase 3，默认 false = 上帝视角全可见） */
	fogOfWar?: boolean;
	/** 战役事件状态（Phase 6 使用） */
	eventStates?: CampaignEventState[];
}

export interface ActionLogEntry {
	id: string;
	timestamp: number;
	message: string;
}
