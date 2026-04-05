import type { ArmyUnit, NavyUnit, AirForceUnit, MilitaryUnit } from '$lib/types';

import armyRaw from './army.json';
import navyRaw from './navy.json';
import airForceRaw from './air-force.json';
import labelsRaw from './labels.json';

export const ARMY_UNITS: ArmyUnit[] = armyRaw as ArmyUnit[];
export const NAVY_UNITS: NavyUnit[] = navyRaw as NavyUnit[];
export const AIR_FORCE_UNITS: AirForceUnit[] = airForceRaw as AirForceUnit[];

/** 所有基础军种单位（扁平列表，可用于按 id 查找） */
export const UNIT_LIBRARY: MilitaryUnit[] = [
	...ARMY_UNITS,
	...NAVY_UNITS,
	...AIR_FORCE_UNITS
];

/** 按 id 快速查找单位模板 */
export function findUnitTemplate(id: string): MilitaryUnit | undefined {
	return UNIT_LIBRARY.find((u) => u.id === id);
}

// ============ 标签映射（从 labels.json 导出，支持 Mod 覆盖） ============

export const BRANCH_LABELS: Record<string, string> = labelsRaw.branch;
export const ARMY_CATEGORY_LABELS: Record<string, string> = labelsRaw.armyCategory;
export const NAVY_CATEGORY_LABELS: Record<string, string> = labelsRaw.navyCategory;
export const AIR_FORCE_CATEGORY_LABELS: Record<string, string> = labelsRaw.airForceCategory;
export const INFANTRY_TYPE_LABELS: Record<string, string> = labelsRaw.infantryType;
export const ARMOR_TYPE_LABELS: Record<string, string> = labelsRaw.armorType;
export const MISSILE_TYPE_LABELS: Record<string, string> = labelsRaw.missileType;
export const SURFACE_TYPE_LABELS: Record<string, string> = labelsRaw.surfaceType;
export const SUBMARINE_TYPE_LABELS: Record<string, string> = labelsRaw.submarineType;
export const NAVAL_SUPPORT_TYPE_LABELS: Record<string, string> = labelsRaw.navalSupportType;
export const FIGHTER_TYPE_LABELS: Record<string, string> = labelsRaw.fighterType;
export const BOMBER_TYPE_LABELS: Record<string, string> = labelsRaw.bomberType;
export const AIR_SUPPORT_TYPE_LABELS: Record<string, string> = labelsRaw.airSupportType;
export const UNIT_STATUS_LABELS: Record<string, string> = labelsRaw.unitStatus;
export const UNIT_SIDE_LABELS: Record<string, string> = labelsRaw.unitSide;
export const NATO_UNIT_TYPE_LABELS: Record<string, string> = labelsRaw.natoUnitType;
