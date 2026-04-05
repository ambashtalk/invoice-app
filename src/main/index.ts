import { app, BrowserWindow } from 'electron'

// Disable hardware acceleration to resolve Mac GPU mailbox errors
app.disableHardwareAcceleration()

import { join } from 'path'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { startOutboxPoller, stopOutboxPoller } from './services/outbox'
import { startPeriodicSync } from './sync/drive-sync'
import { setupUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        backgroundColor: '#0f172a',
        show: false,
        autoHideMenuBar: true
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    // Load the renderer
    if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
        console.log(`[Main] Loading development URL: ${process.env['ELECTRON_RENDERER_URL']}`)
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        mainWindow.webContents.openDevTools()
    } else {
        const indexPath = join(__dirname, '../renderer/index.html')
        console.log(`[Main] Loading production file: ${indexPath}`)
        mainWindow.loadFile(indexPath)
    }

    mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
        console.error(`[Main] Failed to load: ${errorCode} - ${errorDescription}`)
    })
}

app.whenReady().then(() => {
    // Initialize database
    initDatabase()

    // Register IPC handlers
    registerIpcHandlers()

    createWindow()

    // Start the outbox poller (fire-and-forget background process)
    startOutboxPoller()

    // Start background quiet-sync with Google Drive
    startPeriodicSync()

    // Setup auto-updates
    setupUpdater()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopOutboxPoller()
        app.quit()
    }
})
