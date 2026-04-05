// ============ 军种与单位类型定义 ============

/** 军种 */
export type Branch = 'army' | 'navy' | 'air_force';

/** 陆军单位大类 */
export type ArmyUnitCategory = 'infantry' | 'armor' | 'missile';
/** 海军单位大类 */
export type NavyUnitCategory = 'surface' | 'submarine' | 'support';
/** 空军单位大类 */
export type AirForceUnitCategory = 'fighter' | 'bomber' | 'support';

/** 阵营立场 */
export type UnitSide = 'blue' | 'red' | 'neutral';

/** 北约标准单位类型 */
export type NatoUnitType =
	| 'infantry'
	| 'armor'
	| 'artillery'
	| 'mechanized'
	| 'aviation'
	| 'navy'
	| 'headquarters';

/** 陆军单位类型 */
export type ArmyInfantryType = 'light' | 'mechanized' | 'airborne' | 'marine';
export type ArmyArmorType = 'light_tank' | 'main_tank' | 'apc' | 'ifv';
export type ArmyMissileType = 'anti_tank' | 'surface_air' | 'cruise' | 'ballistic';

/** 海军单位类型 */
export type NavySurfaceType = 'destroyer' | 'frigate' | 'cruiser' | 'carrier';
export type NavySubmarineType = 'attack_sub' | 'missile_sub' | 'nuclear_sub' | 'ssbn';
export type NavySupportType = 'amphibious' | 'logistics' | 'mine' | 'patrol';

/** 空军单位类型 */
export type AirForceFighterType = 'air_superiority' | 'multi_role' | 'interceptor' | 'stealth';
export type AirForceBomberType = 'strategic' | 'tactical' | 'stealth_bomber' | 'fighter_bomber';
export type AirForceSupportType = 'awacs' | 'tanker' | 'transport' | 'recon';

/** 装备等级 */
export type InfantryQuality = 'basic' | 'standard' | 'advanced' | 'elite';
export type ArmorQuality = 'gen1' | 'gen2' | 'gen3' | 'gen4' | 'gen5';
export type MissileQuality = 'basic' | 'guided' | 'precision' | 'advanced';
export type NavalQuality = 'basic' | 'guided' | 'advanced' | 'cutting_edge';
export type SubmarineQuality = 'basic' | 'stealth' | 'advanced' | 'nuclear';
export type NavalSupportQuality = 'basic' | 'standard' | 'advanced' | 'specialized';
export type FighterQuality = 'gen4' | 'gen4plus' | 'gen5' | 'gen6';
export type BomberQuality = 'basic' | 'advanced' | 'stealth' | 'hypersonic';
export type AirSupportQuality = 'basic' | 'standard' | 'advanced' | 'specialized';

// ============ 单位子组件 ============

export interface InfantryComponent {
	id: string;
	type: ArmyInfantryType;
	quality: InfantryQuality;
	count: number;
}

export interface ArmorComponent {
	id: string;
	type: ArmyArmorType;
	quality: ArmorQuality;
	count: number;
}

export interface MissileComponent {
	id: string;
	type: ArmyMissileType;
	quality: MissileQuality;
	count: number;
}

export interface SurfaceShipComponent {
	id: string;
	type: NavySurfaceType;
	quality: NavalQuality;
	count: number;
}

export interface SubmarineComponent {
	id: string;
	type: NavySubmarineType;
	quality: SubmarineQuality;
	count: number;
}

export interface NavalSupportComponent {
	id: string;
	type: NavySupportType;
	quality: NavalSupportQuality;
	count: number;
}

export interface FighterComponent {
	id: string;
	type: AirForceFighterType;
	quality: FighterQuality;
	count: number;
}

export interface BomberComponent {
	id: string;
	type: AirForceBomberType;
	quality: BomberQuality;
	count: number;
}

export interface AirSupportComponent {
	id: string;
	type: AirForceSupportType;
	quality: AirSupportQuality;
	count: number;
}

// ============ 单位基础战斗属性 ============

/**
 * 单位库中定义的基础战斗属性（模板值）。
 * PlacedUnit 的实时战斗状态基于此初始化，运行时可能因战损、Mod 等发生偏离。
 */
export interface UnitStats {
	/** 最大生命值 */
	maxHp: number;
	/** 最大组织度 */
	maxOrg: number;
	/** 对软目标（步兵等）的攻击力 */
	softAttack: number;
	/** 对硬目标（装甲等）的攻击力 */
	hardAttack: number;
	/** 对空目标的攻击力 */
	airAttack: number;
	/** 防御力 */
	defense: number;
	/** 移动速度 (km/h) */
	speed: number;
	/** 攻击射程 (km) */
	attackRange: number;
	/**
	 * 装甲度（0-1）：受到攻击时，有多大比例的伤害需要用 hardAttack 结算。
	 * 0 = 纯软目标（步兵），1 = 纯硬目标（重型装甲）。
	 */
	hardness: number;
}

// ============ 军事单位 ============

/**
 * 所有军事单位的公共基础字段。
 */
export interface BaseMilitaryUnit {
	id: string;
	name: string;
	branch: Branch;
	/** 基础战斗属性 */
	stats: UnitStats;
}

export interface ArmyUnit extends BaseMilitaryUnit {
	branch: 'army';
	category: ArmyUnitCategory;
	infantry: InfantryComponent[];
	armor: ArmorComponent[];
	missiles: MissileComponent[];
}

export interface NavyUnit extends BaseMilitaryUnit {
	branch: 'navy';
	category: NavyUnitCategory;
	surface: SurfaceShipComponent[];
	submarines: SubmarineComponent[];
	support: NavalSupportComponent[];
}

export interface AirForceUnit extends BaseMilitaryUnit {
	branch: 'air_force';
	category: AirForceUnitCategory;
	fighters: FighterComponent[];
	bombers: BomberComponent[];
	support: AirSupportComponent[];
}

export type MilitaryUnit = ArmyUnit | NavyUnit | AirForceUnit;

// ============ 地图上放置的单位 ============
export interface PlacedUnit {
	id: string;
	unitId: string;
	factionId: string;
	lat: number;
	lng: number;
	/** 行动路线坐标点 */
	route: [number, number][];
	/** 打击目标坐标 */
	strikeTarget?: { lat: number; lng: number };
	/** 打击范围半径(米) */
	strikeRadius: number;
	/** 单位状态 */
	status: 'idle' | 'moving' | 'attacking' | 'defending' | 'retreating' | 'destroyed';
	/** 北约图标类型（覆盖自动推导） */
	natoType?: NatoUnitType;

	/** 当前生命值（运行时状态，耗尽则单位被摧毁） */
	hp: number;
	/** 当前组织度（运行时状态，耗尽则单位溃退） */
	org: number;

	/**
	 * 战斗属性（从所引用 MilitaryUnit.stats 初始化，运行时可因战损、Mod 等动态调整）。
	 * - stats.maxHp / stats.maxOrg：上限值
	 * - stats.hardness：装甲度（0=纯软目标，1=纯硬目标）
	 * - 伤害公式：effectiveDamage = softAttack × (1 - target.stats.hardness) + hardAttack × target.stats.hardness
	 */
	stats: UnitStats;
}

// ============ 势力 ============

export interface Faction {
	id: string;
	name: string;
	color: string;
	/** 阵营立场（决定北约图标框架颜色） */
	side: UnitSide;
	/** 国旗URL(可选) */
	flagUrl?: string;
	units: MilitaryUnit[];
}

// ============ 突发事件配置 ============

export interface EventSetting {
	id: string;
	label: string;
	enabled: boolean;
	/** 触发概率 0-100 */
	probability: number;
}

// ============ Mod 系统 ============

/**
 * Mod 自定义战斗公式覆盖（均为可选，未提供则使用引擎默认值）
 */
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

/**
 * Mod 自定义单位类型扩展
 */
export interface ModUnitTypeDefinition {
	/** 类型 key，全局唯一 */
	key: string;
	/** 显示名称 */
	label: string;
	/** 属于哪个军种 */
	branch: Branch;
	/** 默认软攻 */
	defaultSoftAttack?: number;
	/** 默认硬攻 */
	defaultHardAttack?: number;
	/** 默认速度 (km/h) */
	defaultSpeed?: number;
}

/**
 * Mod 自定义标签覆盖（key 为现有 Label 映射中的 key，value 为替换文本）
 */
export type ModLabelOverrides = Record<string, string>;

/**
 * Mod 包定义（纯数据，不执行任何脚本）
 */
export interface Mod {
	/** 全局唯一标识符，建议使用 'author.mod-name' 格式 */
	id: string;
	/** 显示名称 */
	name: string;
	/** 语义化版本号，如 '1.0.0' */
	version: string;
	author?: string;
	description?: string;
	/** 必须先加载的 Mod ID 列表 */
	dependencies?: string[];
	/** 与之冲突、不可同时启用的 Mod ID 列表 */
	conflicts?: string[];
	/** 战斗公式覆盖 */
	combatOverrides?: ModCombatOverrides;
	/** 新增单位类型定义 */
	unitTypes?: ModUnitTypeDefinition[];
	/** 标签文本覆盖 */
	labelOverrides?: ModLabelOverrides;
	/** 新增突发事件预设列表 */
	eventPresets?: Omit<EventSetting, 'id'>[];
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
