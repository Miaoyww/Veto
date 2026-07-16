/**
 * status-registry.ts — 状态效果注册表（Phase 4）
 *
 * 管理所有状态效果定义及其对战斗属性的影响。
 * 内置状态涵盖常见战术条件（掘壕、压制、溃退等），Mod 可注册自定义状态。
 *
 * 两类状态：
 * - 姿态（posture）：idle/moving/attacking/defending/retreating/destroyed
 *   互斥，由引擎或玩家命令直接设置 PlacedUnit.status，不走 StatusInstance
 * - 条件/能力（condition/ability）：entrenched/suppressed/routed 等
 *   可叠加，通过 StatusInstance 管理，有持续时间和属性修正
 */

import type { StatusDefinition, StatusInstance } from '$lib/types';
import type { FlexStats, ModCombatOverrides } from './types';

// ═══════════════════════════════════════════════════════════════
// 内置状态定义
// ═══════════════════════════════════════════════════════════════

const BUILT_IN_STATUSES: StatusDefinition[] = [
	// ── 条件类 ──
	{
		id: 'entrenched',
		name: '掘壕固守',
		description: '单位已挖掘防御工事，防御力大幅提升但无法移动',
		modifiers: { defense: 2.0, speed: 0 },
		category: 'condition',
		priority: 10,
		tags: ['defensive', 'immobilize']
	},
	{
		id: 'fortified',
		name: '要塞驻防',
		description: '单位驻守在要塞/永备工事中，获得极高防御加成',
		modifiers: { defense: 3.0, speed: 0 },
		category: 'condition',
		priority: 20,
		tags: ['defensive', 'immobilize', 'facility']
	},
	{
		id: 'routed',
		name: '溃退',
		description: '单位组织度崩溃，失去战斗力并向后溃逃',
		modifiers: {
			defense: 0.3,
			softAttack: 0.3,
			hardAttack: 0.3,
			airAttack: 0.3,
			speed: 1.5,
			maxOrg: 0.5
		},
		defaultDuration: 3600,
		category: 'condition',
		priority: 5,
		tags: ['negative', 'combat']
	},
	{
		id: 'suppressed',
		name: '压制',
		description: '单位遭受猛烈火力压制，攻防能力下降',
		modifiers: {
			defense: 0.5,
			softAttack: 0.5,
			hardAttack: 0.5,
			airAttack: 0.5,
			speed: 0.7
		},
		defaultDuration: 1800,
		category: 'condition',
		priority: 3,
		tags: ['negative', 'combat']
	},
	// ── 能力类 ──
	{
		id: 'forced_march',
		name: '强行军',
		description: '单位以牺牲组织度为代价加速行进',
		modifiers: { speed: 1.5, maxOrg: 0.8 },
		defaultDuration: 7200,
		category: 'ability',
		priority: 5,
		tags: ['movement']
	},
	{
		id: 'resupplying',
		name: '补给中',
		description: '单位正在接受补给，组织度逐步恢复但移动缓慢',
		modifiers: { speed: 0.5, defense: 0.7 },
		defaultDuration: 3600,
		category: 'ability',
		priority: 3,
		tags: ['recovery']
	}
];

// ═══════════════════════════════════════════════════════════════
// 注册表
// ═══════════════════════════════════════════════════════════════

/** 所有已注册的状态定义（内置 + Mod 注入） */
const statusDefs = new Map<string, StatusDefinition>();

// 初始化内置状态
for (const def of BUILT_IN_STATUSES) {
	statusDefs.set(def.id, def);
}

// ═══════════════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════════════

/** 注册状态定义（Mod 注入用，后注入覆盖同 id 的已有定义） */
export function registerStatusDefinition(def: StatusDefinition): void {
	statusDefs.set(def.id, def);
	console.log(`[StatusRegistry] Registered status: ${def.id}`);
}

/** 批量注册状态定义 */
export function registerStatusDefinitions(defs: StatusDefinition[]): void {
	for (const def of defs) {
		statusDefs.set(def.id, def);
	}
	console.log(`[StatusRegistry] Registered ${defs.length} status definitions`);
}

/** 获取单个状态定义 */
export function getStatusDefinition(id: string): StatusDefinition | undefined {
	return statusDefs.get(id);
}

/** 获取所有已注册的状态定义 */
export function getAllStatusDefinitions(): StatusDefinition[] {
	return [...statusDefs.values()];
}

/** 重置为内置状态（测试/热重载用） */
export function resetStatusRegistry(): void {
	statusDefs.clear();
	for (const def of BUILT_IN_STATUSES) {
		statusDefs.set(def.id, def);
	}
}

// ═══════════════════════════════════════════════════════════════
// 状态效果计算
// ═══════════════════════════════════════════════════════════════

/**
 * 计算单位在激活状态效果下的有效战斗属性。
 *
 * 计算规则：
 * 1. 从 baseStats 复制所有属性
 * 2. 对每个激活的状态效果，应用其 modifiers（乘数叠加）
 * 3. maxHp/maxOrg 仅受乘数影响（不影响当前 hp/org 值）
 *
 * @param baseStats  单位模板基础属性
 * @param activeStatuses  当前激活的状态效果列表
 * @returns 修正后的战斗属性
 */
export function getEffectiveStats(
	baseStats: FlexStats,
	activeStatuses: StatusInstance[] | undefined
): FlexStats {
	if (!activeStatuses || activeStatuses.length === 0) {
		return { ...baseStats };
	}

	const effective = { ...baseStats };

	for (const instance of activeStatuses) {
		const def = statusDefs.get(instance.statusId);
		if (!def?.modifiers) continue;

		for (const [key, multiplier] of Object.entries(def.modifiers)) {
			if (key in effective) {
				effective[key] = effective[key] * multiplier;
			}
		}
	}

	return effective;
}

/**
 * 推进状态效果的时间：移除已过期的效果。
 *
 * @param statuses  当前状态效果列表
 * @param currentSimTime  当前模拟时间戳（ms epoch）
 * @returns 未过期的状态效果列表（新数组）
 */
export function tickStatusEffects(
	statuses: StatusInstance[] | undefined,
	currentSimTime: number
): StatusInstance[] {
	if (!statuses || statuses.length === 0) return [];

	return statuses.filter((s) => {
		if (s.duration === undefined) return true; // 永久效果
		const elapsedSec = (currentSimTime - s.appliedAt) / 1000;
		return elapsedSec < s.duration;
	});
}

/**
 * 向单位施加一个状态效果。
 * 处理同类别互斥（高优先级覆盖低优先级）。
 *
 * @param existing  已有的状态效果列表
 * @param statusId  要施加的状态 ID
 * @param simTimeMs  当前模拟时间戳（ms epoch）
 * @param customDuration  自定义持续时间（模拟秒，undefined = 使用默认）
 * @returns 更新后的状态效果列表（新数组）
 */
export function applyStatusEffect(
	existing: StatusInstance[] | undefined,
	statusId: string,
	simTimeMs: number,
	customDuration?: number,
	source?: string
): StatusInstance[] {
	const def = statusDefs.get(statusId);
	if (!def) {
		console.warn(`[StatusRegistry] Unknown status: ${statusId}`);
		return existing ?? [];
	}

	const list = existing ? [...existing] : [];

	// 同类别互斥：移除同 category 且优先级 <= 新效果的已有效果
	if (def.category) {
		for (let i = list.length - 1; i >= 0; i--) {
			const existingDef = statusDefs.get(list[i].statusId);
			if (existingDef?.category === def.category && (existingDef.priority ?? 0) <= (def.priority ?? 0)) {
				list.splice(i, 1);
			}
		}
	}

	// 检查是否已存在相同效果（刷新持续时间）
	const existingIdx = list.findIndex((s) => s.statusId === statusId);
	const instance: StatusInstance = {
		statusId,
		appliedAt: simTimeMs,
		duration: customDuration ?? def.defaultDuration,
		source
	};

	if (existingIdx >= 0) {
		list[existingIdx] = instance;
	} else {
		list.push(instance);
	}

	return list;
}

/**
 * 移除单位身上的指定状态效果。
 */
export function removeStatusEffect(
	existing: StatusInstance[] | undefined,
	statusId: string
): StatusInstance[] {
	if (!existing || existing.length === 0) return [];
	return existing.filter((s) => s.statusId !== statusId);
}

/**
 * 检查单位是否具有某个状态效果。
 */
export function hasStatusEffect(
	statuses: StatusInstance[] | undefined,
	statusId: string
): boolean {
	if (!statuses || statuses.length === 0) return false;
	return statuses.some((s) => s.statusId === statusId);
}

/**
 * 获取状态效果对属性的综合修正乘数（用于 UI 显示）。
 * 返回 Record<属性名, 总乘数>
 */
export function getStatusModifiersSummary(
	activeStatuses: StatusInstance[] | undefined
): Record<string, number> {
	const summary: Record<string, number> = {};

	if (!activeStatuses || activeStatuses.length === 0) return summary;

	for (const instance of activeStatuses) {
		const def = statusDefs.get(instance.statusId);
		if (!def?.modifiers) continue;

		for (const [key, multiplier] of Object.entries(def.modifiers)) {
			summary[key] = (summary[key] ?? 1.0) * multiplier;
		}
	}

	return summary;
}
