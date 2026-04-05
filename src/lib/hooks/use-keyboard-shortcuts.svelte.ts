/**
 * use-keyboard-shortcuts.svelte.ts
 * ─────────────────────────────────
 * 全局快捷键集中管理。
 * 在需要激活快捷键的根组件中调用 `useKeyboardShortcuts()` 一次即可。
 * 快捷键元数据 `SHORTCUT_DEFS` 可直接导入用于设置页面展示。
 */

import { undo, interactionMode, pendingPlaceUnitId, saveBattlesNow, flushRuntimePositions } from '$lib/stores/battle-store';

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

/** 所有快捷键的元数据，供设置页面展示用 */
export const SHORTCUT_DEFS: ShortcutDef[] = [
	{ key: 'S', ctrl: true, description: '保存战局', group: '危机推演' },
	{ key: 'Z', ctrl: true, description: '撤销操作', group: '危机推演' },
	{ key: 'M', description: '切换测量距离模式', group: '危机推演' },
	{ key: 'Escape', description: '退出当前交互模式', group: '危机推演' }
];

function isInInput(e: KeyboardEvent): boolean {
	const tag = (e.target as HTMLElement)?.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA';
}

function handleKeydown(e: KeyboardEvent) {
	// Ctrl+S：保存战局
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		flushRuntimePositions();
		saveBattlesNow();
		return;
	}

	// Ctrl+Z：撤销（输入框内不触发）
	if (e.ctrlKey && e.key === 'z' && !isInInput(e)) {
		e.preventDefault();
		undo();
		return;
	}

	// Escape：退出交互模式
	if (e.key === 'Escape') {
		interactionMode.set('select');
		pendingPlaceUnitId.set(null);
	}

	// M：切换测量模式（输入框内不触发）
	if (e.key === 'm' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
		interactionMode.update((mode) => (mode === 'measure' ? 'select' : 'measure'));
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
