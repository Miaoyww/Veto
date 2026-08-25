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
  assets: {
    get: (pluginId: string, assetPath: string) => Promise<{ data: string; mimeType: string } | null>
  }
  events: {
    on: (event: string, callback: (data: unknown) => void) => () => void
  }
  updater: {
    check: () => Promise<{ success: boolean; result?: unknown; error?: string }>
    download: () => Promise<{ success: boolean; result?: unknown; error?: string }>
    quitAndInstall: () => Promise<{ success: boolean }>
    getVersion: () => Promise<string>
  }
  app: {
    openDevTools: () => Promise<{ success: boolean; error?: string }>
  }
  conference: {
    openDisplay: (
      conferenceIdOrParams: string | { conferenceId?: string; wsUrl?: string; label?: string }
    ) => Promise<{ success: boolean }>
    closeDisplay: () => Promise<{ success: boolean }>
    sendToDisplay: (data: unknown) => Promise<{ success: boolean }>
    onDisplayUpdate: (callback: (data: unknown) => void) => () => void
  }
  ws: {
    getPort: () => Promise<number>
  }
  lan: {
    scan: (timeoutMs?: number) => Promise<
      Array<{
        conferenceId: string
        name: string
        phase: string
        host: string
        port: number
        url: string
        wsUrl: string
        appVersion: string
      }>
    >
    getServerInfo: () => Promise<{
      port: number
      addresses: string[]
      urls: string[]
    }>
    queryConference: (address: string) => Promise<{
      conferenceId: string
      name: string
      phase: string
      host: string
      port: number
      url: string
      wsUrl: string
      appVersion: string
    } | null>
    publishConference: (info: {
      conferenceId: string
      name: string
      phase: string
    }) => Promise<{ success: boolean }>
    unpublishConference: () => Promise<{ success: boolean }>
  }
  services: {
    list: () => Promise<
      Array<{
        id: string
        name: string
        version: string
        type: string
        running: boolean
        startedAt?: number
        status?: Record<string, unknown>
      }>
    >
    reload: (pluginId: string) => Promise<{ success: boolean; error?: string }>
    emitEvent: (type: string, data?: Record<string, unknown>) => void
  }
  store: {
    load: (domain: string) => Promise<unknown>
    save: (domain: string, data: unknown) => Promise<{ success: boolean }>
    delete: (domain: string) => Promise<{ success: boolean }>
    migrate: (domain: string, jsonData: string) => Promise<{ success: boolean }>
  }
}
