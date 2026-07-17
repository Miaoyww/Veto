/**
 * use-keyboard-shortcuts.svelte.ts
 * ─────────────────────────────────
 * 全局快捷键集中管理。
 * 在需要激活快捷键的根组件中调用 `useKeyboardShortcuts()` 一次即可。
 * 快捷键元数据 `SHORTCUT_DEFS` 可直接导入用于设置页面展示。
 */

import {
	undo,
	interactionMode,
	pendingPlaceUnitId,
	saveBattleWithToast,
	currentBattle,
	currentFactionId,
	selectedPlacedUnit,
	addLog
} from '$lib/stores/battle/battle-store';
import {
	closeTopLayer,
	leftBarPinned,
	unitPanelVisible,
	unitsCardOpen,
	rightBarPinned
} from '$lib/stores/battle/battle-ui-store';
import {
	selectedWaypoint,
	routeInsertMode,
	startPendingRoute
} from '$lib/stores/battle/route.store';
import { gameClock, TIME_SCALES, TIME_SCALE_LABELS } from '$lib/engine/game-clock.store';
import { get } from 'svelte/store';

export interface ShortcutDef {
	/** 显示用按键（大写），例如 'S'、'Z'、'Escape' */
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	/** 功能描述 */
	description: string;
	/** 适用场景分区 */
	group: '危机推演' | '模拟大会';
}
/** 战局中保存的自定义流速（不在预设档位中时返回） */
function getSavedCustomScale(): number | null {
	const battle = get(currentBattle);
	if (battle?.timeScale != null && !(TIME_SCALES as readonly number[]).includes(battle.timeScale)) {
		return battle.timeScale;
	}
	return null;
}
/** 所有快捷键的元数据，供设置页面展示用 */
export const SHORTCUT_DEFS: ShortcutDef[] = [
	{ key: '1', description: '第一流速', group: '危机推演' },
	{ key: '2', description: '第二流速', group: '危机推演' },
	{ key: '3', description: '第三流速', group: '危机推演' },
	{ key: '4', description: '第四流速', group: '危机推演' },
	{ key: 'M', description: '切换测量距离模式', group: '危机推演' },
	{ key: 'Space', description: '暂停/继续', group: '危机推演' },
	{ key: 'A', description: '打开侧边栏', group: '危机推演' },
	{ key: 'Q', description: '打开单位面板', group: '危机推演' },
	{ key: 'S', description: '打开状态面板', group: '危机推演' },
	{ key: 'S', ctrl: true, description: '保存战局', group: '危机推演' },
	{ key: 'Z', ctrl: true, description: '撤销操作', group: '危机推演' },

	{ key: 'Escape', description: '退出当前交互模式', group: '危机推演' },
	{ key: 'F3', description: '在选中路线节点后插入新节点', group: '危机推演' }
];

function isInInput(e: KeyboardEvent): boolean {
	const el = e.target as HTMLElement;
	if (!el) return false;
	const tag = el.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}
function setTimeScale(scale: number) {
	gameClock.update((c) => ({ ...c, timeScale: scale }));
}
function togglePause() {
	gameClock.update((c) => ({ ...c, isPaused: !c.isPaused }));
}
function handleKeydown(e: KeyboardEvent) {
	// Ctrl+S：保存战局
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		saveBattleWithToast();
		return;
	}

	// Ctrl+Z：撤销（输入框内不触发）
	if (e.ctrlKey && e.key === 'z' && !isInInput(e)) {
		e.preventDefault();
		undo();
		return;
	}

	// Escape：按优先级逐层关闭最上层 UI
	if (e.key.toLowerCase() === 'escape') {
		closeTopLayer();
	}

	// F3：在选中路线节点后插入新节点
	if (e.key === 'F3' && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInInput(e)) {
		e.preventDefault()
		const selWp = get(selectedWaypoint)
		const mode = get(interactionMode)
		if (selWp && mode === 'select') {
			const battle = get(currentBattle)
			const placed = battle?.placedUnits.find(p => p.id === selWp.placedId)
			if (placed) {
				const unitName = battle?.factions.flatMap(f => f.units)
					.find(u => u.id === placed.unitId)?.name ?? '单位'
				routeInsertMode.set({ placedId: selWp.placedId, afterIndex: selWp.index })

				if (!get(gameClock).isPaused) {
					startPendingRoute(selWp.placedId, unitName, 'append')
					addLog(`路线插入指令已录入，将在节点 ${selWp.index + 1} 后插入，Esc 完成`)
				} else {
					addLog(`在路线节点 ${selWp.index + 1} 后插入新节点，Esc 完成`)
				}
				interactionMode.set('route')
			}
		}
		return
	}

	// A：切换左侧面板（输入框内不触发）
	if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		leftBarPinned.update((pinned) => !pinned);
	}

	// D: 切换右侧面板（输入框内不触发）
	if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		rightBarPinned.update((pinned) => !pinned);
	}

	// Q：切换单位面板（输入框内不触发）
	if (e.key.toLocaleLowerCase() === 'q' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		const placed = get(selectedPlacedUnit);
		if (placed) {
			// 切换到选中单位所在阵营，打开左栏 + 单位面板
			currentFactionId.set(placed.factionId);
			leftBarPinned.set(true);
			unitPanelVisible.set(true);
		} else {
			// 无选中单位：仅切换单位面板显示
			leftBarPinned.set(true);
			unitPanelVisible.update((v) => !v);
		}
	}

	// S：切换状态面板（输入框内不触发）
	if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		unitsCardOpen.update((open) => !open);
	}

	// M：切换测量模式（输入框内不触发）
	if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		interactionMode.update((mode) => (mode === 'measure' ? 'select' : 'measure'));
	}

	// Space：暂停/继续（输入框内不触发）
	if (e.key.toLowerCase() === ' ' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		togglePause();
	}

	/* 流速快捷键 */
	if (e.key.toLowerCase() === '1' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		setTimeScale(TIME_SCALES[0]);
	}

	if (e.key.toLowerCase() === '2' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		setTimeScale(TIME_SCALES[1]);
	}
	if (e.key.toLowerCase() === '3' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		setTimeScale(TIME_SCALES[2]);
	}
	if (e.key.toLowerCase() === '4' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		const custom = getSavedCustomScale();
		if (custom != null) setTimeScale(custom);
	}
}

/**
 * 在根组件中调用，通过 `$effect` 注册/清理全局 keydown 监听器。
 * 必须在 Svelte 组件或含有 Svelte 5 rune 上下文的文件中调用。
 */
export function useKeyboardShortcuts() {
	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
}
