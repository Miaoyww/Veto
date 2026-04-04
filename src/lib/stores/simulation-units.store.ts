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
	/** 阵营标识（相同 factionId 为友方） */
	factionId: string;
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
	// ── 战斗属性 ──
	/** 最大生命值 */
	maxHp: number;
	/** 当前生命值 */
	hp: number;
	/** 最大组织度 */
	maxOrg: number;
	/** 当前组织度（低于 20% 时速度和攻击力线性衰减） */
	org: number;
	/** 软攻（对步兵有效） */
	softAttack: number;
	/** 硬攻（对装甲/载具有效） */
	hardAttack: number;
	/** 防御力（减伤系数） */
	defense: number;
	/** 攻击射程（km） */
	attackRange: number;
	/** 是否正在交战（由战斗引擎每 tick 更新） */
	isEngaged: boolean;
}

// ---- 演示用初始单位与路径（像素坐标，剧场 800×450） ----

/** 初始定义：用于重置时恢复 */
export const DEMO_UNITS_INITIAL: Readonly<SimulationUnit[]> = [
	{
		id: 'unit-001',
		name: '第1步兵旅',
		type: 'infantry',
		factionColor: '#dc2626',
		factionId: 'red',
		position: { x: 60, y: 220 },
		targetPath: [
			{ x: 200, y: 210 },
			{ x: 380, y: 215 },
			{ x: 550, y: 210 },
			{ x: 740, y: 220 }
		],
		speed: 5,
		pendingPath: [],
		isAwaitingConfirmation: false,
		maxHp: 100,
		hp: 100,
		maxOrg: 100,
		org: 100,
		softAttack: 8,
		hardAttack: 3,
		defense: 4,
		attackRange: 15,
		isEngaged: false
	},
	{
		id: 'unit-002',
		name: '第3装甲团',
		type: 'armor',
		factionColor: '#2563eb',
		factionId: 'blue',
		position: { x: 740, y: 240 },
		targetPath: [
			{ x: 600, y: 230 },
			{ x: 420, y: 225 },
			{ x: 250, y: 230 },
			{ x: 60, y: 240 }
		],
		speed: 30,
		pendingPath: [],
		isAwaitingConfirmation: false,
		maxHp: 150,
		hp: 150,
		maxOrg: 80,
		org: 80,
		softAttack: 10,
		hardAttack: 18,
		defense: 8,
		attackRange: 12,
		isEngaged: false
	}
];

/** 深拷贝初始数据，生成新的可变单位列表（同时重置所有战斗状态） */
function cloneInitial(): SimulationUnit[] {
	return DEMO_UNITS_INITIAL.map((u) => ({
		...u,
		position: { ...u.position },
		targetPath: u.targetPath.map((p) => ({ ...p })),
		pendingPath: [],
		isAwaitingConfirmation: false,
		// 重置战斗状态
		hp: u.maxHp,
		org: u.maxOrg,
		isEngaged: false
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
