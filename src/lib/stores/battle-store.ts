import { writable, derived, get } from 'svelte/store';
import type { Battle, Faction, MilitaryUnit, PlacedUnit, ActionLogEntry } from '$lib/types';

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

function saveBattlesToStorage(battles: Battle[]) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
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

// ============ 战局 CRUD ============

export function createBattle(name: string, options?: { mapCenter?: [number, number]; mapZoom?: number }): string {
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
		actionLog: []
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

export function addFaction(name: string, color: string): string {
	pushUndoSnapshot(`添加阵营: ${name}`);
	const id = generateId();
	const faction: Faction = { id, name, color, units: [] };
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

export function updateFaction(factionId: string, updates: Partial<Pick<Faction, 'name' | 'color' | 'flagUrl'>>) {
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
	const placed: PlacedUnit = {
		id,
		unitId,
		factionId,
		lat,
		lng,
		route: [],
		strikeRadius: 0,
		status: 'idle'
	};
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: [...b.placedUnits, placed]
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
	updatePlacedUnit(placedId, { route: [...unit.route, [lat, lng]] });
}

export function clearRoute(placedId: string) {
	const battle = get(currentBattle);
	const placed = battle?.placedUnits.find((u) => u.id === placedId);
	const unitName = placed
		? (battle?.factions.flatMap((f) => f.units).find((u) => u.id === placed.unitId)?.name ?? '')
		: '';
	pushUndoSnapshot(`清除路线: ${unitName}`);
	updatePlacedUnit(placedId, { route: [] });
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
