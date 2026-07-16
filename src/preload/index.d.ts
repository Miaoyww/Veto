import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    veto: VetoAPI
  }
}

export interface VetoAPI {
  plugins: {
    list: () => Promise<
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
    >
    get: (pluginId: string) => Promise<{
      id: string
      manifest: Record<string, unknown>
      definitions: string | null
      i18n: Record<string, string>
      campaignFiles?: Record<string, string>
    } | null>
    toggle: (pluginId: string, enabled: boolean) => Promise<{ success: boolean }>
    uninstall: (pluginId: string) => Promise<{ success: boolean; error?: string }>
    install: (payload: {
      manifest: Record<string, unknown>
      definitions: string | null
      i18n: Record<string, string>
      assets: Array<{ path: string; data: string; mimeType: string }>
    }) => Promise<{ success: boolean; error?: string }>
    listFiles: (pluginId: string, subDir: string) => Promise<string[]>
    readFiles: (pluginId: string, filePaths: string[]) => Promise<Record<string, string>>
  }
  config: {
    get: () => Promise<{ disabled: string[]; order?: string[] }>
    set: (config: { disabled: string[]; order?: string[] }) => Promise<{ success: boolean }>
  }
  formulas: {
    invoke: (formulaName: string, ctx: Record<string, unknown>) => Promise<number | null>
    getOverrides: () => Promise<Record<string, number>>
    list: () => Promise<string[]>
  }
  assets: {
    get: (pluginId: string, assetPath: string) => Promise<{ data: string; mimeType: string } | null>
  }
  events: {
    on: (event: string, callback: (data: unknown) => void) => () => void
  }
}
