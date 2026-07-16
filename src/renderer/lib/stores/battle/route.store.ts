/**
 * route.store.ts
 * ──────────────
 * 路线规划 + 危机指令系统。
 * 合并自 pending-route.store.ts 和 unit-command.store.ts。
 */
import { writable, get } from 'svelte/store';
import { addRoutePoint, clearRoute, addLog, runtimePositions } from './battle-store';

// ── 待确认路线（绘制模式） ──────────────────────────────────────────

export interface PendingRoute {
	placedId: string;
	unitName: string;
	/** reset = 清空旧路线再追加；append = 在现有路线末尾追加 */
	type: 'reset' | 'append';
	points: [number, number][];
}

export const pendingRoute = writable<PendingRoute | null>(null);

export function startPendingRoute(placedId: string, unitName: string, type: 'reset' | 'append') {
	pendingRoute.set({ placedId, unitName, type, points: [] });
}

export function addPendingPoint(lat: number, lng: number) {
	pendingRoute.update((pr) => {
		if (!pr) return null;
		return { ...pr, points: [...pr.points, [lat, lng]] };
	});
}

export function applyPendingRoute() {
	const pr = get(pendingRoute);
	if (!pr || pr.points.length === 0) return;
	if (pr.type === 'reset') {
		clearRoute(pr.placedId);
	}
	for (const [lat, lng] of pr.points) {
		addRoutePoint(pr.placedId, lat, lng);
	}
	pendingRoute.set(null);
}

export function cancelPendingRoute() {
	pendingRoute.set(null);
}

// ── 危机指令系统（推演运行期间的单次指令） ──────────────────────────

export interface PendingCrisisCommand {
	placedId: string;
	unitName: string;
	lat: number;
	lng: number;
}

export const pendingCrisisCommand = writable<PendingCrisisCommand | null>(null);

/** 发布新路线节点指令。阵亡单位拒绝接收。 */
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

/** 确认指令：将坐标写入路线，清空待命状态。 */
export function applyCrisisCommand() {
	const cmd = get(pendingCrisisCommand);
	if (!cmd) return;
	addRoutePoint(cmd.placedId, cmd.lat, cmd.lng);
	addLog(
		` 指令确认：${cmd.unitName} 添加路线节点 (${cmd.lat.toFixed(4)}°N, ${cmd.lng.toFixed(4)}°E)`
	);
	pendingCrisisCommand.set(null);
}

/** 取消指令：丢弃待命节点。 */
export function cancelCrisisCommand() {
	const cmd = get(pendingCrisisCommand);
	if (cmd) {
		addLog(` 指令取消：${cmd.unitName} 路线节点 (${cmd.lat.toFixed(4)}°N, ${cmd.lng.toFixed(4)}°E) 已撤销`);
	}
	pendingCrisisCommand.set(null);
}
