/**
 * unit-command.store.ts
 * ─────────────────────────────────────────────
 * 危机推演系统的"指令覆盖与确认"状态管理。
 * 与 battle-store 的 addRoutePoint / clearRoute 集成。
 */

import { writable, get } from 'svelte/store';
import { addRoutePoint, addLog, runtimePositions } from './battle-store';

export interface PendingCrisisCommand {
	/** 目标 PlacedUnit 的 ID */
	placedId: string;
	/** 单位名称（用于显示） */
	unitName: string;
	/** 待确认的路线节点（纬度，经度） */
	lat: number;
	lng: number;
}

/** 当前等待确认的危机指令（同一时间最多一条，新指令覆盖旧指令） */
export const pendingCrisisCommand = writable<PendingCrisisCommand | null>(null);

/**
 * 发布新路线节点指令。
 * 不写入路线，仅缓存等待确认。
 * 阵亡单位（hp <= 0 或 status === 'destroyed'）拒绝接收指令。
 */
export function issueCrisisCommand(
	placedId: string,
	unitName: string,
	lat: number,
	lng: number
) {
	const pos = get(runtimePositions)[placedId];
	if (pos && (pos.status === 'destroyed' || pos.hp <= 0)) return;
	pendingCrisisCommand.set({ placedId, unitName, lat, lng });
}

/**
 * 确认指令：将坐标写入 PlacedUnit 的 route，清空待命状态。
 */
export function applyCrisisCommand() {
	const cmd = get(pendingCrisisCommand);
	if (!cmd) return;
	addRoutePoint(cmd.placedId, cmd.lat, cmd.lng);
	addLog(
		` 指令确认：${cmd.unitName} 添加路线节点 (${cmd.lat.toFixed(4)}°N, ${cmd.lng.toFixed(4)}°E)`
	);
	pendingCrisisCommand.set(null);
}

/**
 * 取消指令：丢弃待命节点，单位维持原路线。
 */
export function cancelCrisisCommand() {
	const cmd = get(pendingCrisisCommand);
	if (cmd) {
		addLog(` 指令取消：${cmd.unitName} 路线节点 (${cmd.lat.toFixed(4)}°N, ${cmd.lng.toFixed(4)}°E) 已撤销`);
	}
	pendingCrisisCommand.set(null);
}
