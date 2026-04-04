import { writable } from 'svelte/store';

export interface Vec2 {
	x: number;
	y: number;
}

export type UnitType = 'infantry' | 'armor' | 'air';

export interface SimulationUnit {
	id: string;
	/** 显示名称 */
	name: string;
	type: UnitType;
	/** CSS 颜色字符串 */
	factionColor: string;
	/** 当前像素坐标（相对于 800×450 作战剧场） */
	position: Vec2;
	/** 正在执行的路径点列表（到达每点后弹出） */
	targetPath: Vec2[];
	/** 行进速度（km/h） */
	speed: number;
	/** 预设（待确认）路径 */
	pendingPath: Vec2[];
	/** 是否正在等待指令确认 */
	isAwaitingConfirmation: boolean;
}

// ---- 演示用初始单位与路径（像素坐标，剧场 800×450） ----

/** 初始定义：用于重置时恢复 */
export const DEMO_UNITS_INITIAL: Readonly<SimulationUnit[]> = [
	{
		id: 'unit-001',
		name: '第1步兵旅',
		type: 'infantry',
		factionColor: '#dc2626',
		position: { x: 60, y: 180 },
		targetPath: [
			{ x: 200, y: 160 },
			{ x: 360, y: 130 },
			{ x: 500, y: 170 },
			{ x: 640, y: 140 },
			{ x: 740, y: 200 }
		],
		speed: 5,
		pendingPath: [],
		isAwaitingConfirmation: false
	},
	{
		id: 'unit-002',
		name: '第3装甲团',
		type: 'armor',
		factionColor: '#2563eb',
		position: { x: 60, y: 340 },
		targetPath: [
			{ x: 220, y: 300 },
			{ x: 390, y: 340 },
			{ x: 530, y: 280 },
			{ x: 680, y: 310 },
			{ x: 740, y: 370 }
		],
		speed: 40,
		pendingPath: [],
		isAwaitingConfirmation: false
	}
];

/** 深拷贝初始数据，生成新的可变单位列表 */
function cloneInitial(): SimulationUnit[] {
	return DEMO_UNITS_INITIAL.map((u) => ({
		...u,
		position: { ...u.position },
		targetPath: u.targetPath.map((p) => ({ ...p })),
		pendingPath: [],
		isAwaitingConfirmation: false
	}));
}

/** 单位 Store */
export const simulationUnits = writable<SimulationUnit[]>(cloneInitial());

/** 将所有单位重置回起始位置 */
export function resetUnits() {
	simulationUnits.set(cloneInitial());
}

/**
 * 向指定单位下达新指令。
 * 新坐标写入 pendingPath，不影响正在执行的 targetPath。
 */
export function issueSimCommand(unitId: string, path: Vec2[]) {
	simulationUnits.update((units) =>
		units.map((u) =>
			u.id === unitId ? { ...u, pendingPath: path, isAwaitingConfirmation: true } : u
		)
	);
}

/**
 * 确认指令：pendingPath 覆盖 targetPath，单位立即转向新目标。
 * 引擎下一帧将按新 targetPath 计算位移，无缝衔接。
 */
export function applySimCommand(unitId: string) {
	simulationUnits.update((units) =>
		units.map((u) =>
			u.id === unitId
				? { ...u, targetPath: u.pendingPath, pendingPath: [], isAwaitingConfirmation: false }
				: u
		)
	);
}

/**
 * 取消指令：丢弃 pendingPath，算子维持原计划。
 */
export function cancelSimCommand(unitId: string) {
	simulationUnits.update((units) =>
		units.map((u) =>
			u.id === unitId ? { ...u, pendingPath: [], isAwaitingConfirmation: false } : u
		)
	);
}

/**
 * 直接向 targetPath 末尾追加一个路径节点（不经确认）。
 * 适用于"绘制路线节点"模式——保持指令模式以允许连续点击。
 */
export function appendToSimPath(unitId: string, point: Vec2) {
	simulationUnits.update((units) =>
		units.map((u) =>
			u.id === unitId ? { ...u, targetPath: [...u.targetPath, point] } : u
		)
	);
}

/**
 * 清空当前路线并直接以新终点替代（不经确认）。
 * 适用于推演运行中的"重新设置路线"——无需弹出确认。
 */
export function resetApplySimPath(unitId: string, point: Vec2) {
	simulationUnits.update((units) =>
		units.map((u) =>
			u.id === unitId
				? { ...u, targetPath: [point], pendingPath: [], isAwaitingConfirmation: false }
				: u
		)
	);
}
