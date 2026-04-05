import { ipcMain, dialog, shell } from 'electron'
import {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid,
    markAsCancelled
} from './database/repositories/invoices'
import {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient
} from './database/repositories/clients'
import {
    getSignatures,
    createSignature,
    deleteSignature,
    setDefaultSignature
} from './database/repositories/signatures'
import {
    getPaymentProfiles,
    createPaymentProfile,
    updatePaymentProfile,
    setDefaultPaymentProfile
} from './database/repositories/payment-profiles'
import { processSignatureFromBase64 } from './signature-processor'
import { getExchangeRate } from './services/currency'
import { generateInvoicePDF } from './pdf'
import { getDatabase } from './database'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import {
    startOAuthFlow,
    getAuthUrl,
    isGoogleConnected,
    disconnectGoogle
} from './auth/google-auth'
import { syncInvoicesToDrive } from './sync/drive-sync'
import { scheduleInvoice, getOutboxItems, cancelScheduledInvoice, getPendingOutboxCount } from './services/outbox'

export function registerIpcHandlers(): void {
    // Invoice handlers
    ipcMain.handle('db:invoices:list', () => getInvoices())
    ipcMain.handle('db:invoices:get', (_, id: string) => getInvoice(id))
    ipcMain.handle('db:invoices:create', (_, data) => createInvoice(data))
    ipcMain.handle('db:invoices:update', (_, id: string, data) => updateInvoice(id, data))
    ipcMain.handle('db:invoices:delete', (_, id: string) => deleteInvoice(id))
    ipcMain.handle('db:invoices:mark-paid', (_, id: string) => markAsPaid(id))
    ipcMain.handle('db:invoices:mark-cancelled', (_, id: string) => markAsCancelled(id))

    // Client handlers
    ipcMain.handle('db:clients:list', () => getClients())
    ipcMain.handle('db:clients:get', (_, id: string) => getClient(id))
    ipcMain.handle('db:clients:create', (_, data) => createClient(data))
    ipcMain.handle('db:clients:update', (_, id: string, data) => updateClient(id, data))
    ipcMain.handle('db:clients:delete', (_, id: string) => deleteClient(id))

    // Signature handlers
    ipcMain.handle('db:signatures:list', () => getSignatures())
    ipcMain.handle('db:signatures:create', (_, data) => createSignature(data))
    ipcMain.handle('db:signatures:delete', (_, id: string) => deleteSignature(id))
    ipcMain.handle('db:signatures:set-default', (_, id: string) => setDefaultSignature(id))

    // Payment profile handlers
    ipcMain.handle('db:payment-profiles:list', () => getPaymentProfiles())
    ipcMain.handle('db:payment-profiles:create', (_, data) => createPaymentProfile(data))
    ipcMain.handle('db:payment-profiles:update', (_, id: string, data) => updatePaymentProfile(id, data))
    ipcMain.handle('db:payment-profiles:set-default', (_, id: string) => setDefaultPaymentProfile(id))

    // Signature processing
    ipcMain.handle('signature:process', async (_, filePath: string) => {
        return processSignatureFromBase64(readFileSync(filePath).toString('base64'))
    })

    // Signature file dialog
    ipcMain.handle('signature:pick-file', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Signature Image',
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp'] }],
            properties: ['openFile']
        })
        if (result.canceled || result.filePaths.length === 0) return null
        return result.filePaths[0]
    })

    // Currency exchange rate
    ipcMain.handle('currency:get-rate', async (_, from: string, to: string) => {
        return getExchangeRate(from as any, to as any)
    })

    // PDF generation
    ipcMain.handle('pdf:generate', async (_, invoiceId: string) => {
        const db = getDatabase()
        const invoice = db.prepare('SELECT * FROM invoices WHERE uuid = ?').get(invoiceId) as any
        if (!invoice) throw new Error('Invoice not found')

        const client = invoice.client_id
            ? db.prepare('SELECT * FROM clients WHERE uuid = ?').get(invoice.client_id)
            : null
        const paymentProfile = db.prepare('SELECT * FROM payment_profiles WHERE is_default = 1').get()
        let signature = null
        if (invoice.signature_id) {
            signature = db.prepare('SELECT * FROM signatures WHERE id = ?').get(invoice.signature_id)
        }
        if (!signature) {
            signature = db.prepare('SELECT * FROM signatures WHERE is_default = 1').get() || db.prepare('SELECT * FROM signatures ORDER BY rowid LIMIT 1').get()
        }

        // Load seller info from settings file
        let sellerInfo = null
        try {
            const settingsPath = join(app.getPath('userData'), 'seller-info.json')
            sellerInfo = JSON.parse(readFileSync(settingsPath, 'utf-8'))
        } catch { /* no seller info yet */ }

        const pdfBuffer = await generateInvoicePDF({
            ...invoice,
            items: JSON.parse(invoice.items),
            client,
            paymentProfile,
            signature,
            sellerInfo
        })

        // Show save dialog
        const safeInvoiceNo = (invoice.invoice_no || 'invoice').replace(/\//g, '-')
        const saveResult = await dialog.showSaveDialog({
            title: 'Save Invoice PDF',
            defaultPath: `${safeInvoiceNo}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        })

        if (!saveResult.canceled && saveResult.filePath) {
            writeFileSync(saveResult.filePath, pdfBuffer)
            shell.showItemInFolder(saveResult.filePath)
            return { saved: true, path: saveResult.filePath }
        }

        return { saved: false, path: null }
    })

    // Seller info (for invoice header)
    ipcMain.handle('settings:get-seller-info', () => {
        try {
            const settingsPath = join(app.getPath('userData'), 'seller-info.json')
            return JSON.parse(readFileSync(settingsPath, 'utf-8'))
        } catch {
            return null
        }
    })

    ipcMain.handle('settings:save-seller-info', (_, data: any) => {
        const settingsPath = join(app.getPath('userData'), 'seller-info.json')
        writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8')
        return true
    })

    // Google Auth
    ipcMain.handle('google:is-connected', () => isGoogleConnected())
    ipcMain.handle('google:get-auth-url', () => getAuthUrl())
    ipcMain.handle('google:connect', async () => {
        // Open the auth URL in the default browser
        const authUrl = getAuthUrl()
        if (!authUrl) throw new Error('No credentials.json found')
        shell.openExternal(authUrl)
        // Start the loopback server to catch the callback
        return startOAuthFlow()
    })
    ipcMain.handle('google:disconnect', () => {
        disconnectGoogle()
        return true
    })

    // Drive Sync
    ipcMain.handle('drive:sync', async () => {
        return syncInvoicesToDrive()
    })

    // Outbox
    ipcMain.handle('outbox:schedule', (_, invoiceId: string, email: string, scheduledAt: number, subject?: string, body?: string) => {
        scheduleInvoice(invoiceId, email, scheduledAt, subject, body)
        return true
    })
    ipcMain.handle('outbox:cancel', (_, invoiceId: string) => {
        cancelScheduledInvoice(invoiceId)
        return true
    })
    ipcMain.handle('outbox:list', () => getOutboxItems())
    ipcMain.handle('outbox:get-pending-count', () => getPendingOutboxCount())
}
