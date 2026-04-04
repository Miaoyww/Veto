/**
 * simulation-engine.ts
 * ──────────────────────────────────────────────
 * 时间-位移同步引擎：使用 requestAnimationFrame 驱动
 * 推演时钟推进与单位位置更新。
 *
 * 比例尺定义
 *   PIXELS_PER_KM = 5  →  1 km ≡ 5 px
 *   作战剧场 800 × 450 px  ≡  160 km × 90 km
 *
 * 核心公式（每帧）
 *   deltaSimSec = (deltaRealMs / 1000) × timeScale
 *   distMoved   = (speed_km_h / 3600) × deltaSimSec   [km]
 *   pixelMoved  = distMoved × PIXELS_PER_KM            [px]
 */

import { get } from 'svelte/store';
import { gameClock } from '../stores/game-clock.store';
import { simulationUnits } from '../stores/simulation-units.store';
import type { SimulationUnit } from '../stores/simulation-units.store';

// ---- 比例尺常量 ----
/** 像素/公里 */
export const PIXELS_PER_KM = 5;

// ---- 引擎状态（模块级单例） ----
let rafId: number | null = null;
let lastTimestamp: number | null = null;

// ---- 单帧位移计算 ----

/**
 * 根据模拟时间步长推进一个单位沿路径运动。
 * 支持单帧跨越多个路径节点（高倍速时有效）。
 */
function moveUnit(unit: SimulationUnit, deltaSimSec: number): SimulationUnit {
	if (unit.targetPath.length === 0) return unit;

	// 本帧剩余可移动距离（公里）
	let remainingKm = (unit.speed / 3600) * deltaSimSec;

	let { x, y } = unit.position;
	let path = [...unit.targetPath];

	while (remainingKm > 1e-9 && path.length > 0) {
		const target = path[0];
		const dx = target.x - x;
		const dy = target.y - y;
		const distPx = Math.sqrt(dx * dx + dy * dy);
		const distKm = distPx / PIXELS_PER_KM;

		if (remainingKm >= distKm) {
			// 已足够到达该路径点
			x = target.x;
			y = target.y;
			path = path.slice(1);
			remainingKm -= distKm;
		} else {
			// 在本帧内停在中途
			const ratio = distKm > 0 ? remainingKm / distKm : 0;
			x += dx * ratio;
			y += dy * ratio;
			remainingKm = 0;
		}
	}

	return { ...unit, position: { x, y }, targetPath: path };
}

// ---- RAF 主循环 ----

function tick(timestamp: number) {
	rafId = requestAnimationFrame(tick);

	const clock = get(gameClock);

	// 暂停时仅更新时间戳，不推进模拟
	if (clock.isPaused) {
		lastTimestamp = timestamp;
		return;
	}

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

	// 2. 推进各单位位置
	simulationUnits.update((units) => units.map((u) => moveUnit(u, deltaSimSec)));
}

// ---- 公开 API ----

/** 启动引擎（幂等；仅浏览器环境有效） */
export function startEngine(): void {
	if (typeof requestAnimationFrame === 'undefined') return;
	if (rafId !== null) return;
	lastTimestamp = null;
	rafId = requestAnimationFrame(tick);
}

/** 停止引擎并释放 RAF 句柄 */
export function stopEngine(): void {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
		lastTimestamp = null;
	}
}

/** 引擎当前是否运行（不管暂停状态） */
export function isEngineRunning(): boolean {
	return rafId !== null;
}
