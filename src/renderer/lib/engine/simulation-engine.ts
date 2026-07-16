/**
 * simulation-engine.ts
 * ──────────────────────────────────────────────
 * 地图推演引擎：地图 PlacedUnit 移动 + HOI4 风格战斗结算
 *
 * 核心公式（每帧）
 *   deltaSimSec = (deltaRealMs / 1000) × timeScale
 *   distMoved   = (speed_km_h / 3600) × deltaSimSec   [km]
 *
 * 战斗结算（每 combatIntervalMs 真实时间执行一次）
 *   - 扫描射程内非友方单位
 *   - 软攻/硬攻选择：目标为 armor 用 hardAttack，否则用 softAttack
 *   - 组织度低于阈值时攻击力和速度线性衰减
 *   - 伤害分配比例和防御系数从 ModCombatOverrides 读取
 */

import { get } from 'svelte/store';
import { gameClock } from './game-clock.store';
import {
	tickMapMovement,
	initRuntimePositions,
	flushRuntimePositions,
	currentBattle,
	runtimePositions
} from '../stores/battle/battle-store';
import type { RuntimeUnitPosition } from '../stores/battle/battle-store';
import { mods } from '$lib/registry/mod-registry.svelte';
import type { ModCombatOverrides } from '$lib/registry/types';
import { getFormula, getEffectiveOverrides } from '$lib/registry/formula-registry';
import type { CombatContext } from '$lib/registry/formula-registry';

// ---- 引擎状态（模块级单例） ----
let rafId: number | null = null;
let lastTimestamp: number | null = null;

// ---- 战斗结算状态 ----
/** 真实时间累计器（ms），每 combatIntervalMs 触发一次战斗结算 */
let combatAccumMs = 0;

/** 定期写回 localStorage 的累计器（每 30s 真实时间写一次） */
let periodicFlushAccumMs = 0;
const PERIODIC_FLUSH_INTERVAL_MS = 30_000;

/** 上一帧是否处于暂停状态（用于检测暂停切换，触发即时 flush） */
let wasPaused = true;

/**
 * 获取当前生效的战斗覆盖参数
 */
function getCombatOverrides(): Required<ModCombatOverrides> {
	return mods.getCombatOverrides();
}

/**
 * 已放置单位（地图 PlacedUnit）战斗结算。
 * 使用 runtimePositions 的 lat/lng/hp/org 数据；战斗属性从 battles 静态读取。
 * 结果仅写 runtimePositions，不触发 localStorage。
 */
function handlePlacedCombat() {
	const battle = get(currentBattle);
	if (!battle || battle.placedUnits.length < 2) return;

	const placedMap = new Map(battle.placedUnits.map((p) => [p.id, p]));
	const overrides = getCombatOverrides();

	// 获取公式（Phase 1 使用默认公式，Phase 2 可被插件覆盖）
	const calcNetDamage = getFormula('calcNetDamage');
	const calcEfficiency = getFormula('calcEfficiency');

	runtimePositions.update((positions) => {
		const next = { ...positions };

		for (const [attackerId, attackerPos] of Object.entries(positions)) {
			if (attackerPos.hp <= 0) {
				next[attackerId] = { ...attackerPos, isEngaged: false };
				continue;
			}

			const attackerPlaced = placedMap.get(attackerId);
			if (!attackerPlaced) continue;

			const rangeKm = attackerPlaced.stats.attackRange;
			let engaged = false;

			for (const [targetId, targetPos] of Object.entries(positions)) {
				if (targetId === attackerId) continue;
				if (targetPos.hp <= 0) continue;

				const targetPlaced = placedMap.get(targetId);
				if (!targetPlaced) continue;
				// 友方跳过
				if (targetPlaced.factionId === attackerPlaced.factionId) continue;

				// 球面近似距离 (km)
				const dLatKm = (targetPos.lat - attackerPos.lat) * 111;
				const dLngKm =
					(targetPos.lng - attackerPos.lng) *
					111 *
					Math.cos((attackerPos.lat * Math.PI) / 180);
				const distKm = Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);
				if (distKm > rangeKm) continue;

				engaged = true;

				// 构建战斗上下文（用于公式计算）
				const combatCtx: CombatContext = {
					attacker: {
						stats: attackerPlaced.stats,
						hp: attackerPos.hp,
						org: attackerPos.org
					},
					target: {
						stats: targetPlaced.stats,
						hp: targetPos.hp,
						org: targetPos.org
					},
					distanceKm: distKm,
					overrides
				};

				// 使用公式注册表计算净伤害
				let netDmg = 0;
				if (calcNetDamage) {
					netDmg = calcNetDamage(combatCtx);
				} else {
					// 回退：内联计算（与默认公式逻辑一致）
					const orgRatio =
						attackerPlaced.stats.maxOrg > 0
							? attackerPos.org / attackerPlaced.stats.maxOrg
							: 1;
					const efficiency =
						orgRatio < overrides.orgPenaltyThreshold
							? orgRatio / overrides.orgPenaltyThreshold
							: 1;
					const hardness = targetPlaced.stats.hardness ?? 0;
					const targetMilUnit = battle.factions
						.flatMap((f) => f.units)
						.find((u) => u.id === targetPlaced.unitId);
					const atkBase =
						targetMilUnit?.branchId === 'air_force'
							? attackerPlaced.stats.airAttack
							: attackerPlaced.stats.softAttack * (1 - hardness) +
								attackerPlaced.stats.hardAttack * hardness;
					netDmg = Math.max(
						0,
						atkBase * efficiency - targetPlaced.stats.defense * overrides.defenseCoeff
					);
				}

				// 使用 overrides 中的伤害分配比例（替代硬编码0.7/0.3）
				next[targetId] = {
					...next[targetId],
					hp: Math.max(0, next[targetId].hp - netDmg * overrides.hpDamageRatio),
					org: Math.max(0, next[targetId].org - netDmg * overrides.orgDamageRatio)
				};
			}

			next[attackerId] = { ...next[attackerId], isEngaged: engaged };
		}

		// 战斗结算后：将 HP 归零的单位状态强制设为阵亡，清除路线
		for (const id of Object.keys(next)) {
			const pos = next[id];
			if (pos.hp <= 0 && pos.status !== 'destroyed') {
				next[id] = { ...pos, status: 'destroyed', route: [], isEngaged: false };
			}
		}

		return next;
	});
}

// ---- RAF 主循环 ----

function tick(timestamp: number) {
	rafId = requestAnimationFrame(tick);

	const clock = get(gameClock);

	// 暂停时仅更新时间戳，不推进模拟（战斗也停止）
	// 检测到由运行→暂停的切换时，立即 flush 运行时位置到 battles
	if (clock.isPaused) {
		if (!wasPaused) {
			wasPaused = true;
			flushRuntimePositions();
		}
		lastTimestamp = timestamp;
		return;
	}
	wasPaused = false;

	const deltaRealMs = lastTimestamp !== null ? timestamp - lastTimestamp : 0;
	lastTimestamp = timestamp;

	// 跳过首帧或异常大帧（切换标签页、debugger 断点等）
	if (deltaRealMs <= 0 || deltaRealMs > 500) return;

	const deltaSimSec = (deltaRealMs / 1000) * clock.timeScale;

	// 1. 推进推演日期
	gameClock.update((c) => ({
		...c,
		currentDate: new Date(c.currentDate.getTime() + deltaSimSec * 1000)
	}));

	// 2. 推进地图上的 PlacedUnit 沿路线行进
	tickMapMovement(deltaSimSec);

	// 3. 战斗结算（使用 overrides.combatIntervalMs 替代硬编码 500ms）
	const overrides = getCombatOverrides();
	const combatInterval = overrides.combatIntervalMs;
	combatAccumMs += deltaRealMs;
	if (combatAccumMs >= combatInterval) {
		combatAccumMs -= combatInterval;
		// 同步对地图 PlacedUnit 执行战斗结算
		handlePlacedCombat();
	}

	// 4. 定期将运行时位置写回 battles（约每 30s），确保进度持久化
	periodicFlushAccumMs += deltaRealMs;
	if (periodicFlushAccumMs >= PERIODIC_FLUSH_INTERVAL_MS) {
		periodicFlushAccumMs = 0;
		flushRuntimePositions();
	}
}

// ---- 公开 API ----

/** 启动引擎（幂等；仅浏览器环境有效） */
export function startEngine(): void {
	if (typeof requestAnimationFrame === 'undefined') return;
	if (rafId !== null) return;
	lastTimestamp = null;
	combatAccumMs = 0;
	periodicFlushAccumMs = 0;
	wasPaused = true;
	initRuntimePositions();
	rafId = requestAnimationFrame(tick);
}

/** 停止引擎并释放 RAF 句柄 */
export function stopEngine(): void {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
		lastTimestamp = null;
		flushRuntimePositions();
	}
}

/** 重置引擎内部计时器（配合 resetAll 使用，确保战斗累计器清零） */
export function resetEngineTimers(): void {
	lastTimestamp = null;
	combatAccumMs = 0;
	periodicFlushAccumMs = 0;
	wasPaused = true;
}

/** 引擎当前是否运行（不管暂停状态） */
export function isEngineRunning(): boolean {
	return rafId !== null;
}
