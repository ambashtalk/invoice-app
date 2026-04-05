import { autoUpdater } from 'electron-updater'
import { dialog, BrowserWindow } from 'electron'

export function setupUpdater(): void {
    // Basic configuration
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Check for updates every 2 hours if the app is left open
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(err => {
            console.error('[Updater] Failed to check for updates:', err)
        })
    }, 1000 * 60 * 60 * 2)

    autoUpdater.on('update-available', (info) => {
        console.log(`[Updater] Update available: ${info.version}`)
    })

    autoUpdater.on('update-downloaded', (info) => {
        console.log(`[Updater] Update downloaded: ${info.version}`)
        
        // Notify the user subtly that they can restart
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
            dialog.showMessageBox(windows[0], {
                type: 'info',
                title: 'Update Ready',
                message: 'A new version has been downloaded. Restart the app to apply the update.',
                buttons: ['Later', 'Restart Now'],
                defaultId: 1
            }).then((result) => {
                if (result.response === 1) {
                    autoUpdater.quitAndInstall()
                }
            })
        }
    })

    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err)
    })

    // Initial check
    autoUpdater.checkForUpdatesAndNotify()
}
