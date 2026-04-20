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
    isGoogleConnected,
    getAuthUrl,
    startOAuthFlow,
    saveCustomCredentials,
    deleteCustomCredentials,
    disconnectGoogle,
    hasCustomCredentials,
    getUserProfile
} from './auth/google-auth'
import { getReceivedByMonth } from './database/repositories/reports'
import { syncTableToDrive, lockInvoice, unlockInvoice, isInvoiceLocked, wipeLocalData } from './sync/drive-sync'
import { getDeviceId } from './utils/device-id'

import { scheduleInvoice, getOutboxItems, cancelScheduledInvoice, getPendingOutboxCount } from './services/outbox'
import {
    getEmailTemplates,
    getEmailTemplate,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    setDefaultEmailTemplate,
    getDefaultEmailTemplate
} from './database/repositories/email-templates'


export function registerIpcHandlers(): void {
    // Email template handlers
    ipcMain.handle('db:email-templates:list', () => getEmailTemplates())
    ipcMain.handle('db:email-templates:get', (_, id: string) => getEmailTemplate(id))
    ipcMain.handle('db:email-templates:get-default', () => getDefaultEmailTemplate())
    ipcMain.handle('db:email-templates:create', (_, data) => createEmailTemplate(data))
    ipcMain.handle('db:email-templates:update', (_, id: string, data) => updateEmailTemplate(id, data))
    ipcMain.handle('db:email-templates:delete', (_, id: string) => deleteEmailTemplate(id))
    ipcMain.handle('db:email-templates:set-default', (_, id: string) => setDefaultEmailTemplate(id))
    // Invoice handlers
    ipcMain.handle('db:invoices:list', () => getInvoices())
    ipcMain.handle('db:invoices:get', (_, id: string) => getInvoice(id))
    ipcMain.handle('db:invoices:create', (_, data) => createInvoice(data))
    ipcMain.handle('db:invoices:update', (_, id: string, data) => updateInvoice(id, data))
    ipcMain.handle('db:invoices:delete', (_, id: string) => deleteInvoice(id))
    ipcMain.handle('db:invoices:mark-paid', (_, id: string) => markAsPaid(id))
    ipcMain.handle('db:invoices:mark-cancelled', (_, id: string) => markAsCancelled(id))


    // Conflict resolution removed (Silent Server-Wins)


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
    ipcMain.handle('google:get-profile', () => getUserProfile())
    ipcMain.handle('google:has-custom-credentials', () => hasCustomCredentials())
    ipcMain.handle('google:get-auth-url', () => getAuthUrl())
    ipcMain.handle('google:connect', async () => {
        // Open the auth URL in the default browser
        const authUrl = getAuthUrl()
        if (!authUrl) throw new Error('No credentials found. Application might not be configured correctly.')
        shell.openExternal(authUrl)
        // Start the loopback server to catch the callback
        return startOAuthFlow()
    })
    ipcMain.handle('google:upload-credentials', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select credentials.json',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        })
        if (result.canceled || result.filePaths.length === 0) return false
        saveCustomCredentials(result.filePaths[0])
        return true
    })
    ipcMain.handle('google:delete-credentials', () => {
        deleteCustomCredentials()
        disconnectGoogle()
        return true
    })
    ipcMain.handle('db:invoices:get-revenue-data', () => {
        // Placeholder for future revenue charts
        return []
    })

    // Reports
    ipcMain.handle('db:reports:received-by-month', () => getReceivedByMonth())

    // Drive Sync — syncs ALL entity tables through the universal generic engine
    ipcMain.handle('drive:sync', async () => {
        const tables = [
            { name: 'invoices', pk: 'uuid' },
            { name: 'clients', pk: 'uuid' },
            { name: 'signatures', pk: 'id' },
            { name: 'payment_profiles', pk: 'id' },
            { name: 'email_templates', pk: 'id' }
        ]
        let totalSynced = 0
        const errors: string[] = []
        for (const t of tables) {
            const r = await syncTableToDrive(t.name, t.pk).catch(e => ({ synced: 0, errors: [e.message as string] }))
            totalSynced += r.synced
            errors.push(...r.errors)
        }
        return { synced: totalSynced, errors }
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

    // Locking handlers
    ipcMain.handle('sync:lock', (_, uuid: string, userId: string) => lockInvoice(uuid, userId, getDeviceId()))
    ipcMain.handle('sync:unlock', (_, uuid: string) => unlockInvoice(uuid))
    ipcMain.handle('sync:is-locked', (_, uuid: string, userId: string) => isInvoiceLocked(uuid, userId, getDeviceId()))


    // Logout and cleanup
    ipcMain.handle('auth:logout', async () => {
        await disconnectGoogle()
        wipeLocalData()
        return true
    })
}
