export const VETO_NAME = "Veto";

/** 点名标记后的过渡延迟（ms）—— 控制端锁定期 + Display 端出席覆盖层 */
export const ROLL_CALL_MARK_DELAY = 1500;

/** Display 窗口中发言名单默认最多显示人数 */
export const DISPLAY_MAX_SPEAKERS = 2;

/** 通用窗口控制 IPC 频道（主进程侧定义见 apps/electron/src/main/ipc/window.ts，按发送者窗口生效） */
export const IPC_WINDOW_CHANNELS = {
  minimize: 'window:minimize',
  maximize: 'window:maximize',
  close: 'window:close'
} as const;

/**
 * 仅展示模式（standalone）Display 窗口的 URL 标识。
 * 主进程打开该窗口时以 'standalone' 兜底（apps/electron/src/main/ipc/conference.ts），
 * 前端据此不绑定 committeeId，以接收 Chair 的全部广播。
 */
export const DISPLAY_STANDALONE_ID = 'standalone';
