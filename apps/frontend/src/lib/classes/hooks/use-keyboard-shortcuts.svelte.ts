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
} from '$lib/classes/stores/battle/battle-store'
import {
  closeTopLayer,
  leftBarPinned,
  unitPanelVisible,
  unitsCardOpen,
  unitDragEnabled
} from '$lib/classes/stores/battle/battle-ui-store'
import {
  selectedWaypoint,
  routeInsertMode,
  startPendingRoute
} from '$lib/classes/stores/battle/route.store'
import { gameClock, TIME_SCALES, TIME_SCALE_LABELS } from '$lib/engine/game-clock.store'
import { globalSettings } from '$lib/classes/stores/app/global-settings.store'
import { get } from 'svelte/store'

export interface ShortcutDef {
  /** 显示用按键（大写），例如 'S'、'Z'、'Escape' */
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  /** 功能描述 */
  description: string
  /** 适用场景分区 */
  group: '危机推演' | '模拟大会'
}

/** 不带 group 的快捷键定义 */
type ShortcutDefWithoutGroup = Omit<ShortcutDef, 'group'>

/** 为一组快捷键批量添加 group */
function defineShortcuts(
  group: ShortcutDef['group'],
  defs: ShortcutDefWithoutGroup[]
): ShortcutDef[] {
  return defs.map((d) => ({ ...d, group }))
}

/** 危机推演快捷键 */
const BATTLE_SHORTCUTS = defineShortcuts('危机推演', [
  { key: '1', description: '第一流速' },
  { key: '2', description: '第二流速' },
  { key: '3', description: '第三流速' },
  { key: '4', description: '第四流速' },
  { key: 'M', description: '切换测量距离模式' },
  { key: 'Space', description: '暂停/继续' },
  { key: 'A', description: '打开侧边栏' },
  { key: 'Q', description: '打开单位面板' },
  { key: 'S', description: '打开状态面板' },
  { key: 'S', ctrl: true, description: '保存战局' },
  { key: 'Z', ctrl: true, description: '撤销操作' },
  { key: 'Escape', description: '退出当前交互模式' },
  { key: 'F3', description: '在选中路线节点后插入新节点' },
  { key: 'D', description: '切换单位拖拽' }
])

/** 模拟大会快捷键 */
const CONFERENCE_SHORTCUTS = defineShortcuts('模拟大会', [
  { key: 'Escape', description: '退出全屏模式' },
  { key: '↑', alt: true, description: '展示区上移' },
  { key: '↓', alt: true, description: '展示区下移' },
  { key: '←', alt: true, description: '展示区左移' },
  { key: '→', alt: true, description: '展示区右移' },
  { key: '0', alt: true, description: '重置展示区位置' }
])

/** 所有快捷键的元数据，供设置页面展示用 */
export const SHORTCUT_DEFS: ShortcutDef[] = [...BATTLE_SHORTCUTS, ...CONFERENCE_SHORTCUTS]

function isInInput(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}
function setTimeScale(scale: number) {
  gameClock.update((c) => ({ ...c, timeScale: scale }))
}
function togglePause() {
  gameClock.update((c) => ({ ...c, isPaused: !c.isPaused }))
}

/** 战局中保存的自定义流速（不在预设档位中时返回） */
function getSavedCustomScale(): number | null {
  const battle = get(currentBattle)
  if (battle?.timeScale != null && !(TIME_SCALES as readonly number[]).includes(battle.timeScale)) {
    return battle.timeScale
  }
  return null
}

export interface KeyboardShortcutOptions {
  /** 快捷键场景上下文，默认 'battle' */
  context?: 'battle' | 'conference-display'
  /** conference-display 专用：检查当前是否全屏 */
  isFullScreen?: () => boolean
  /** conference-display 专用：切换全屏 */
  toggleFullscreen?: () => void
}

/** Alt+方向键微调步长（px） */
const NUDGE_STEP = 10

function handleKeydown(e: KeyboardEvent, opts?: KeyboardShortcutOptions) {
  const context = opts?.context ?? 'battle'

  // ── 战局快捷键 ──
  if (context === 'battle') {
    // Ctrl+S：保存战局
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      saveBattleWithToast()
      return
    }

    // Ctrl+Z：撤销（输入框内不触发）
    if (e.ctrlKey && e.key === 'z' && !isInInput(e)) {
      e.preventDefault()
      undo()
      return
    }

    // Escape：按优先级逐层关闭最上层 UI
    if (e.key.toLowerCase() === 'escape') {
      closeTopLayer()
    }

    // F3：在选中路线节点后插入新节点
    if (e.key === 'F3' && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInInput(e)) {
      e.preventDefault()
      const selWp = get(selectedWaypoint)
      const mode = get(interactionMode)
      if (selWp && mode === 'select') {
        const battle = get(currentBattle)
        const placed = battle?.placedUnits.find((p) => p.id === selWp.placedId)
        if (placed) {
          const unitName =
            battle?.factions.flatMap((f) => f.units).find((u) => u.id === placed.unitId)?.name ??
            '单位'
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
      leftBarPinned.update((pinned) => !pinned)
    }

    // D: 切换单位拖拽（输入框内不触发）
    if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      unitDragEnabled.update((v) => !v)
    }

    // Q：切换单位面板（输入框内不触发）
    if (e.key.toLocaleLowerCase() === 'q' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      const placed = get(selectedPlacedUnit)
      if (placed) {
        // 切换到选中单位所在阵营，打开左栏 + 单位面板
        currentFactionId.set(placed.factionId)
        leftBarPinned.set(true)
        unitPanelVisible.set(true)
      } else {
        // 无选中单位：仅切换单位面板显示
        leftBarPinned.set(true)
        unitPanelVisible.update((v) => !v)
      }
    }

    // S：切换状态面板（输入框内不触发）
    if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      unitsCardOpen.update((open) => !open)
    }

    // M：切换测量模式（输入框内不触发）
    if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      interactionMode.update((mode) => (mode === 'measure' ? 'select' : 'measure'))
    }

    // Space：暂停/继续（输入框内不触发）
    if (e.key.toLowerCase() === ' ' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      togglePause()
    }

    /* 流速快捷键 */
    if (e.key.toLowerCase() === '1' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      setTimeScale(TIME_SCALES[0])
    }

    if (e.key.toLowerCase() === '2' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      setTimeScale(TIME_SCALES[1])
    }
    if (e.key.toLowerCase() === '3' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      setTimeScale(TIME_SCALES[2])
    }
    if (e.key.toLowerCase() === '4' && !e.ctrlKey && !e.altKey && !isInInput(e)) {
      const custom = getSavedCustomScale()
      if (custom != null) setTimeScale(custom)
    }
  }

  // ── 模拟大会 Display 窗口快捷键 ──
  if (context === 'conference-display') {
    // Escape：退出全屏
    if (e.key === 'Escape' && opts?.isFullScreen?.()) {
      opts?.toggleFullscreen?.()
    }

    // Alt+方向键 微调主展示区位置（自动持久化）
    if (e.altKey) {
      const gs = get(globalSettings)
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          globalSettings.patch({ displayOffsetY: gs.displayOffsetY - NUDGE_STEP })
          break
        case 'ArrowDown':
          e.preventDefault()
          globalSettings.patch({ displayOffsetY: gs.displayOffsetY + NUDGE_STEP })
          break
        case 'ArrowLeft':
          e.preventDefault()
          globalSettings.patch({ displayOffsetX: gs.displayOffsetX - NUDGE_STEP })
          break
        case 'ArrowRight':
          e.preventDefault()
          globalSettings.patch({ displayOffsetX: gs.displayOffsetX + NUDGE_STEP })
          break
        case '0':
          e.preventDefault()
          globalSettings.patch({ displayOffsetX: 0, displayOffsetY: 0 })
          break
      }
    }
  }
}

/**
 * 在根组件中调用，通过 `$effect` 注册/清理全局 keydown 监听器。
 * 必须在 Svelte 组件或含有 Svelte 5 rune 上下文的文件中调用。
 *
 * @param opts.context - 快捷键场景：`'battle'`（默认，战局页面）或 `'conference-display'`（Display 窗口）
 * @param opts.isFullScreen - conference-display 专用：检查当前是否全屏
 * @param opts.toggleFullscreen - conference-display 专用：切换全屏
 */
export function useKeyboardShortcuts(opts?: KeyboardShortcutOptions) {
  $effect(() => {
    const handler = (e: KeyboardEvent) => handleKeydown(e, opts)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
}
