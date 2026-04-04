import { writable, derived, get } from 'svelte/store';
import type { Battle, EventSetting, Faction, MilitaryUnit, PlacedUnit, ActionLogEntry, UnitSide, ArmyUnit } from '$lib/types';
import { MISSILE_ATTACK_RANGE_KM } from '$lib/types';

const STORAGE_KEY = 'wars_battles';

function generateId(): string {
	return crypto.randomUUID();
}

function loadBattlesFromStorage(): Battle[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveBattlesToStorage(battles: Battle[]) {
	if (typeof localStorage === 'undefined') return;
	// 节流：最多每 2 秒存一次，避免 tick 每帧写 localStorage
	if (_saveTimer) clearTimeout(_saveTimer);
	_saveTimer = setTimeout(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
	}, 2000);
}

/** 立即将当前 battles 状态写入 localStorage（绕过防抖），用于手动保存。 */
export function saveBattlesNow() {
	if (typeof localStorage === 'undefined') return;
	if (_saveTimer) {
		clearTimeout(_saveTimer);
		_saveTimer = null;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(get(battles)));
}

// ============ 所有战局列表 ============
export const battles = writable<Battle[]>(loadBattlesFromStorage());
battles.subscribe(saveBattlesToStorage);

// ============ 当前激活的战局ID ============
export const currentBattleId = writable<string | null>(null);

// ============ 当前战局(派生) ============
export const currentBattle = derived(
	[battles, currentBattleId],
	([$battles, $id]) => $battles.find((b) => b.id === $id) ?? null
);

// ============ 当前选中的阵营ID ============
export const currentFactionId = writable<string | null>(null);

// ============ 当前阵营(派生) ============
export const currentFaction = derived(
	[currentBattle, currentFactionId],
	([$battle, $factionId]) => $battle?.factions.find((f) => f.id === $factionId) ?? null
);

// ============ 当前选中的军种分支 ============
export const currentBranch = writable<'army' | 'navy' | 'air_force'>('army');

// ============ 当前选中的已放置单位ID ============
export const selectedPlacedUnitId = writable<string | null>(null);

// ============ 当前选中的已放置单位(派生) ============
export const selectedPlacedUnit = derived(
	[currentBattle, selectedPlacedUnitId],
	([$battle, $unitId]) => $battle?.placedUnits.find((u) => u.id === $unitId) ?? null
);

// ============ 撤销栈 ============

interface UndoEntry {
	battleId: string;
	snapshot: Omit<Battle, 'actionLog' | 'updatedAt'>;
	description: string;
	factionId: string | null;
	placedUnitId: string | null;
}

const _undoStack: UndoEntry[] = [];
const MAX_UNDO = 50;
export const canUndo = writable(false);

export function pushUndoSnapshot(description: string) {
	const battle = get(currentBattle);
	if (!battle) return;
	const { actionLog, updatedAt, ...snapshot } = battle;
	_undoStack.push({
		battleId: battle.id,
		snapshot,
		description,
		factionId: get(currentFactionId),
		placedUnitId: get(selectedPlacedUnitId)
	});
	if (_undoStack.length > MAX_UNDO) _undoStack.shift();
	canUndo.set(true);
}

export function undo() {
	const battle = get(currentBattle);
	if (!battle) return;
	let idx = _undoStack.length - 1;
	while (idx >= 0 && _undoStack[idx].battleId !== battle.id) idx--;
	if (idx < 0) return;
	const entry = _undoStack.splice(idx, 1)[0];
	canUndo.set(_undoStack.some((e) => e.battleId === battle.id));
	const currentLog = battle.actionLog;
	battles.update((list) =>
		list.map((b) => {
			if (b.id !== battle.id) return b;
			return {
				...entry.snapshot,
				actionLog: [
					...currentLog,
					{ id: generateId(), timestamp: Date.now(), message: `↩ 撤销：${entry.description}` }
				],
				updatedAt: Date.now()
			};
		})
	);
	currentFactionId.set(entry.factionId);
	selectedPlacedUnitId.set(entry.placedUnitId);
}


function updateCurrentBattle(updater: (battle: Battle) => Battle) {
	const id = get(currentBattleId);
	if (!id) return;
	battles.update((list) =>
		list.map((b) => {
			if (b.id !== id) return b;
			const updated = updater(b);
			updated.updatedAt = Date.now();
			return updated;
		})
	);
}

export function updateCurrentBattleSettings(
	updates: Partial<Pick<Battle, 'name' | 'startDate' | 'timeScale' | 'pixelsPerKm' | 'iconStyle' | 'eventSettings'>>
) {
	updateCurrentBattle((b) => ({ ...b, ...updates }));
}

// ============ 战局 CRUD ============

export function createBattle(
	name: string,
	options?: {
		mapCenter?: [number, number];
		mapZoom?: number;
		startDate?: string;
		timeScale?: number;
		pixelsPerKm?: number;
		iconStyle?: 'nato' | 'simple';
		eventSettings?: EventSetting[];
	}
): string {
	const id = generateId();
	const battle: Battle = {
		id,
		name,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		mapCenter: options?.mapCenter ?? [35, 105],
		mapZoom: options?.mapZoom ?? 5,
		factions: [],
		placedUnits: [],
		actionLog: [],
		startDate: options?.startDate,
		timeScale: options?.timeScale,
		pixelsPerKm: options?.pixelsPerKm,
		iconStyle: options?.iconStyle,
		eventSettings: options?.eventSettings ?? []
	};
	battles.update((list) => [...list, battle]);
	currentBattleId.set(id);
	return id;
}

export function deleteBattle(id: string) {
	battles.update((list) => list.filter((b) => b.id !== id));
	if (get(currentBattleId) === id) {
		currentBattleId.set(null);
		currentFactionId.set(null);
	}
}

export function renameBattle(id: string, name: string) {
	const trimmed = name.trim();
	if (!trimmed) return;
	battles.update((list) =>
		list.map((b) => (b.id === id ? { ...b, name: trimmed, updatedAt: Date.now() } : b))
	);
}

export function loadBattle(id: string) {
	const battle = get(battles).find((b) => b.id === id);
	if (battle) {
		_undoStack.length = 0;
		canUndo.set(false);
		currentBattleId.set(id);
		currentFactionId.set(battle.factions[0]?.id ?? null);
	}
}

// ============ 阵营 CRUD ============

export function addFaction(name: string, color: string, side: UnitSide = 'blue'): string {
	pushUndoSnapshot(`添加阵营: ${name}`);
	const id = generateId();
	const faction: Faction = { id, name, color, side, units: [] };
	updateCurrentBattle((b) => ({
		...b,
		factions: [...b.factions, faction]
	}));
	if (!get(currentFactionId)) {
		currentFactionId.set(id);
	}
	addLog(`添加阵营: ${name}`);
	return id;
}

export function removeFaction(factionId: string) {
	const battle = get(currentBattle);
	const faction = battle?.factions.find((f) => f.id === factionId);
	pushUndoSnapshot(`删除阵营: ${faction?.name ?? ''}`);
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.filter((f) => f.id !== factionId),
		placedUnits: b.placedUnits.filter((u) => u.factionId !== factionId)
	}));
	addLog(`删除阵营: ${faction?.name ?? ''}`);
	if (get(currentFactionId) === factionId) {
		const updated = get(currentBattle);
		currentFactionId.set(updated?.factions[0]?.id ?? null);
	}
}

export function updateFaction(factionId: string, updates: Partial<Pick<Faction, 'name' | 'color' | 'flagUrl' | 'side'>>) {
	const battle = get(currentBattle);
	const faction = battle?.factions.find((f) => f.id === factionId);
	const oldName = faction?.name ?? '';
	pushUndoSnapshot(`修改阵营信息: ${oldName}`);
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) => (f.id === factionId ? { ...f, ...updates } : f))
	}));
	if (updates.name && updates.name !== oldName) {
		addLog(`阵营改名: ${oldName} → ${updates.name}`);
	} else {
		addLog(`修改阵营信息: ${oldName}`);
	}
}

export function selectFaction(factionId: string) {
	currentFactionId.update((current) => (current === factionId ? null : factionId));
}

// ============ 单位 CRUD ============

export function addUnit(factionId: string, unit: MilitaryUnit) {
	pushUndoSnapshot(`创建单位: ${unit.name}`);
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId ? { ...f, units: [...f.units, unit] } : f
		)
	}));
	addLog(`${get(currentBattle)?.factions.find((f) => f.id === factionId)?.name ?? ''} 创建单位: ${unit.name}`);
}

export function removeUnit(factionId: string, unitId: string) {
	const battle = get(currentBattle);
	const unit = battle?.factions.find((f) => f.id === factionId)?.units.find((u) => u.id === unitId);
	pushUndoSnapshot(`删除单位: ${unit?.name ?? ''}`);
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId ? { ...f, units: f.units.filter((u) => u.id !== unitId) } : f
		),
		placedUnits: b.placedUnits.filter((p) => p.unitId !== unitId)
	}));
	addLog(`删除单位: ${unit?.name ?? ''}`);
}

export function updateUnit(factionId: string, unitId: string, updater: (unit: MilitaryUnit) => MilitaryUnit, logMessage?: string) {
	const battle = get(currentBattle);
	const unit = battle?.factions.find((f) => f.id === factionId)?.units.find((u) => u.id === unitId);
	const unitName = unit?.name ?? '未知单位';
	pushUndoSnapshot(`单位组成变更: ${unitName}`);
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId
				? { ...f, units: f.units.map((u) => (u.id === unitId ? updater(u) : u)) }
				: f
		)
	}));
	addLog(logMessage ?? `单位组成变更: ${unitName}`);
}

// ============ 放置单位 ============

export function placeUnit(unitId: string, factionId: string, lat: number, lng: number): string {
	const battle = get(currentBattle);
	const unit = battle?.factions.find((f) => f.id === factionId)?.units.find((u) => u.id === unitId);
	pushUndoSnapshot(`放置单位: ${unit?.name ?? ''}`);
	const id = generateId();

	// 根据单位组成派生攻击射程（km）
	function deriveAttackRange(u: MilitaryUnit | undefined): number {
		if (!u) return 15;
		if (u.branch === 'army') {
			let maxRange = 15;
			for (const m of (u as ArmyUnit).missiles) {
				const r = MISSILE_ATTACK_RANGE_KM[m.type];
				if (r > maxRange) maxRange = r;
			}
			return maxRange;
		}
		if (u.branch === 'navy') return 80;
		if (u.branch === 'air_force') return 150;
		return 15;
	}

	const placed: PlacedUnit = {
		id,
		unitId,
		factionId,
		lat,
		lng,
		route: [],
		strikeRadius: 0,
		status: 'idle',
		hp: 100,
		maxHp: 100,
		org: 100,
		maxOrg: 100,
		softAttack: 30,
		hardAttack: 10,
		airAttack: 5,
		defense: 25,
		speed: 8,
		attackRange: deriveAttackRange(unit)
	};
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: [...b.placedUnits, placed]
	}));
	// 同步写入 runtimePositions，使引擎立即感知到新单位（无需等待下次 initRuntimePositions）
	runtimePositions.update((pos) => ({
		...pos,
		[id]: {
			lat,
			lng,
			route: [],
			status: 'idle',
			hp: placed.hp,
			org: placed.org,
			isEngaged: false
		}
	}));
	addLog(`在 (${lat.toFixed(3)}, ${lng.toFixed(3)}) 放置单位`);
	return id;
}

export function removePlacedUnit(placedId: string) {
	const battle = get(currentBattle);
	const placed = battle?.placedUnits.find((u) => u.id === placedId);
	const unitName = placed
		? (battle?.factions.flatMap((f) => f.units).find((u) => u.id === placed.unitId)?.name ?? '')
		: '';
	pushUndoSnapshot(`撒除单位: ${unitName}`);
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: b.placedUnits.filter((u) => u.id !== placedId)
	}));
	runtimePositions.update((pos) => {
		const next = { ...pos };
		delete next[placedId];
		return next;
	});
	addLog(`从地图撒除单位: ${unitName}`);
	if (get(selectedPlacedUnitId) === placedId) {
		selectedPlacedUnitId.set(null);
	}
}

export function updatePlacedUnit(placedId: string, updates: Partial<Omit<PlacedUnit, 'id'>>, undoDescription?: string) {
	if (undoDescription) pushUndoSnapshot(undoDescription);
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: b.placedUnits.map((u) => (u.id === placedId ? { ...u, ...updates } : u))
	}));
}

export function addRoutePoint(placedId: string, lat: number, lng: number) {
	pushUndoSnapshot('添加路线节点');
	const battle = get(currentBattle);
	const unit = battle?.placedUnits.find((u) => u.id === placedId);
	if (!unit) return;
	const newRoute: [number, number][] = [...unit.route, [lat, lng]];
	updatePlacedUnit(placedId, { route: newRoute });
	// 将新路线同步写入 runtimePositions，使引擎在推演运行期间也能接收到路线更新
	runtimePositions.update((pos) => {
		if (!pos[placedId]) return pos;
		return { ...pos, [placedId]: { ...pos[placedId], route: newRoute } };
	});
}

export function clearRoute(placedId: string) {
	const battle = get(currentBattle);
	const placed = battle?.placedUnits.find((u) => u.id === placedId);
	const unitName = placed
		? (battle?.factions.flatMap((f) => f.units).find((u) => u.id === placed.unitId)?.name ?? '')
		: '';
	pushUndoSnapshot(`清除路线: ${unitName}`);
	updatePlacedUnit(placedId, { route: [] });
	// 将清除同步到 runtimePositions
	runtimePositions.update((pos) => {
		if (!pos[placedId]) return pos;
		return { ...pos, [placedId]: { ...pos[placedId], route: [] } };
	});
	addLog(`清除路线: ${unitName}`);
}

// ============ 行动日志 ============

export function addLog(message: string) {
	const entry: ActionLogEntry = {
		id: generateId(),
		timestamp: Date.now(),
		message
	};
	updateCurrentBattle((b) => ({
		...b,
		actionLog: [...b.actionLog, entry]
	}));
}

export function clearLog() {
	updateCurrentBattle((b) => ({
		...b,
		actionLog: []
	}));
}

// ============ 重置当前战局 ============

export function resetCurrentBattle() {
	updateCurrentBattle((b) => ({
		...b,
		factions: [],
		placedUnits: [],
		actionLog: [],
		updatedAt: Date.now()
	}));
	currentFactionId.set(null);
	selectedPlacedUnitId.set(null);
}

// ============ 交互模式 ============

export type InteractionMode = 'select' | 'place' | 'route' | 'strike';
export const interactionMode = writable<InteractionMode>('select');

/** 待放置的单位ID (place模式使用) */
export const pendingPlaceUnitId = writable<string | null>(null);

// ============ 运行时位置（60fps 更新，不写 battles，不触发 localStorage） ============

export interface RuntimeUnitPosition {
	lat: number;
	lng: number;
	route: [number, number][];
	status: PlacedUnit['status'];
	/** 当前生命值（高频更新，不触发 localStorage） */
	hp: number;
	/** 当前组织度（高频更新，不触发 localStorage） */
	org: number;
	/** 是否正在交战（由引擎战斗结算更新） */
	isEngaged: boolean;
}

/**
 * 运行时位置 store：仅在内存中存储当前战局各 PlacedUnit 的实时位置。
 * 由引擎 tick 驱动（60fps），不触发 battles/localStorage 写入。
 * 地图组件监听此 store，用 setLatLng() 快速更新 Marker，避免重建 DOM。
 */
export const runtimePositions = writable<Record<string, RuntimeUnitPosition>>({});

/**
 * 初始化运行时位置（引擎启动时调用）。
 * 将当前 battle 的 placedUnits 位置快照写入 runtimePositions。
 */
export function initRuntimePositions() {
	const battle = get(currentBattle);
	if (!battle) return;
	const snapshot: Record<string, RuntimeUnitPosition> = {};
	for (const u of battle.placedUnits) {
		snapshot[u.id] = {
			lat: u.lat,
			lng: u.lng,
			route: [...u.route],
			status: u.status,
			hp: u.hp,
			org: u.org,
			isEngaged: false
		};
	}
	runtimePositions.set(snapshot);
}

/**
 * 将运行时位置写回 battles store（引擎停止/暂停时调用）。
 * 这样位置才会持久化到 localStorage。
 */
export function flushRuntimePositions() {
	const positions = get(runtimePositions);
	const id = get(currentBattleId);
	if (!id || Object.keys(positions).length === 0) return;
	battles.update((list) =>
		list.map((b) => {
			if (b.id !== id) return b;
			return {
				...b,
				placedUnits: b.placedUnits.map((u) => {
					const pos = positions[u.id];
					return pos
						? { ...u, lat: pos.lat, lng: pos.lng, route: pos.route, status: pos.status, hp: pos.hp, org: pos.org }
						: u;
				})
			};
		})
	);
}

/**
 * 按模拟时间步长推进当前战局中所有有路线的 PlacedUnit。
 * 仅写 runtimePositions（不触发 battles/localStorage），地图通过快速路径 setLatLng 响应。
 *
 * 使用近似平面地球公式：
 *   1° 纬度 ≈ 111 km
 *   1° 经度 ≈ 111 × cos(lat) km
 */
export function tickMapMovement(deltaSimSec: number) {
	runtimePositions.update((positions) => {
		const next: Record<string, RuntimeUnitPosition> = {};
		for (const [id, cur] of Object.entries(positions)) {
			// 阵亡单位：维持状态，不移动
			if (cur.status === 'destroyed' || cur.hp <= 0) {
				next[id] = cur.status === 'destroyed' ? cur : { ...cur, status: 'destroyed', route: [], isEngaged: false };
				continue;
			}

			if (cur.route.length === 0) {
				// 已到达，状态置 idle
				next[id] = cur.status === 'idle' ? cur : { ...cur, status: 'idle' };
				continue;
			}

			// 找到对应 PlacedUnit 的速度（从 battles 中读一次；仅读不写）
			const battle = get(currentBattle);
			const placed = battle?.placedUnits.find((p) => p.id === id);
			const speed = placed?.speed ?? 10; // km/h，无法找到则默认 10

			let remainKm = (speed / 3600) * deltaSimSec;
			let lat = cur.lat;
			let lng = cur.lng;
			let route = cur.route as [number, number][];

			while (remainKm > 1e-9 && route.length > 0) {
				const [tLat, tLng] = route[0];
				const dLatKm = (tLat - lat) * 111;
				const dLngKm = (tLng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
				const distKm = Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);

				if (distKm < 1e-9) {
					route = route.slice(1);
					continue;
				}

				if (remainKm >= distKm) {
					lat = tLat;
					lng = tLng;
					route = route.slice(1);
					remainKm -= distKm;
				} else {
					const ratio = remainKm / distKm;
					lat += (dLatKm / 111) * ratio;
					const cosLat = Math.cos((lat * Math.PI) / 180);
					lng += cosLat > 1e-9 ? (dLngKm / (111 * cosLat)) * ratio : 0;
					remainKm = 0;
				}
			}

			const status: PlacedUnit['status'] = route.length === 0 ? 'idle' : 'moving';
			next[id] = { ...cur, lat, lng, route, status };
		}
		return next;
	});
}
