import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, extname } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ensurePluginsDir, scanPluginDirectory } from './plugin-discovery'
import { loadPluginConfig, savePluginConfig, enablePlugin, disablePlugin } from './plugin-store'
import { getFormula, getDefaultOverrides, getRegisteredFormulaNames } from './formula-registry'
import type { PluginInstance } from './plugin-discovery'
import type { PluginConfig } from './plugin-store'
import type { CombatContext } from './formula-registry'

// ── 插件系统状态 ──────────────────────────────────────────────────────

let pluginInstances: PluginInstance[] = []

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
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 720,

    show: false,
    frame: false, // 是否显示窗口边框
    center: true, // 窗口居中

    autoHideMenuBar: true,

    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),

      // 禁用渲染器沙盒
      sandbox: false,
      // 禁用同源策略
      webSecurity: false,
      // 允许 HTTP
      allowRunningInsecureContent: true,
      // 禁用拼写检查
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
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
      hasAssets: !!p.path.assets
    }))
  })

  // ── 插件详情 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:plugins:get', (_event, pluginId: string) => {
    const plugin = pluginInstances.find((p) => p.manifest.id === pluginId)
    if (!plugin) return null

    let definitions: string | null = null
    if (plugin.path.definitions) {
      try {
        // fs already imported at top level
        definitions = fs.readFileSync(plugin.path.definitions, 'utf-8')
      } catch {
        /* ignore */
      }
    }

    return {
      ...plugin,
      definitions,
      manifest: plugin.manifest
    }
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

  // ── 插件配置读写 ──────────────────────────────────────────────────
  ipcMain.handle('veto:config:get', () => {
    return loadPluginConfig()
  })

  ipcMain.handle('veto:config:set', (_event, config: PluginConfig) => {
    savePluginConfig(config)
    refreshPlugins()
    return { success: true }
  })

  // ── 公式系统 ──────────────────────────────────────────────────────
  ipcMain.handle('veto:formula:invoke', (_event, formulaName: string, ctx: CombatContext) => {
    const fn = getFormula(formulaName)
    if (!fn) {
      console.warn(`[Main] Formula not found: ${formulaName}`)
      return null
    }
    return fn(ctx)
  })

  ipcMain.handle('veto:formula:getOverrides', () => {
    return getDefaultOverrides()
  })

  ipcMain.handle('veto:formula:list', () => {
    return getRegisteredFormulaNames()
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

  // ── 测试 ──────────────────────────────────────────────────────────
  ipcMain.on('ping', () => console.log('pong'))
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

  // 注册 IPC 处理器
  registerIpcHandlers()

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
