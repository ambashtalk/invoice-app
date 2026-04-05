import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI = {
    // Invoices
    getInvoices: () => ipcRenderer.invoke('db:invoices:list'),
    getInvoice: (id: string) => ipcRenderer.invoke('db:invoices:get', id),
    createInvoice: (data: any) => ipcRenderer.invoke('db:invoices:create', data),
    updateInvoice: (id: string, data: any) => ipcRenderer.invoke('db:invoices:update', id, data),
    deleteInvoice: (id: string) => ipcRenderer.invoke('db:invoices:delete', id),
    markInvoicePaid: (id: string) => ipcRenderer.invoke('db:invoices:mark-paid', id),
    markInvoiceCancelled: (id: string) => ipcRenderer.invoke('db:invoices:mark-cancelled', id),
    resolveInvoiceConflict: (id: string, data: any) => ipcRenderer.invoke('db:invoices:resolve-conflict', id, data),

    // Clients
    getClients: () => ipcRenderer.invoke('db:clients:list'),
    resolveClientConflict: (id: string, data: any) => ipcRenderer.invoke('db:clients:resolve-conflict', id, data),
    getClient: (id: string) => ipcRenderer.invoke('db:clients:get', id),
    createClient: (data: any) => ipcRenderer.invoke('db:clients:create', data),
    updateClient: (id: string, data: any) => ipcRenderer.invoke('db:clients:update', id, data),
    deleteClient: (id: string) => ipcRenderer.invoke('db:clients:delete', id),

    // Signatures
    getSignatures: () => ipcRenderer.invoke('db:signatures:list'),
    createSignature: (data: any) => ipcRenderer.invoke('db:signatures:create', data),
    deleteSignature: (id: string) => ipcRenderer.invoke('db:signatures:delete', id),
    setDefaultSignature: (id: string) => ipcRenderer.invoke('db:signatures:set-default', id),
    resolveSignatureConflict: (id: string, data: any) => ipcRenderer.invoke('db:signatures:resolve-conflict', id, data),

    // Payment Profiles
    getPaymentProfiles: () => ipcRenderer.invoke('db:payment-profiles:list'),
    createPaymentProfile: (data: any) => ipcRenderer.invoke('db:payment-profiles:create', data),
    updatePaymentProfile: (id: string, data: any) => ipcRenderer.invoke('db:payment-profiles:update', id, data),
    setDefaultPaymentProfile: (id: string) => ipcRenderer.invoke('db:payment-profiles:set-default', id),
    resolvePaymentProfileConflict: (id: string, data: any) => ipcRenderer.invoke('db:payment-profiles:resolve-conflict', id, data),

    // Signature processing
    pickSignatureFile: () => ipcRenderer.invoke('signature:pick-file'),
    processSignature: (filePath: string) => ipcRenderer.invoke('signature:process', filePath),

    // Currency
    getExchangeRate: (from: string, to: string) => ipcRenderer.invoke('currency:get-rate', from, to),

    // PDF
    generatePDF: (invoiceId: string) => ipcRenderer.invoke('pdf:generate', invoiceId),

    // Seller info
    getSellerInfo: () => ipcRenderer.invoke('settings:get-seller-info'),
    saveSellerInfo: (data: any) => ipcRenderer.invoke('settings:save-seller-info', data),

    // Google
    isGoogleConnected: () => ipcRenderer.invoke('google:is-connected'),
    hasCustomCredentials: () => ipcRenderer.invoke('google:has-custom-credentials'),
    getAuthUrl: () => ipcRenderer.invoke('google:get-auth-url'),
    connectGoogle: () => ipcRenderer.invoke('google:connect'),
    uploadCustomCredentials: () => ipcRenderer.invoke('google:upload-credentials'),
    deleteCustomCredentials: () => ipcRenderer.invoke('google:delete-credentials'),
    disconnectGoogle: () => ipcRenderer.invoke('google:disconnect'),

    // Drive
    syncToDrive: () => ipcRenderer.invoke('drive:sync'),

    // Outbox
    scheduleInvoice: (invoiceId: string, email: string, scheduledAt: number, subject?: string, body?: string) =>
        ipcRenderer.invoke('outbox:schedule', invoiceId, email, scheduledAt, subject, body),
    getOutboxItems: () => ipcRenderer.invoke('outbox:list'),
    cancelScheduledInvoice: (invoiceId: string) => ipcRenderer.invoke('outbox:cancel', invoiceId),
    getPendingOutboxCount: () => ipcRenderer.invoke('outbox:get-pending-count'),

    // Email Templates
    getEmailTemplates: () => ipcRenderer.invoke('db:email-templates:list'),
    getEmailTemplate: (id: string) => ipcRenderer.invoke('db:email-templates:get', id),
    getDefaultEmailTemplate: () => ipcRenderer.invoke('db:email-templates:get-default'),
    createEmailTemplate: (data: any) => ipcRenderer.invoke('db:email-templates:create', data),
    updateEmailTemplate: (id: string, data: any) => ipcRenderer.invoke('db:email-templates:update', id, data),
    deleteEmailTemplate: (id: string) => ipcRenderer.invoke('db:email-templates:delete', id),
    setDefaultEmailTemplate: (id: string) => ipcRenderer.invoke('db:email-templates:set-default', id),
    resolveEmailTemplateConflict: (id: string, data: any) => ipcRenderer.invoke('db:email-templates:resolve-conflict', id, data),

    // Events
    onOutboxUpdate: (callback: (data: { pendingCount: number }) => void) => {
        const subscription = (_event: any, data: any) => callback(data)
        ipcRenderer.on('outbox:status-updated', subscription)
        return () => { ipcRenderer.removeListener('outbox:status-updated', subscription) }
    }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer
declare global {
    interface Window {
        electronAPI: typeof electronAPI
    }
}
