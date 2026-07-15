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
      ipcRenderer.invoke('veto:plugins:install', payload)
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

  formulas: {
    /** 调用主进程公式计算 */
    invoke: (formulaName: string, ctx: Record<string, unknown>): Promise<number | null> =>
      ipcRenderer.invoke('veto:formula:invoke', formulaName, ctx),

    /** 获取默认覆盖参数 */
    getOverrides: (): Promise<Record<string, number>> =>
      ipcRenderer.invoke('veto:formula:getOverrides'),

    /** 获取所有已注册公式名称 */
    list: (): Promise<string[]> => ipcRenderer.invoke('veto:formula:list')
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
