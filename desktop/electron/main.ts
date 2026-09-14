import { app, BrowserWindow, Menu, nativeImage, Tray, screen, ipcMain, clipboard, globalShortcut, Notification, nativeTheme } from 'electron'
import { autoUpdater } from 'electron-updater'
import { v4 as uuidv4 } from 'uuid'
import Store from 'electron-store'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { execFile } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.name = 'iMemo Smart Clipboard'
app.setAppUserModelId('com.imemo.smart-clipboard')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

/**
 * Utility function to get the correct icon path based on the current operating system.
 */
const getIconPath = (): string => {
  const platform = process.platform;
  // In dev, assets are in 'public'. In prod, Vite copies them to 'dist'.
  const resourceDir = VITE_DEV_SERVER_URL 
    ? path.join(process.env.APP_ROOT, 'public') 
    : RENDERER_DIST;

  switch (platform) {
    case 'win32':
      return path.join(resourceDir, 'icons', 'win', 'icon.ico');
    case 'darwin':
      return path.join(resourceDir, 'icons', 'mac', 'icon.icns');
    case 'linux':
    default:
      return path.join(resourceDir, 'icons', 'png', '256x256.png');
  }
};

/**
 * Utility function to validate if a string is a valid base64-encoded image Data URL.
 */
const isValidImageDataUrl = (content: string): boolean => {
  if (typeof content !== 'string' || !content) return false
  const dataUrlRegex = /^data:image\/(png|jpeg|jpg|webp|gif|bmp|svg\+xml);base64,/i
  return dataUrlRegex.test(content)
}

/**
 * Utility function to get log file path inside user data directory.
 */
const getLogFilePath = (): string => {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    return path.join(logDir, 'app.log')
  } catch {
    return ''
  }
}

/**
 * Structured logger function for errors with contextual metadata and file persistence.
 */
const logError = (message: string, error?: unknown, context?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    level: 'ERROR',
    message,
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    context: context || {},
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error || '')
  }

  console.error(`[${timestamp}] ERROR: ${message}`, error, context || '')

  try {
    const logFilePath = getLogFilePath()
    if (logFilePath) {
      fs.appendFileSync(logFilePath, JSON.stringify(logData) + '\n', 'utf-8')
    }
  } catch (fsErr) {
    console.error('Failed to write to log file:', fsErr)
  }
}

interface ClipboardItem {
  id: string
  content: string
  type: 'text' | 'image'
  timestamp: number
  isStarred: boolean
}

interface Settings {
  instantPaste: boolean
  globalHotkey: string
  startOnStartup: boolean
  showNotifications: boolean
  theme: 'light' | 'dark' | 'system'
}

const store = new Store({
  defaults: {
    history: [] as ClipboardItem[],
    settings: {
      instantPaste: true,
      globalHotkey: 'Alt+V',
      startOnStartup: true,
      showNotifications: false,
      theme: 'system'
    } as Settings
  }
})

let win: BrowserWindow | null
const manualPreviewWins = new Map<string, BrowserWindow>()
let hoverPreviewWin: BrowserWindow | null = null
const contentCache = new Map<string, string>()
let lastHoverContent: string = ''
let tray: Tray | null = null

const WINDOW_WIDTH = 400
const WINDOW_HEIGHT = 600

let lastBlurTime = 0
let lastShowTime = 0

function resetWindowPosition() {
  if (!win) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x: screenX, y: screenY } = primaryDisplay.workArea
  
  const x = screenX + width - WINDOW_WIDTH
  const y = screenY + height - WINDOW_HEIGHT
  
  win.setPosition(x, y)
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => win?.show() },
    { label: 'Show at Default Position', click: () => {
      resetWindowPosition()
      win?.show()
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setToolTip('iMemo Smart Clipboard')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      lastShowTime = Date.now()
      resetWindowPosition()
      win?.show()
      win?.focus()
      // Ensure it's on top
      win?.setAlwaysOnTop(true, 'screen-saver')
      setTimeout(() => win?.setAlwaysOnTop(true), 100)
    }
  })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    if (win) {
      win.webContents.send('update:available', info.version)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    // Updates will be installed automatically on app quit
    // No dialog is shown to the user as per request
  })

  autoUpdater.on('error', (err) => {
    logError('Error in auto-updater', err, {
      currentVersion: app.getVersion(),
      autoDownload: autoUpdater.autoDownload
    })
    if (win) {
      win.webContents.send('update:error', {
        message: err.message || 'Auto-update failed',
        version: app.getVersion()
      })
    }
  })

  // Check for updates every 24 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      logError('Periodic update check failed', err)
    })
  }, 1000 * 60 * 60 * 24)

  // Initial check
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    logError('Initial update check failed', err)
  })
}

function toggleWindow() {
  if (win?.isVisible()) {
    win.hide()
  } else {
    if (Date.now() - lastBlurTime > 200) {
      lastShowTime = Date.now()
      win?.show()
    }
  }
}

function registerHotkey() {
  const settings = store.get('settings') as Settings
  const hotkey = settings.globalHotkey || 'Alt+V'
  
  globalShortcut.unregisterAll()
  try {
    const registered = globalShortcut.register(hotkey, () => {
      toggleWindow()
    })
    if (!registered) {
      logError('Failed to register hotkey', new Error(`Hotkey '${hotkey}' registration returned false`), {
        hotkey,
        platform: process.platform
      })
    }
  } catch (e) {
    logError('Failed to register hotkey', e, {
      hotkey,
      platform: process.platform
    })
  }
}

function simulatePaste() {
  const platform = process.platform
  if (platform === 'win32') {
    // Windows: Use PowerShell without shell invocation to send Ctrl+V
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"],
      (error) => {
        if (error) {
          logError('Failed to simulate paste on Windows', error, { platform })
        }
      }
    )
  } else if (platform === 'darwin') {
    // macOS: Use AppleScript without shell invocation to send Cmd+V
    execFile(
      'osascript',
      ['-e', 'tell application "System Events" to keystroke "v" using command down'],
      (error) => {
        if (error) {
          logError('Failed to simulate paste on macOS', error, { platform })
        }
      }
    )
  }
}

function showClipboardNotification(content: string) {
  const settings = store.get('settings') as Settings
  if (!settings.showNotifications) return

  new Notification({
    title: 'Copied to iMemo',
    body: content.length > 200 ? content.substring(0, 200) + '...' : content,
    silent: true,
    icon: getIconPath()
  }).show()
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x: screenX, y: screenY } = primaryDisplay.workArea

  win = new BrowserWindow({
    title: 'iMemo Smart Clipboard',
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: screenX + width - WINDOW_WIDTH,
    y: screenY + height - WINDOW_HEIGHT,
    icon: getIconPath(),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Remove the menu bar
  Menu.setApplicationMenu(null)

  // Hide when clicking away
  win.on('blur', () => {
    // Grace period to prevent hiding during tray click/focus transitions
    if (Date.now() - lastShowTime > 300) {
      lastBlurTime = Date.now()
      win?.hide()
    }
  })

  // Notify renderer when window is shown
  win.on('show', () => {
    win?.webContents.send('window:shown')
  })

  // Minimize to tray
  win.on('minimize', (event: Electron.Event) => {
    event.preventDefault()
    win?.hide()
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createPreviewWindow(id: string, content: string, isManual: boolean) {
  const previewWidth = 500
  const previewHeight = 400
  
  const previewWin = new BrowserWindow({
    width: previewWidth,
    height: previewHeight,
    frame: false,
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    show: false,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (!isManual) {
    previewWin.setIgnoreMouseEvents(true)
  }

  // Encode content and id into URL for the new window to pick up
  const query = new URLSearchParams({ 
    mode: 'preview', 
    id, 
    isManual: isManual ? 'true' : 'false' 
  }).toString()

  if (VITE_DEV_SERVER_URL) {
    previewWin.loadURL(`${VITE_DEV_SERVER_URL}?${query}`)
  } else {
    previewWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { query: { mode: 'preview', id, isManual: isManual ? 'true' : 'false' } })
  }

  previewWin.webContents.on('did-finish-load', () => {
    previewWin.webContents.send('preview:content', { id, content })
  })

  previewWin.on('closed', () => {
    if (isManual) {
      manualPreviewWins.delete(id)
    } else {
      hoverPreviewWin = null
    }
  })

  return previewWin
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  // Initialize launch at startup based on settings
  const settings = store.get('settings') as Settings
  
  // Set initial theme for Electron system UI
  nativeTheme.themeSource = settings.theme || 'system'
  // Only enable start on startup in production
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: settings.startOnStartup,
      path: app.getPath('exe'),
    })
  } else {
    // In dev, ensure it's disabled to avoid cluttering startup
    app.setLoginItemSettings({
      openAtLogin: false,
      path: app.getPath('exe'),
    })
  }

  // Start clipboard monitoring
  import('clipboard-event').then((clipboardWatcher) => {
    const watcher = clipboardWatcher.default
    watcher.start()

    let lastText = ''
    let lastImage = ''

    try {
      lastText = clipboard.readText()
      lastImage = clipboard.readImage().toDataURL()
    } catch (error) {
      logError('Failed to read initial clipboard content', error)
    }

    watcher.on('copy', () => {
      try {
        const formats = clipboard.availableFormats()
        
        if (formats.includes('image/png') || formats.includes('image/jpeg')) {
          const currentImage = clipboard.readImage()
          const currentDataUrl = currentImage.toDataURL()
          
          if (currentDataUrl && currentDataUrl !== lastImage && currentDataUrl !== 'data:image/png;base64,') {
            lastImage = currentDataUrl
            try {
              lastText = clipboard.readText()
            } catch (err) {
              logError('Failed to update lastText on image copy', err)
            }
            
            const history = store.get('history') as ClipboardItem[]
            
            const newItem: ClipboardItem = {
              id: uuidv4(),
              content: currentDataUrl,
              type: 'image',
              timestamp: Date.now(),
              isStarred: false,
            }
            
            const updatedHistory = [newItem, ...history].slice(0, 100)
            store.set('history', updatedHistory)
            win?.webContents.send('history:updated', updatedHistory)
            showClipboardNotification('Image copied to clipboard')
          }
        } else {
          const currentText = clipboard.readText()
          if (currentText && currentText !== lastText) {
            lastText = currentText
            lastImage = ''
            
            const history = store.get('history') as ClipboardItem[]
            if (history.length > 0 && history[0].content === currentText && history[0].type === 'text') return
            
            const newItem: ClipboardItem = {
              id: uuidv4(),
              content: currentText,
              type: 'text',
              timestamp: Date.now(),
              isStarred: false,
            }
            
            const updatedHistory = [newItem, ...history].slice(0, 100)
            store.set('history', updatedHistory)
            win?.webContents.send('history:updated', updatedHistory)
            showClipboardNotification(currentText)
          }
        }
      } catch (error) {
        logError('Error handling clipboard event', error)
      }
    })
  }).catch((error) => {
    logError('Failed to load clipboard-event watcher', error)
  })

  // Enable Hotkey
  registerHotkey()

  // Setup Auto-Updater
  setupAutoUpdater()
})

ipcMain.on('hide-window', () => {
  try {
    win?.hide()
  } catch (error) {
    logError('Error in hide-window handler', error)
  }
})

ipcMain.handle('history:get', (_event, { offset = 0, limit = 20 } = {}) => {
  try {
    const history = (store.get('history') as ClipboardItem[]) || []
    const items = history.slice(offset, offset + limit)
    return {
      items,
      total: history.length,
      hasMore: offset + limit < history.length
    }
  } catch (error) {
    logError('Error in history:get handler', error)
    return { items: [], total: 0, hasMore: false }
  }
})

ipcMain.handle('history:remove', (_event, id: string) => {
  try {
    const history = (store.get('history') as ClipboardItem[]) || []
    const updatedHistory = history.filter(item => item.id !== id)
    store.set('history', updatedHistory)
    return updatedHistory
  } catch (error) {
    logError('Error in history:remove handler', error, { id })
    return (store.get('history') as ClipboardItem[]) || []
  }
})

ipcMain.handle('history:toggle-star', (_event, id: string) => {
  try {
    const history = (store.get('history') as ClipboardItem[]) || []
    const updatedHistory = history.map(item => 
      item.id === id ? { ...item, isStarred: !item.isStarred } : item
    )
    store.set('history', updatedHistory)
    return updatedHistory
  } catch (error) {
    logError('Error in history:toggle-star handler', error, { id })
    return (store.get('history') as ClipboardItem[]) || []
  }
})

ipcMain.handle('history:search', (_event, { query, offset = 0, limit = 20 }) => {
  try {
    const history = (store.get('history') as ClipboardItem[]) || []
    if (!query) return { items: history.slice(offset, offset + limit), total: history.length, hasMore: offset + limit < history.length }
    const lowerQuery = query.toLowerCase()
    const filtered = history.filter(item => item.content && item.content.toLowerCase().includes(lowerQuery))
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      hasMore: offset + limit < filtered.length
    }
  } catch (error) {
    logError('Error in history:search handler', error, { query })
    return { items: [], total: 0, hasMore: false }
  }
})

ipcMain.handle('settings:get', () => {
  try {
    return store.get('settings')
  } catch (error) {
    logError('Error in settings:get handler', error)
    return null
  }
})

ipcMain.handle('settings:update', (_event, newSettings: Settings) => {
  try {
    const oldSettings = store.get('settings') as Settings
    store.set('settings', newSettings)
    
    // Handle start on startup change (only in production)
    if (app.isPackaged && newSettings.startOnStartup !== oldSettings?.startOnStartup) {
      app.setLoginItemSettings({
        openAtLogin: newSettings.startOnStartup,
        path: app.getPath('exe'),
      })
    }

    registerHotkey() // Re-register in case hotkey changed
    
    // Update Electron's native theme source
    nativeTheme.themeSource = newSettings.theme || 'system'
    
    // Notify renderer about the update (for theme switching, etc)
    win?.webContents.send('settings:updated', newSettings)
    
    return newSettings
  } catch (error) {
    logError('Error in settings:update handler', error)
    return store.get('settings')
  }
})

ipcMain.on('clipboard:paste-item', (_event, item: { content: string, type: 'text' | 'image' }) => {
  try {
    if (item.type === 'image') {
      if (!isValidImageDataUrl(item.content)) {
        logError('Invalid image Data URL format in clipboard:paste-item handler')
        return
      }
      const image = nativeImage.createFromDataURL(item.content)
      if (image.isEmpty()) {
        logError('Created nativeImage is empty in clipboard:paste-item handler')
        return
      }
      clipboard.writeImage(image)
    } else {
      clipboard.writeText(item.content)
    }
    
    // Close all manual previews and hide the hover preview
    manualPreviewWins.forEach(pWin => pWin.close())
    manualPreviewWins.clear()
    hoverPreviewWin?.hide()
    
    const settings = store.get('settings') as Settings
    if (settings?.instantPaste && win) {
      if (win.isVisible()) {
        // Event-driven focus tracking: trigger paste after window hide event completes
        win.once('hide', () => {
          setTimeout(() => {
            simulatePaste()
          }, 50)
        })
        win.hide()
      } else {
        simulatePaste()
      }
    } else {
      win?.hide()
    }
  } catch (error) {
    logError('Error in clipboard:paste-item handler', error)
  }
})

ipcMain.on('preview:show', (_event, { id, content, isManual }: { id: string, content: string, isManual: boolean }) => {
  try {
    contentCache.set(id, content)
    if (!isManual) lastHoverContent = content
    
    if (isManual) {
      // Hide hover window if it's open
      if (hoverPreviewWin) {
        hoverPreviewWin.hide()
      }

      // If window for this ID already exists, focus it
      if (manualPreviewWins.has(id)) {
        const pWin = manualPreviewWins.get(id)
        pWin?.show()
        pWin?.focus()
        return
      }

      const pWin = createPreviewWindow(id, content, true)
      manualPreviewWins.set(id, pWin)

      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
      
      // Offset based on number of windows
      const offset = manualPreviewWins.size * 20
      const x = screenX + screenWidth - 500 - offset
      const y = screenY + screenHeight - WINDOW_HEIGHT - 400 - 10 - offset
      
      pWin.setPosition(x, y)
      pWin.show()
    } else {
      // Hover preview (only one at a time)
      if (!hoverPreviewWin) {
        hoverPreviewWin = createPreviewWindow(id, content, false)
      }

      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
      
      const x = screenX + screenWidth - 500
      const mainWinY = screenY + screenHeight - WINDOW_HEIGHT
      const y = mainWinY - 400 - 10
      
      hoverPreviewWin.setPosition(x, y)
      hoverPreviewWin.webContents.send('preview:content', { id, content })
      hoverPreviewWin.showInactive()
    }
  } catch (error) {
    logError('Error in preview:show handler', error, { id })
  }
})

ipcMain.on('preview:hide', (_event, { id, isManual }: { id: string, isManual: boolean }) => {
  try {
    if (isManual) {
      const pWin = manualPreviewWins.get(id)
      pWin?.close()
      manualPreviewWins.delete(id)
    } else {
      hoverPreviewWin?.hide()
      hoverPreviewWin?.webContents.send('preview:clear')
    }
    
    win?.webContents.send('preview:hidden', id)
  } catch (error) {
    logError('Error in preview:hide handler', error, { id })
  }
})

ipcMain.handle('preview:get-content', (_event, id: string) => {
  try {
    if (!id || id === 'null') return lastHoverContent
    return contentCache.get(id) || null
  } catch (error) {
    logError('Error in preview:get-content handler', error, { id })
    return null
  }
})

ipcMain.handle('app:version', () => {
  try {
    return app.getVersion()
  } catch (error) {
    logError('Error in app:version handler', error)
    return ''
  }
})
