import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import { join, extname } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import icon from '../../resources/icon.png?asset'
import { ensurePluginsDir, scanPluginDirectory, getPluginsDir } from './plugin-discovery'
import { loadPluginConfig, savePluginConfig, enablePlugin, disablePlugin } from './plugin-store'
import { loadStore, saveStore, deleteStore, migrateFromLocalStorage } from './veto-store'
import { startWsServer } from './ws-server'
import type { PluginInstance } from './plugin-discovery'
import type { PluginConfig } from './plugin-store'

// ── 插件系统状态 ──────────────────────────────────────────────────────

let pluginInstances: PluginInstance[] = []

// ── WebSocket 服务器端口（自动分配） ──────────────────────────────────

let wsServerPort = 19527

// ── 窗口引用 ──────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let displayWindow: BrowserWindow | null = null

function refreshPlugins(): void {
  const config = loadPluginConfig()
  const scanned = scanPluginDirectory()

  // 标记禁用状态
  for (const plugin of scanned) {
    plugin.disabled = config.disabled.includes(plugin.manifest.id)
  }

  pluginInstances = scanned
  console.log(
    `[Main] Plugin refresh: ${pluginInstances.length} total, ` +
      `${pluginInstances.filter((p) => !p.disabled).length} enabled`
  )
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 720,

    show: false,
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
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    // 主窗口关闭时一并关闭 display 窗口
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.close()
    }
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL('veto://app/index.html')
  }
}

// ── IPC 处理器注册 ───────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // ── 窗口控制 ──────────────────────────────────────────────────────
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // ── WebSocket 端口查询 ────────────────────────────────────────────
  ipcMain.handle('veto:ws:get-port', () => wsServerPort)

  // ── 插件列表 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:plugins:list', () => {
    return pluginInstances.map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      author: p.manifest.author,
      type: p.manifest.type,
      description: p.manifest.description,
      disabled: p.disabled,
      incompatible: p.incompatible,
      dependencies: p.manifest.dependencies,
      injects: p.manifest.injects,
      hasDefinitions: !!p.path.definitions,
      hasI18n: !!p.path.i18n,
      hasAssets: !!p.path.assets,
      hasDelegations: !!p.path.delegations
    }))
  })

  // ── 插件详情 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:plugins:get', (_event, pluginId: string) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin) return null

    const type = plugin.manifest.type

    // ── 按插件类型分流读取 ──────────────────────────────────────────
    const needsDefinitions =
      type === 'faction' || type === 'campaign'

    let definitions: string | null = null
    if (needsDefinitions && plugin.path.definitions) {
      try {
        if (plugin.path.definitionsIsDir) {
          const files = fs
            .readdirSync(plugin.path.definitions)
            .filter((f) => f.endsWith('.json'))
            .sort()
          const merged: Record<string, unknown> = {}
          for (const file of files) {
            const content = fs.readFileSync(join(plugin.path.definitions!, file), 'utf-8')
            const parsed = JSON.parse(content)
            for (const [key, val] of Object.entries(parsed)) {
              if (Array.isArray(val) && Array.isArray(merged[key])) {
                ;(merged[key] as unknown[]).push(...(val as unknown[]))
              } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                merged[key] = { ...((merged[key] as object) ?? {}), ...(val as object) }
              } else {
                merged[key] = val
              }
            }
          }
          definitions = JSON.stringify(merged)
        } else {
          definitions = fs.readFileSync(plugin.path.definitions, 'utf-8')
        }
      } catch (err) {
        console.error(`[Main] Failed to read definitions for ${pluginId}:`, err)
      }
    }

    // i18n：faction / scenario / ruleset / campaign 类型
    const i18n: Record<string, string> = {}
    if (needsDefinitions && plugin.path.i18n && fs.existsSync(plugin.path.i18n)) {
      try {
        const i18nFiles = fs.readdirSync(plugin.path.i18n)
        for (const file of i18nFiles) {
          if (file.endsWith('.json')) {
            const locale = file.replace(/\.json$/i, '')
            i18n[locale] = fs.readFileSync(join(plugin.path.i18n!, file), 'utf-8')
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 战役资源文件：仅 campaign 类型
    const campaignFiles: Record<string, string> = {}
    if (type === 'campaign') {
      const campaignKeys = ['mapConfig', 'deployments', 'facilities', 'events'] as const
      for (const key of campaignKeys) {
        const filePath = plugin.path[key]
        if (filePath && fs.existsSync(filePath)) {
          try {
            campaignFiles[key] = fs.readFileSync(filePath, 'utf-8')
          } catch {
            /* ignore */
          }
        }
      }
    }

    // 代表团预设：任何类型都可以提供（会议集成）
    let delegations: string | null = null
    if (plugin.path.delegations && fs.existsSync(plugin.path.delegations)) {
      try {
        delegations = fs.readFileSync(plugin.path.delegations, 'utf-8')
      } catch {
        /* ignore */
      }
    }

    return {
      ...plugin,
      definitions,
      i18n,
      manifest: plugin.manifest,
      campaignFiles,
      delegations
    }
  })

  // ── 插件目录文件列表 ──────────────────────────────────────────────
  ipcMain.handle('veto:plugins:list-files', (_event, pluginId: string, subDir: string) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin) return []

    try {
      const dirPath = join(plugin.path.plugin, subDir)
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return []

      return fs
        .readdirSync(dirPath)
        .filter((f) => f.endsWith('.json'))
        .sort()
    } catch {
      return []
    }
  })

  // ── 批量读取插件文件 ──────────────────────────────────────────────
  ipcMain.handle('veto:plugins:read-files', (_event, pluginId: string, filePaths: string[]) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin) return {}

    const result: Record<string, string> = {}
    for (const filePath of filePaths) {
      try {
        const fullPath = join(plugin.path.plugin, filePath)
        // 安全检查：确保请求的文件在插件目录内
        if (!fullPath.startsWith(plugin.path.plugin)) {
          console.warn(`[Main] Path traversal attempt: ${filePath}`)
          continue
        }
        if (fs.existsSync(fullPath)) {
          result[filePath] = fs.readFileSync(fullPath, 'utf-8')
        }
      } catch {
        /* skip */
      }
    }
    return result
  })

  // ── 插件启用/禁用 ───────────────────────────────────────────────
  ipcMain.handle('veto:plugins:toggle', (_event, pluginId: string, enabled: boolean) => {
    if (enabled) {
      enablePlugin(pluginId)
    } else {
      disablePlugin(pluginId)
    }
    refreshPlugins()
    return { success: true }
  })

  // ── 插件卸载 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:plugins:uninstall', (_event, pluginId: string) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin) {
      return { success: false, error: 'Plugin not found' }
    }

    try {
      // fs already imported at top level
      fs.rmSync(plugin.path.plugin, { recursive: true, force: true })
      refreshPlugins()

      // 通知所有窗口插件列表已更新
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('veto:event', {
          event: 'plugins:changed',
          data: {}
        })
      }

      return { success: true }
    } catch (err) {
      console.error(`[Main] Failed to uninstall plugin ${pluginId}:`, err)
      return { success: false, error: String(err) }
    }
  })

  // ── 插件安装 ──────────────────────────────────────────────────────
  ipcMain.handle(
    'veto:plugins:install',
    async (
      _event,
      payload: {
        manifest: Record<string, unknown>
        definitions: string | null
        i18n: Record<string, string>
        assets: Array<{ path: string; data: string; mimeType: string }>
        delegations?: string | null
      }
    ) => {
      const pluginId = payload.manifest.id as string
      if (!pluginId) return { success: false, error: 'Missing plugin id' }

      try {
        const pluginsDir = getPluginsDir()
        const pluginDir = join(pluginsDir, pluginId)

        // 清理旧目录（如果存在）
        if (fs.existsSync(pluginDir)) {
          fs.rmSync(pluginDir, { recursive: true, force: true })
        }
        fs.mkdirSync(pluginDir, { recursive: true })

        // 写入 manifest.json
        fs.writeFileSync(
          join(pluginDir, 'manifest.json'),
          JSON.stringify(payload.manifest, null, 2),
          'utf-8'
        )

        // 写入 definitions.json
        if (payload.definitions) {
          fs.writeFileSync(join(pluginDir, 'definitions.json'), payload.definitions, 'utf-8')
        }

        // 写入 delegations.json
        if (payload.delegations) {
          fs.writeFileSync(join(pluginDir, 'delegations.json'), payload.delegations, 'utf-8')
        }

        // 写入 i18n 文件
        if (Object.keys(payload.i18n).length > 0) {
          const i18nDir = join(pluginDir, 'i18n')
          fs.mkdirSync(i18nDir, { recursive: true })
          for (const [locale, content] of Object.entries(payload.i18n)) {
            fs.writeFileSync(join(i18nDir, `${locale}.json`), content, 'utf-8')
          }
        }

        // 写入资源文件
        if (payload.assets.length > 0) {
          const assetsDir = join(pluginDir, 'assets')
          fs.mkdirSync(assetsDir, { recursive: true })
          for (const asset of payload.assets) {
            const assetFullPath = join(assetsDir, asset.path)
            // 确保父目录存在
            fs.mkdirSync(join(assetFullPath, '..'), { recursive: true })
            fs.writeFileSync(assetFullPath, Buffer.from(asset.data, 'base64'))
          }
        }

        refreshPlugins()

        // 通知所有窗口
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('veto:event', {
            event: 'plugins:changed',
            data: { pluginId }
          })
        }

        console.log(`[Main] Plugin installed: ${pluginId}`)
        return { success: true }
      } catch (err) {
        console.error(`[Main] Failed to install plugin ${pluginId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── 插件配置读写 ──────────────────────────────────────────────────
  ipcMain.handle('veto:config:get', () => {
    return loadPluginConfig()
  })

  ipcMain.handle('veto:config:set', (_event, config: PluginConfig) => {
    savePluginConfig(config)
    refreshPlugins()
    return { success: true }
  })

  // ── 应用数据存储（文件持久化）────────────────────────────────────
  ipcMain.handle('veto:store:load', (_event, domain: string) => {
    return loadStore(domain as 'conferences' | 'battles' | 'settings')
  })

  ipcMain.handle('veto:store:save', (_event, domain: string, data: unknown) => {
    saveStore(domain as 'conferences' | 'battles' | 'settings', data)
    return { success: true }
  })

  ipcMain.handle('veto:store:delete', (_event, domain: string) => {
    deleteStore(domain as 'conferences' | 'battles' | 'settings')
    return { success: true }
  })

  ipcMain.handle('veto:store:migrate', (_event, domain: string, jsonData: string) => {
    migrateFromLocalStorage(domain as 'conferences' | 'battles' | 'settings', jsonData)
    return { success: true }
  })

  // ── 自动更新 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('veto:updater:download', async () => {
    try {
      const result = await autoUpdater.downloadUpdate()
      return { success: true, result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('veto:updater:quit-and-install', () => {
    setImmediate(() => {
      autoUpdater.quitAndInstall()
    })
    return { success: true }
  })

  ipcMain.handle('veto:updater:get-version', () => {
    return app.getVersion()
  })

  // ── 模拟大会：双窗口控制 ──────────────────────────────────────────

  ipcMain.handle(
    'veto:conference:open-display',
    async (
      _event,
      conferenceIdOrParams: string | { conferenceId?: string; wsUrl?: string; label?: string }
    ) => {
      const isParams = typeof conferenceIdOrParams === 'object'
      const conferenceId = isParams ? (conferenceIdOrParams.conferenceId || 'standalone') : conferenceIdOrParams
      const wsUrl = isParams ? conferenceIdOrParams.wsUrl : undefined
      const label = isParams ? conferenceIdOrParams.label : undefined

      if (displayWindow && !displayWindow.isDestroyed()) {
        displayWindow.focus()
        // 如果指定了外部 WS URL，通知 display 窗口更新连接
        if (wsUrl) {
          setTimeout(() => {
            displayWindow?.webContents.send('veto:conference:display-update', {
              type: 'ws-config',
              wsUrl
            })
          }, 500)
        }
        return { success: true }
      }

      displayWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 800,
        minHeight: 600,
        show: false,
        frame: false,
        center: true,
        autoHideMenuBar: true,
        title: label || 'VETO 大会 - 显示窗口',
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          webSecurity: false,
          allowRunningInsecureContent: true,
          spellcheck: false
        }
      })

      displayWindow.on('ready-to-show', () => {
        displayWindow!.show()
      })

      displayWindow.on('enter-full-screen', () => {
        displayWindow?.webContents.send('veto:conference:display-update', {
          type: 'fullscreen-change',
          isFullScreen: true
        })
      })
      displayWindow.on('leave-full-screen', () => {
        displayWindow?.webContents.send('veto:conference:display-update', {
          type: 'fullscreen-change',
          isFullScreen: false
        })
      })

      displayWindow.on('closed', () => {
        displayWindow = null
      })

      // Load the display route
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        displayWindow.loadURL(
          `${process.env['ELECTRON_RENDERER_URL']}#/conference-display/${conferenceId}`
        )
      } else {
        displayWindow.loadURL(
          `veto://app/index.html#/conference-display/${conferenceId}`
        )
      }

      // 等待页面加载完成，确保 listener 已注册
      await new Promise<void>((resolve) => {
        displayWindow!.webContents.once('did-finish-load', () => {
          resolve()
        })
      })

      // 如果指定了外部 WS URL，发送配置到 display 窗口
      if (wsUrl) {
        displayWindow!.webContents.send('veto:conference:display-update', {
          type: 'ws-config',
          wsUrl
        })
      }

      return { success: true }
    }
  )

  ipcMain.handle('veto:conference:close-display', () => {
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.close()
      displayWindow = null
    }
    return { success: true }
  })

  ipcMain.handle('veto:conference:send-to-display', (_event, data: unknown) => {
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.webContents.send('veto:conference:display-update', data)
    }
    return { success: true }
  })

  ipcMain.handle('veto:conference:toggle-fullscreen', () => {
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.setFullScreen(!displayWindow.isFullScreen())
      return { success: true, isFullScreen: displayWindow.isFullScreen() }
    }
    return { success: false }
  })

  // ── 资源文件 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:assets:get', (_event, pluginId: string, assetPath: string) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin || !plugin.path.assets) return null

    try {
      // fs and join already imported at top level
      const fullPath = join(plugin.path.assets, assetPath)

      // 安全检查：确保请求的文件在插件 assets 目录内
      if (!fullPath.startsWith(plugin.path.assets)) {
        console.warn(`[Main] Asset path traversal attempt: ${assetPath}`)
        return null
      }

      if (!fs.existsSync(fullPath)) return null

      const buffer = fs.readFileSync(fullPath)
      const ext = extname(fullPath).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      }

      return {
        data: buffer.toString('base64'),
        mimeType: mimeMap[ext] ?? 'application/octet-stream'
      }
    } catch {
      return null
    }
  })

  // ── 开发者工具 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:app:open-devtools', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' })
      return { success: true }
    }
    return { success: false, error: 'No window found' }
  })
}

// ── 自动更新初始化 ────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  // 配置日志
  autoUpdater.logger = log
  log.transports.file.level = 'debug'

  // 禁止自动下载，由用户手动触发
  autoUpdater.autoDownload = false

  // 转发 autoUpdater 事件到渲染进程
  const sendToAll = (event: string, data: unknown): void => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('veto:event', { event, data })
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendToAll('updater:checking-for-update', {})
  })

  autoUpdater.on('update-available', (info) => {
    sendToAll('updater:update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    sendToAll('updater:update-not-available', info)
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToAll('updater:download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: Math.round(progress.percent),
      total: progress.total,
      transferred: progress.transferred
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToAll('updater:update-downloaded', info)
  })

  autoUpdater.on('error', (error) => {
    sendToAll('updater:error', { message: error.message })
  })
}

// ── 注册自定义协议（必须在 app.whenReady 之前）────────────────────────
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化插件系统
  ensurePluginsDir()
  refreshPlugins()

  // 初始化 WebSocket 服务器（模拟大会 Display 通信）
  wsServerPort = await startWsServer()

  // 初始化自动更新
  setupAutoUpdater()

  // 注册 IPC 处理器
  registerIpcHandlers()

  // ── 注册 veto:// 自定义协议处理器 ─────────────────────────────────
  const rendererRoot = join(__dirname, '../renderer')

  protocol.handle('veto', (request) => {
    const url = new URL(request.url)
    // veto://app/xxx → out/renderer/xxx
    let filePath = url.pathname.replace(/^\/+/, '')

    // veto://app/ → index.html
    if (!filePath || filePath === 'app') {
      filePath = 'index.html'
    }
    // veto://app/assets/... → assets/...
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
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
      } catch {
        return new Response('Not Found', { status: 404 })
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
