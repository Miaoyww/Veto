import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// ── Veto Plugin API ────────────────────────────────────────────────────

const veto = {
  plugins: {
    /** 获取已安装插件列表 */
    list: (): Promise<
      Array<{
        id: string
        name: string
        version: string
        author: string
        type: string
        description?: string
        disabled: boolean
        incompatible: boolean
        dependencies?: string[]
        injects?: {
          formulas?: string
          events?: string
          ui?: string
        }
        hasDefinitions: boolean
        hasI18n: boolean
        hasAssets: boolean
      }>
    > => ipcRenderer.invoke('veto:plugins:list'),

    /** 获取插件详情（含 definitions 内容） */
    get: (pluginId: string): Promise<unknown> =>
      ipcRenderer.invoke('veto:plugins:get', pluginId),

    /** 启用/禁用插件 */
    toggle: (pluginId: string, enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('veto:plugins:toggle', pluginId, enabled),

    /** 卸载插件 */
    uninstall: (pluginId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('veto:plugins:uninstall', pluginId),

    /** 安装插件 */
    install: (payload: {
      manifest: Record<string, unknown>
      definitions: string | null
      i18n: Record<string, string>
      assets: Array<{ path: string; data: string; mimeType: string }>
    }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('veto:plugins:install', payload),

    /** 列出插件子目录中的 JSON 文件 */
    listFiles: (pluginId: string, subDir: string): Promise<string[]> =>
      ipcRenderer.invoke('veto:plugins:list-files', pluginId, subDir),

    /** 批量读取插件内的文件 */
    readFiles: (pluginId: string, filePaths: string[]): Promise<Record<string, string>> =>
      ipcRenderer.invoke('veto:plugins:read-files', pluginId, filePaths)
  },

  config: {
    /** 获取插件配置 */
    get: (): Promise<{ disabled: string[]; order?: string[] }> =>
      ipcRenderer.invoke('veto:config:get'),

    /** 保存插件配置 */
    set: (config: {
      disabled: string[]
      order?: string[]
    }): Promise<{ success: boolean }> => ipcRenderer.invoke('veto:config:set', config)
  },

  assets: {
    /** 获取插件资源的 base64 data URL */
    get: (
      pluginId: string,
      assetPath: string
    ): Promise<{ data: string; mimeType: string } | null> =>
      ipcRenderer.invoke('veto:assets:get', pluginId, assetPath)
  },

  events: {
    /** 订阅主进程事件（返回取消订阅函数） */
    on: (
      event: string,
      callback: (data: unknown) => void
    ): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { event: string; data: unknown }) => {
        if (payload.event === event) {
          callback(payload.data)
        }
      }
      ipcRenderer.on('veto:event', listener)
      return () => {
        ipcRenderer.removeListener('veto:event', listener)
      }
    }
  },

  updater: {
    /** 检查更新 */
    check: (): Promise<{ success: boolean; result?: unknown; error?: string }> =>
      ipcRenderer.invoke('veto:updater:check'),

    /** 下载更新 */
    download: (): Promise<{ success: boolean; result?: unknown; error?: string }> =>
      ipcRenderer.invoke('veto:updater:download'),

    /** 退出并安装更新 */
    quitAndInstall: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('veto:updater:quit-and-install'),

    /** 获取当前应用版本 */
    getVersion: (): Promise<string> => ipcRenderer.invoke('veto:updater:get-version')
  },

  conference: {
    /** 打开显示窗口 */
    openDisplay: (conferenceId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('veto:conference:open-display', conferenceId),

    /** 关闭显示窗口 */
    closeDisplay: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('veto:conference:close-display'),

    /** 向显示窗口发送数据 */
    sendToDisplay: (data: unknown): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('veto:conference:send-to-display', data),

    /** 监听来自主机的数据更新（显示窗口侧使用） */
    onDisplayUpdate: (callback: (data: unknown) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: unknown) => {
        callback(data)
      }
      ipcRenderer.on('veto:conference:display-update', listener)
      return () => {
        ipcRenderer.removeListener('veto:conference:display-update', listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('veto', veto)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.veto = veto
}
