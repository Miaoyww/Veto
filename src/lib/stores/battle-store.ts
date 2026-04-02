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

// ============ 操作辅助 ============

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

export function createBattle(name: string): string {
	const id = generateId();
	const battle: Battle = {
		id,
		name,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		mapCenter: [35, 105],
		mapZoom: 5,
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
		currentBattleId.set(id);
		currentFactionId.set(battle.factions[0]?.id ?? null);
	}
}

// ============ 阵营 CRUD ============

export function addFaction(name: string, color: string): string {
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
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.filter((f) => f.id !== factionId),
		placedUnits: b.placedUnits.filter((u) => u.factionId !== factionId)
	}));
	if (get(currentFactionId) === factionId) {
		const battle = get(currentBattle);
		currentFactionId.set(battle?.factions[0]?.id ?? null);
	}
}

export function updateFaction(factionId: string, updates: Partial<Pick<Faction, 'name' | 'color' | 'flagUrl'>>) {
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) => (f.id === factionId ? { ...f, ...updates } : f))
	}));
}

export function selectFaction(factionId: string) {
	currentFactionId.set(factionId);
}

// ============ 单位 CRUD ============

export function addUnit(factionId: string, unit: MilitaryUnit) {
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId ? { ...f, units: [...f.units, unit] } : f
		)
	}));
	addLog(`${get(currentBattle)?.factions.find((f) => f.id === factionId)?.name ?? ''} 创建单位: ${unit.name}`);
}

export function removeUnit(factionId: string, unitId: string) {
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId ? { ...f, units: f.units.filter((u) => u.id !== unitId) } : f
		),
		placedUnits: b.placedUnits.filter((p) => p.unitId !== unitId)
	}));
}

export function updateUnit(factionId: string, unitId: string, updater: (unit: MilitaryUnit) => MilitaryUnit) {
	updateCurrentBattle((b) => ({
		...b,
		factions: b.factions.map((f) =>
			f.id === factionId
				? { ...f, units: f.units.map((u) => (u.id === unitId ? updater(u) : u)) }
				: f
		)
	}));
}

// ============ 放置单位 ============

export function placeUnit(unitId: string, factionId: string, lat: number, lng: number): string {
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
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: b.placedUnits.filter((u) => u.id !== placedId)
	}));
	if (get(selectedPlacedUnitId) === placedId) {
		selectedPlacedUnitId.set(null);
	}
}

export function updatePlacedUnit(placedId: string, updates: Partial<Omit<PlacedUnit, 'id'>>) {
	updateCurrentBattle((b) => ({
		...b,
		placedUnits: b.placedUnits.map((u) => (u.id === placedId ? { ...u, ...updates } : u))
	}));
}

export function addRoutePoint(placedId: string, lat: number, lng: number) {
	const battle = get(currentBattle);
	const unit = battle?.placedUnits.find((u) => u.id === placedId);
	if (!unit) return;
	updatePlacedUnit(placedId, { route: [...unit.route, [lat, lng]] });
}

export function clearRoute(placedId: string) {
	updatePlacedUnit(placedId, { route: [] });
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
