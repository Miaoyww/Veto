/**
 * ui-store.ts
 * ───────────
 * 集中管理所有浮动面板 / 对话框的开关状态。
 * 使用 closeTopLayer() 可按优先级从最上层往下逐层关闭。
 *
 * 优先级（高 → 低，Escape 按此顺序关闭）：
 *   1. 警告/确认对话框  (alert-dialog-store)
 *   2. 设置对话框       (setting-dialog-store / settingOpen)
 *   3. 推演单位态势卡片 (unitsCardOpen)
 *   4. 非选择交互模式   (interactionMode !== 'select')
 */
import { get, writable } from 'svelte/store';
import { alertDialogStore, hideAlert } from '$lib/stores/app/global-ui-store';
import { interactionMode, pendingPlaceUnitId } from './battle-store';
import { clearRouteEditState } from './route.store';

export const currentTab = writable<string>('general');

// ── 面板开关 ───────────────────────────────────────────────

/** 推演单位态势浮动卡片 */
export const unitsCardOpen = writable(false);

/** 左侧面板开关（Escape 可关闭） */
export const leftBarPinned = writable<boolean>(false);

/** 右侧面板开关（Escape 可关闭） */
export const rightBarPinned = writable<boolean>(false);

/** 单位面板开关（由 left-sidebar 及快捷键控制） */
export const unitPanelVisible = writable<boolean>(false);

// ── 逐层关闭 ───────────────────────────────────────────────

/**
 * 按优先级关闭当前最上层打开的 UI 层。
 * @returns 是否有层被关闭
 */
export function closeTopLayer(): boolean {
	// 1. 警告/确认对话框（最高优先级）
	if (get(alertDialogStore).open) {
		hideAlert();
		return true;
	}

	// 2. 推演单位态势卡片
	if (get(unitsCardOpen)) {
		unitsCardOpen.set(false);
		return true;
	}

	// 3. 非选择交互模式（测量 / 放置 / 路线 / 打击 / 攻击）
	const mode = get(interactionMode);
	if (mode !== 'select') {
		interactionMode.set('select');
		pendingPlaceUnitId.set(null);
		clearRouteEditState();
		return true;
	}

	return false;
}
