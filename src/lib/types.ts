// ============ 军种与单位类型定义 ============

/** 军种 */
export type Branch = 'army' | 'navy' | 'air_force';

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

// ============ 军事单位 ============

export interface ArmyUnit {
	id: string;
	name: string;
	branch: 'army';
	infantry: InfantryComponent[];
	armor: ArmorComponent[];
	missiles: MissileComponent[];
}

export interface NavyUnit {
	id: string;
	name: string;
	branch: 'navy';
	surface: SurfaceShipComponent[];
	submarines: SubmarineComponent[];
	support: NavalSupportComponent[];
}

export interface AirForceUnit {
	id: string;
	name: string;
	branch: 'air_force';
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
	/** 打击范围半径(米) */
	strikeRadius: number;
	/** 单位状态 */
	status: 'idle' | 'moving' | 'attacking' | 'defending' | 'retreating';
}

// ============ 势力 ============

export interface Faction {
	id: string;
	name: string;
	color: string;
	/** 国旗URL(可选) */
	flagUrl?: string;
	units: MilitaryUnit[];
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
}

export interface ActionLogEntry {
	id: string;
	timestamp: number;
	message: string;
}

// ============ 名称映射(用于显示) ============

export const BRANCH_LABELS: Record<Branch, string> = {
	army: '陆军',
	navy: '海军',
	air_force: '空军'
};

export const INFANTRY_TYPE_LABELS: Record<ArmyInfantryType, string> = {
	light: '轻步兵',
	mechanized: '机械化步兵',
	airborne: '空降兵',
	marine: '海军陆战队'
};

export const INFANTRY_QUALITY_LABELS: Record<InfantryQuality, string> = {
	basic: '基础装备',
	standard: '标准装备',
	advanced: '先进装备',
	elite: '精英装备'
};

export const ARMOR_TYPE_LABELS: Record<ArmyArmorType, string> = {
	light_tank: '轻型坦克',
	main_tank: '主战坦克',
	apc: '装甲运兵车',
	ifv: '步兵战车'
};

export const ARMOR_QUALITY_LABELS: Record<ArmorQuality, string> = {
	gen1: '一代',
	gen2: '二代',
	gen3: '三代',
	gen4: '四代',
	gen5: '五代'
};

export const MISSILE_TYPE_LABELS: Record<ArmyMissileType, string> = {
	anti_tank: '反坦克导弹',
	surface_air: '防空导弹',
	cruise: '巡航导弹',
	ballistic: '弹道导弹'
};

export const MISSILE_QUALITY_LABELS: Record<MissileQuality, string> = {
	basic: '基础型',
	guided: '制导型',
	precision: '精确制导',
	advanced: '先进型'
};

export const SURFACE_TYPE_LABELS: Record<NavySurfaceType, string> = {
	destroyer: '驱逐舰',
	frigate: '护卫舰',
	cruiser: '巡洋舰',
	carrier: '航空母舰'
};

export const NAVAL_QUALITY_LABELS: Record<NavalQuality, string> = {
	basic: '基础型',
	guided: '制导型',
	advanced: '先进型',
	cutting_edge: '尖端型'
};

export const SUBMARINE_TYPE_LABELS: Record<NavySubmarineType, string> = {
	attack_sub: '攻击潜艇',
	missile_sub: '导弹潜艇',
	nuclear_sub: '核潜艇',
	ssbn: '弹道导弹潜艇'
};

export const SUBMARINE_QUALITY_LABELS: Record<SubmarineQuality, string> = {
	basic: '基础型',
	stealth: '隐身型',
	advanced: '先进型',
	nuclear: '核动力型'
};

export const NAVAL_SUPPORT_TYPE_LABELS: Record<NavySupportType, string> = {
	amphibious: '两栖攻击舰',
	logistics: '后勤支援舰',
	mine: '扫雷舰',
	patrol: '巡逻舰'
};

export const NAVAL_SUPPORT_QUALITY_LABELS: Record<NavalSupportQuality, string> = {
	basic: '基础型',
	standard: '标准型',
	advanced: '先进型',
	specialized: '专用型'
};

export const FIGHTER_TYPE_LABELS: Record<AirForceFighterType, string> = {
	air_superiority: '制空战斗机',
	multi_role: '多用途战斗机',
	interceptor: '拦截机',
	stealth: '隐身战斗机'
};

export const FIGHTER_QUALITY_LABELS: Record<FighterQuality, string> = {
	gen4: '四代机',
	gen4plus: '四代半',
	gen5: '五代机',
	gen6: '六代机'
};

export const BOMBER_TYPE_LABELS: Record<AirForceBomberType, string> = {
	strategic: '战略轰炸机',
	tactical: '战术轰炸机',
	stealth_bomber: '隐身轰炸机',
	fighter_bomber: '战斗轰炸机'
};

export const BOMBER_QUALITY_LABELS: Record<BomberQuality, string> = {
	basic: '基础型',
	advanced: '先进型',
	stealth: '隐身型',
	hypersonic: '高超音速型'
};

export const AIR_SUPPORT_TYPE_LABELS: Record<AirForceSupportType, string> = {
	awacs: '预警机',
	tanker: '加油机',
	transport: '运输机',
	recon: '侦察机'
};

export const AIR_SUPPORT_QUALITY_LABELS: Record<AirSupportQuality, string> = {
	basic: '基础型',
	standard: '标准型',
	advanced: '先进型',
	specialized: '专用型'
};

export const UNIT_STATUS_LABELS: Record<PlacedUnit['status'], string> = {
	idle: '待命',
	moving: '行军',
	attacking: '攻击',
	defending: '防御',
	retreating: '撤退'
};
