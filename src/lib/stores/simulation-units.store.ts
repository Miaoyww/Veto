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
	/** 剩余路径点（到达每点后弹出） */
	targetPath: Vec2[];
	/** 行进速度（km/h） */
	speed: number;
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
		speed: 5
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
		speed: 40
	}
];

/** 深拷贝初始数据，生成新的可变单位列表 */
function cloneInitial(): SimulationUnit[] {
	return DEMO_UNITS_INITIAL.map((u) => ({
		...u,
		position: { ...u.position },
		targetPath: u.targetPath.map((p) => ({ ...p }))
	}));
}

/** 单位 Store */
export const simulationUnits = writable<SimulationUnit[]>(cloneInitial());

/** 将所有单位重置回起始位置 */
export function resetUnits() {
	simulationUnits.set(cloneInitial());
}
