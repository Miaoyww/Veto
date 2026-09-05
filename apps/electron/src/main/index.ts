/**
 * index.ts — Veto 主进程入口
 *
 * 负责：
 * - Electron 应用生命周期管理
 * - 窗口创建（主窗口 + Display 副窗口）
 * - 插件发现与加载
 * - IPC 处理器注册
 * - WebSocket Display 通信
 * - 自动更新
 * - veto:// 自定义协议
 */

import { app, shell, BrowserWindow, protocol } from 'electron'
import { join, extname } from 'path'
import * as fs from 'fs'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { createLogger, initializeLogging, log as baseLog } from './logger'
import icon from '../../resources/icon.png?asset'
import { ensurePluginsDir, scanPluginDirectory } from './plugin-discovery'
import { loadPluginConfig } from './plugin-store'
import { startDisplayWs, setHostRuntime, stopDisplayWs } from './ws-display'
import { loadPlugin, unloadAll } from './plugin-host/extension-host/index'
import { registerAllIpcHandlers, type IpcDependencies } from './ipc'
import { publishLanConference, stopLanConference } from './lan-service'
import { loadStore, saveStore } from './data/store'
import {
  HostRuntime,
  type HostConference,
  type HostRuntimeRepository,
  type HostRuntimeState
} from './host-runtime'
import type { Capability } from '../../../shared/content-types'
import type { PluginInstance } from './plugin-discovery'
import type { DisplayWindowRef } from './ipc/conference'

const log = createLogger('Main')

// ═══════════════════════════════════════════════════════════════════
// 应用状态
// ═══════════════════════════════════════════════════════════════════

let pluginInstances: PluginInstance[] = []
let mainWindow: BrowserWindow | null = null
const displayWindow: DisplayWindowRef = { current: null }
let wsServerPort = 0
let hostRuntime: HostRuntime | null = null

const hostRuntimeRepository: HostRuntimeRepository = {
  load: () => loadStore<HostRuntimeState>('host-runtime'),
  save: (state) => saveStore('host-runtime', state)
}

function loadOrMigrateHostRuntime(): HostRuntime {
  const existing = loadStore<HostRuntimeState>('host-runtime')
  if (existing) return new HostRuntime(hostRuntimeRepository)

  const legacy = loadStore<Array<Record<string, unknown>>>('conferences') ?? []
  const migrated: HostRuntimeState = {
    version: 1,
    conferences: legacy.map(migrateLegacyConference).filter((item): item is HostConference => item !== null),
    auditLog: [],
    idempotency: []
  }
  if (migrated.conferences.length > 0) saveStore('host-runtime', migrated)
  return new HostRuntime({
    load: () => migrated,
    save: (state) => saveStore('host-runtime', state)
  })
}

function refreshConfiguredConferences(): void {
  if (!hostRuntime) return
  const legacy = loadStore<Array<Record<string, unknown>>>('conferences') ?? []
  for (const raw of legacy) {
    const conference = migrateLegacyConference(raw)
    if (conference) hostRuntime.registerConfiguredConference(conference)
  }
}

function migrateLegacyConference(raw: Record<string, unknown>): HostConference | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const committees = Array.isArray(raw.committees)
    ? raw.committees.map((committee, committeeIndex) => {
        const item = committee as Record<string, unknown>
        const committeeId = typeof item.id === 'string' ? item.id : `committee-${committeeIndex}`
        const seats = Array.isArray(item.seats)
          ? item.seats.map((seat, seatIndex) => {
              const value = seat as Record<string, unknown>
              const seatId = typeof value.id === 'string' ? value.id : `${committeeId}-seat-${seatIndex}`
              return {
                id: seatId,
                committeeId,
                name: typeof value.name === 'string' ? value.name : seatId,
                role: typeof value.role === 'string' ? value.role : undefined,
                roleId: typeof value.roleId === 'string' ? value.roleId : undefined,
                userId: typeof value.userId === 'string' ? value.userId : undefined,
                capabilityOverrides: (value.capabilityOverrides ?? {}) as Partial<Record<Capability, boolean>>,
                proceduralProfile: value.procedure as HostConference['committees'][number]['seats'][number]['proceduralProfile']
              }
            })
          : []
        return {
          id: committeeId,
          conferenceId: raw.id as string,
          name: typeof item.name === 'string' ? item.name : committeeId,
          type: (item.type === 'mpc' || item.type === 'ipc' ? item.type : 'cabinet') as 'mpc' | 'ipc' | 'cabinet',
          mode: (item.mode === 'crisis' ? 'crisis' : item.mode === 'standing' ? 'standing' : undefined) as 'crisis' | 'standing' | undefined,
          defaultCapabilities: Array.isArray(item.defaultCapabilities) ? item.defaultCapabilities as Capability[] : [],
          seats
        }
      })
    : []
  const seatAccesses = Array.isArray(raw.seatAccesses)
    ? raw.seatAccesses.filter((entry): entry is { seatId: string; inviteCode: string } => {
        const value = entry as Record<string, unknown>
        return typeof value.seatId === 'string' && typeof value.inviteCode === 'string'
      })
    : []
  const users = Array.isArray(raw.users)
    ? raw.users.filter((entry): entry is { id: string; name: string; passwordHash?: string; passwordSalt?: string } => {
        const value = entry as Record<string, unknown>
        return typeof value.id === 'string' && typeof value.name === 'string'
      })
    : []
  return {
    id: raw.id as string,
    name: raw.name as string,
    committees,
    users,
    seatAccesses,
    seatGroups: Array.isArray(raw.seatGroups) ? raw.seatGroups as HostConference['seatGroups'] : [],
    chairAssignments: Array.isArray(raw.chairAssignments) ? raw.chairAssignments as HostConference['chairAssignments'] : [],
    timelines: Array.isArray(raw.timelines) ? raw.timelines as HostConference['timelines'] : [],
    directives: Array.isArray(raw.directives) ? raw.directives as HostConference['directives'] : [],
    news: Array.isArray(raw.news) ? raw.news as HostConference['news'] : [],
    situations: Array.isArray(raw.situations)
      ? raw.situations as HostConference['situations']
      : Array.isArray(raw.situationUpdates) ? raw.situationUpdates as HostConference['situations'] : []
  }
}

// ═══════════════════════════════════════════════════════════════════
// 插件刷新
// ═══════════════════════════════════════════════════════════════════

function refreshPlugins(): void {
  const config = loadPluginConfig()
  const scanned = scanPluginDirectory()

  for (const plugin of scanned) {
    plugin.disabled = config.disabled.includes(plugin.manifest.id)
  }

  pluginInstances = scanned
  log.info(
    `Plugin refresh: ${pluginInstances.length} total, ` +
      `${pluginInstances.filter((p) => !p.disabled).length} enabled`
  )
}

// ═══════════════════════════════════════════════════════════════════
// 窗口管理
// ═══════════════════════════════════════════════════════════════════

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 720,
    show: true,
    frame: false,
    center: true,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  mainWindow.on('closed', () => {
    if (displayWindow.current && !displayWindow.current.isDestroyed()) {
      displayWindow.current.close()
    }
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // The static SvelteKit build uses root-relative asset URLs (/_app/...).
    // Load it through the registered protocol so those URLs resolve inside
    // the renderer directory instead of the filesystem root under file://.
    // Keep the browser pathname at `/` so SvelteKit resolves the home route.
    // The protocol handler serves index.html for the root request.
    mainWindow.loadURL('veto://app/')
  }

}

// ═══════════════════════════════════════════════════════════════════
// 自动更新
// ═══════════════════════════════════════════════════════════════════

function setupAutoUpdater(): void {
  autoUpdater.logger = baseLog
  autoUpdater.autoDownload = false

  const sendToAll = (event: string, data: unknown): void => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('veto:event', { event, data })
    }
  }

  autoUpdater.on('checking-for-update', () => sendToAll('updater:checking-for-update', {}))
  autoUpdater.on('update-available', (info) => sendToAll('updater:update-available', info))
  autoUpdater.on('update-not-available', (info) => sendToAll('updater:update-not-available', info))
  autoUpdater.on('download-progress', (progress) =>
    sendToAll('updater:download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: Math.round(progress.percent),
      total: progress.total,
      transferred: progress.transferred
    })
  )
  autoUpdater.on('update-downloaded', (info) => sendToAll('updater:update-downloaded', info))
  autoUpdater.on('error', (error) => sendToAll('updater:error', { message: error.message }))
}

// ═══════════════════════════════════════════════════════════════════
// veto:// 自定义协议
// ═══════════════════════════════════════════════════════════════════

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'veto',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function registerProtocol(): void {
  const rendererRoot = join(__dirname, '../renderer')

  protocol.handle('veto', (request) => {
    const url = new URL(request.url)
    let filePath = url.pathname.replace(/^\/+/, '')

    if (!filePath || filePath === 'app') {
      filePath = 'index.html'
    }
    if (filePath.startsWith('app/')) {
      filePath = filePath.slice(4)
    }

    const fullPath = join(rendererRoot, filePath)

    // 安全检查：确保路径不越出 renderer 目录
    if (!fullPath.startsWith(rendererRoot)) {
      return new Response('Forbidden', { status: 403 })
    }

    const ext = extname(fullPath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    }

    try {
      const data = fs.readFileSync(fullPath)
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' }
      })
    } catch {
      // SPA fallback：非文件路径返回 index.html（支持 pushState 路由）
      try {
        const html = fs.readFileSync(join(rendererRoot, 'index.html'))
        return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
      } catch {
        return new Response('Not Found', { status: 404 })
      }
    }
  })
}

// ═══════════════════════════════════════════════════════════════════
// 应用启动
// ═══════════════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  // 初始化日志
  initializeLogging()

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 插件发现
  ensurePluginsDir()
  refreshPlugins()

  hostRuntime = loadOrMigrateHostRuntime()
  setHostRuntime(hostRuntime)

  // WebSocket Display 通信（基于 ws 包）
  wsServerPort = await startDisplayWs(hostRuntime)
  log.info(`Display WS started on port ${wsServerPort}`)

  // IPC 处理器注册
  const ipcDeps: IpcDependencies = {
    pluginInstances,
    displayWindow,
    wsServerPort,
    refreshPlugins,
    hostRuntime,
    getHostConsoleWindow: () => mainWindow,
    onActiveConferenceChanged: () => {
      const active = hostRuntime?.activeConference
      if (active) {
        publishLanConference(
          { conferenceId: active.id, name: active.name, phase: 'active' },
          wsServerPort
        )
      } else {
        stopLanConference()
      }
    },
    refreshConfiguredConferences
  }
  registerAllIpcHandlers(ipcDeps)

  // Plugin Host：激活所有 utility 插件（带 service 入口的）
  for (const plugin of pluginInstances) {
    if (plugin.disabled) continue
    if (plugin.path.service) {
      try {
        await loadPlugin(plugin.path.plugin, plugin.manifest.id)
        log.info(`Plugin "${plugin.manifest.id}" activated`)
      } catch (err) {
        log.error(`Failed to activate plugin "${plugin.manifest.id}":`, err)
      }
    }
  }

  // 自动更新
  setupAutoUpdater()

  // 注册自定义协议
  registerProtocol()

  // 创建主窗口
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ═══════════════════════════════════════════════════════════════════
// 退出
// ═══════════════════════════════════════════════════════════════════

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  hostRuntime?.shutdown()
  setHostRuntime(null)
  await unloadAll()
  await stopDisplayWs()
})
