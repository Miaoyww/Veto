/**
 * simulation-engine.ts
 * ──────────────────────────────────────────────
 * 时间-位移同步引擎 + HOI4 风格战斗结算引擎
 *
 * 比例尺定义
 *   PIXELS_PER_KM = 5  →  1 km ≡ 5 px
 *   作战剧场 800 × 450 px  ≡  160 km × 90 km
 *
 * 核心公式（每帧）
 *   deltaSimSec = (deltaRealMs / 1000) × timeScale
 *   distMoved   = (speed_km_h / 3600) × deltaSimSec   [km]
 *   pixelMoved  = distMoved × PIXELS_PER_KM            [px]
 *
 * 战斗结算（每 500ms 真实时间执行一次）
 *   - 扫描射程内非友方单位
 *   - 软攻/硬攻选择：目标为 armor 用 hardAttack，否则用 softAttack
 *   - 组织度低于 20% 时攻击力和速度线性衰减
 *   - 伤害 70% 扣 HP，30% 扣 Org
 */

import { get } from 'svelte/store';
import { gameClock } from '../stores/game-clock.store';
import { simulationUnits } from '../stores/simulation-units.store';
import type { SimulationUnit } from '../stores/simulation-units.store';
import {
	tickMapMovement,
	initRuntimePositions,
	flushRuntimePositions,
	currentBattle,
	runtimePositions
} from '../stores/battle-store';
import type { RuntimeUnitPosition } from '../stores/battle-store';

// ---- 比例尺常量 ----
/** 像素/公里 */
export const PIXELS_PER_KM = 5;

// ---- 引擎状态（模块级单例） ----
let rafId: number | null = null;
let lastTimestamp: number | null = null;

// ---- 战斗结算状态 ----
/** 真实时间累计器（ms），每 COMBAT_INTERVAL_MS 触发一次战斗结算 */
let combatAccumMs = 0;
/** 战斗结算间隔：每 500ms 真实时间结算一次（≈每推演 1 小时@3600x） */
const COMBAT_INTERVAL_MS = 500;

/** 定期写回 localStorage 的累计器（每 30s 真实时间写一次） */
let periodicFlushAccumMs = 0;
const PERIODIC_FLUSH_INTERVAL_MS = 30_000;

/** 上一帧是否处于暂停状态（用于检测暂停切换，触发即时 flush） */
let wasPaused = true;

// ---- 战斗结算逻辑 ----

/**
 * HOI4 风格战斗结算：
 *  1. 每个存活单位扫描射程内所有非友方单位
 *  2. 软攻/硬攻自动选择
 *  3. 组织度效率惩罚（Org < 20% 时线性衰减）
 *  4. 净伤害 = max(0, atkValue - target.defense × 0.5)
 *  5. 70% 分给 HP，30% 分给 Org
 */
function handleCombat(units: SimulationUnit[]): SimulationUnit[] {
	// 浅拷贝，允许在同一 tick 内相互造伤
	const updated = units.map((u) => ({ ...u }));

	for (const attacker of updated) {
		// 已阵亡单位不参与战斗
		if (attacker.hp <= 0) {
			attacker.isEngaged = false;
			continue;
		}

		const rangePx = attacker.attackRange * PIXELS_PER_KM;
		attacker.isEngaged = false;

		for (const target of updated) {
			if (target.id === attacker.id) continue;
			// 友方跳过
			if (target.factionId === attacker.factionId) continue;
			// 目标已阵亡跳过
			if (target.hp <= 0) continue;

			// 距离判断
			const dx = target.position.x - attacker.position.x;
			const dy = target.position.y - attacker.position.y;
			if (Math.sqrt(dx * dx + dy * dy) > rangePx) continue;

			attacker.isEngaged = true;

			// HOI4 伤害类型：目标为装甲用硬攻，否则用软攻
			const atkBase = target.type === 'armor' ? attacker.hardAttack : attacker.softAttack;

			// 组织度效率惩罚：Org < 20% 时线性衰减至 0
			const orgRatio = attacker.maxOrg > 0 ? attacker.org / attacker.maxOrg : 1;
			const efficiency = orgRatio < 0.2 ? orgRatio / 0.2 : 1.0;
			const atkValue = atkBase * efficiency;

			// 净伤害（扣除防御减伤）
			const netDmg = Math.max(0, atkValue - target.defense * 0.5);

			// 伤害分配：70% HP + 30% Org
			target.hp = Math.max(0, target.hp - netDmg * 0.7);
			target.org = Math.max(0, target.org - netDmg * 0.3);
		}
	}

	return updated;
}

// ---- 单帧位移计算 ----

/**
 * 根据模拟时间步长推进一个单位沿路径运动。
 * 支持单帧跨越多个路径节点（高倍速时有效）。
 * 当 HP ≤ 0 时单位停止移动；Org < 20% 时速度线性衰减。
 */
function moveUnit(unit: SimulationUnit, deltaSimSec: number): SimulationUnit {
	if (unit.targetPath.length === 0) return unit;
	// 阵亡单位停止移动
	if (unit.hp <= 0) return { ...unit, targetPath: [] };

	// 组织度效率惩罚（与战斗攻击力惩罚同源）
	const orgRatio = unit.maxOrg > 0 ? unit.org / unit.maxOrg : 1;
	const speedEff = orgRatio < 0.2 ? orgRatio / 0.2 : 1.0;
	const effectiveSpeed = unit.speed * speedEff;

	// 本帧剩余可移动距离（公里）
	let remainingKm = (effectiveSpeed / 3600) * deltaSimSec;

	let { x, y } = unit.position;
	let path = [...unit.targetPath];

	while (remainingKm > 1e-9 && path.length > 0) {
		const target = path[0];
		const dx = target.x - x;
		const dy = target.y - y;
		const distPx = Math.sqrt(dx * dx + dy * dy);
		const distKm = distPx / PIXELS_PER_KM;

		if (remainingKm >= distKm) {
			x = target.x;
			y = target.y;
			path = path.slice(1);
			remainingKm -= distKm;
		} else {
			const ratio = distKm > 0 ? remainingKm / distKm : 0;
			x += dx * ratio;
			y += dy * ratio;
			remainingKm = 0;
		}
	}

	return { ...unit, position: { x, y }, targetPath: path };
}

// ---- RAF 主循环 ----

/**
 * 已放置单位（地图 PlacedUnit）战斗结算。
 * 使用 runtimePositions 的 lat/lng/hp/org 数据；战斗属性从 battles 静态读取。
 * 结果仅写 runtimePositions，不触发 localStorage。
 */
function handlePlacedCombat() {
	const battle = get(currentBattle);
	if (!battle || battle.placedUnits.length < 2) return;

	const placedMap = new Map(battle.placedUnits.map((p) => [p.id, p]));

	runtimePositions.update((positions) => {
		const next = { ...positions };

		for (const [attackerId, attackerPos] of Object.entries(positions)) {
			if (attackerPos.hp <= 0) {
				next[attackerId] = { ...attackerPos, isEngaged: false };
				continue;
			}

			const attackerPlaced = placedMap.get(attackerId);
			if (!attackerPlaced) continue;

			const rangeKm = attackerPlaced.attackRange;
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
					(targetPos.lng - attackerPos.lng) * 111 * Math.cos((attackerPos.lat * Math.PI) / 180);
				const distKm = Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);
				if (distKm > rangeKm) continue;

				engaged = true;

				// 组织度效率惩罚（Org < 20% 时线性衰减）
				const orgRatio =
					attackerPlaced.maxOrg > 0 ? attackerPos.org / attackerPlaced.maxOrg : 1;
				const efficiency = orgRatio < 0.2 ? orgRatio / 0.2 : 1;
				// 根据分支选择攻击类型
				const targetMilUnit = battle.factions
					.flatMap((f) => f.units)
					.find((u) => u.id === targetPlaced.unitId);
				const atkBase =
					targetMilUnit?.branch === 'air_force'
						? attackerPlaced.airAttack
						: targetMilUnit?.branch === 'navy'
							? attackerPlaced.hardAttack
							: attackerPlaced.softAttack;
				const netDmg = Math.max(0, atkBase * efficiency - targetPlaced.defense * 0.5);

				// 70% HP + 30% Org
				next[targetId] = {
					...next[targetId],
					hp: Math.max(0, next[targetId].hp - netDmg * 0.7),
					org: Math.max(0, next[targetId].org - netDmg * 0.3)
				};
			}

			next[attackerId] = { ...next[attackerId], isEngaged: engaged };
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

	// 2. 推进各单位位置（含组织度速度惩罚）
	simulationUnits.update((units) => units.map((u) => moveUnit(u, deltaSimSec)));

	// 3. 推进地图上的 PlacedUnit 沿路线行进
	tickMapMovement(deltaSimSec);

	// 4. 战斗结算（每 500ms 真实时间结算一次，不需要每帧 60fps 跑）
	combatAccumMs += deltaRealMs;
	if (combatAccumMs >= COMBAT_INTERVAL_MS) {
		combatAccumMs -= COMBAT_INTERVAL_MS;
		simulationUnits.update((units) => handleCombat(units));
		// 同步对地图 PlacedUnit 执行战斗结算
		handlePlacedCombat();
	}

	// 5. 定期将运行时位置写回 battles（约每 30s），确保进度持久化
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
