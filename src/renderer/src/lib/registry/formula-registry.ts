/**
 * formula-registry.ts — 渲染进程公式注册表
 *
 * 管理所有插件的战斗公式覆盖。
 * Phase 1：仅含默认公式 + ModCombatOverrides 参数化，公式本身暂不可由插件覆盖。
 * Phase 2：插件可通过 exports 覆盖公式。
 *
 * 查找优先级：插件覆盖 > 默认公式
 */

import type { ModCombatOverrides } from './types';

/** 战斗上下文 */
export interface CombatContext {
	attacker: {
		stats: Record<string, number>;
		hp: number;
		org: number;
	};
	target: {
		stats: Record<string, number>;
		hp: number;
		org: number;
	};
	/** 攻击方到目标的距离（km） */
	distanceKm: number;
	/** 当前生效的战斗覆盖参数 */
	overrides: Required<ModCombatOverrides>;
}

/** 战斗公式签名 */
export type CombatFormula = (ctx: CombatContext) => number;

/** 默认覆盖值 */
const DEFAULT_OVERRIDES: Required<ModCombatOverrides> = {
	hpDamageRatio: 0.7,
	orgDamageRatio: 0.3,
	defenseCoeff: 0.5,
	orgPenaltyThreshold: 0.2,
	combatIntervalMs: 500
};

// ── 公式存储 ──────────────────────────────────────────────────────────

/** 活跃公式表（插件覆盖 > 默认） */
const activeFormulas = new Map<string, CombatFormula>();

/** 默认公式集 */
const defaultFormulas = new Map<string, CombatFormula>();

// ── 默认公式实现 ──────────────────────────────────────────────────────

/**
 * 计算净伤害
 * netDmg = max(0, atkBase × efficiency - targetDefense × defenseCoeff)
 */
function defaultCalcNetDamage(ctx: CombatContext): number {
	const { overrides } = ctx;
	const orgRatio =
		ctx.attacker.stats.maxOrg > 0 ? ctx.attacker.org / ctx.attacker.stats.maxOrg : 1;
	const efficiency =
		orgRatio < overrides.orgPenaltyThreshold
			? orgRatio / overrides.orgPenaltyThreshold
			: 1;

	const hardness = ctx.target.stats.hardness ?? 0;
	const atkBase =
		ctx.attacker.stats.softAttack * (1 - hardness) +
		ctx.attacker.stats.hardAttack * hardness;

	return Math.max(0, atkBase * efficiency - ctx.target.stats.defense * overrides.defenseCoeff);
}

/**
 * 计算效率（组织度衰减）
 */
function defaultCalcEfficiency(ctx: CombatContext): number {
	const { overrides } = ctx;
	const orgRatio =
		ctx.attacker.stats.maxOrg > 0 ? ctx.attacker.org / ctx.attacker.stats.maxOrg : 1;
	return orgRatio < overrides.orgPenaltyThreshold
		? orgRatio / overrides.orgPenaltyThreshold
		: 1;
}

/**
 * 计算对空攻击值
 */
function defaultCalcAirAttack(ctx: CombatContext): number {
	return ctx.attacker.stats.airAttack ?? 0;
}

/**
 * 计算两点间的距离（球面近似，单位 km）
 */
function defaultCalcDistance(ctx: CombatContext): number {
	return ctx.distanceKm;
}

// 注册默认公式
defaultFormulas.set('calcNetDamage', defaultCalcNetDamage);
defaultFormulas.set('calcEfficiency', defaultCalcEfficiency);
defaultFormulas.set('calcAirAttack', defaultCalcAirAttack);
defaultFormulas.set('calcDistance', defaultCalcDistance);

// 初始化活跃表为默认值
for (const [name, fn] of defaultFormulas) {
	activeFormulas.set(name, fn);
}

// ── 公开 API ───────────────────────────────────────────────────────────

/** 获取指定名称的公式（活跃覆盖 > 默认） */
export function getFormula(name: string): CombatFormula | undefined {
	return activeFormulas.get(name);
}

/** 注册插件公式覆盖（Phase 2） */
export function registerPluginFormulas(
	_pluginId: string,
	formulas: Record<string, CombatFormula>
): void {
	for (const [name, fn] of Object.entries(formulas)) {
		activeFormulas.set(name, fn);
		console.log(`[FormulaRegistry] Plugin "${_pluginId}" registered formula: ${name}`);
	}
}

/** 注销插件的所有公式覆盖（Phase 2） */
export function unregisterPluginFormulas(_pluginId: string): void {
	// Phase 2: 重建活跃公式表
	rebuildFromDefaults();
}

/** 从默认值重建活跃表 */
function rebuildFromDefaults(): void {
	activeFormulas.clear();
	for (const [name, fn] of defaultFormulas) {
		activeFormulas.set(name, fn);
	}
}

/**
 * 合并用户提供的部分 overrides 与默认值，返回完整的 Required<ModCombatOverrides>
 */
export function getEffectiveOverrides(
	partial?: ModCombatOverrides
): Required<ModCombatOverrides> {
	return { ...DEFAULT_OVERRIDES, ...partial };
}

/** 获取默认覆盖值 */
export function getDefaultOverrides(): Required<ModCombatOverrides> {
	return { ...DEFAULT_OVERRIDES };
}

/** 获取所有已注册公式的名称列表 */
export function getRegisteredFormulaNames(): string[] {
	return [...activeFormulas.keys()];
}
