import { getOAuth2Client, isGoogleConnected } from '../auth/google-auth'
import { google } from 'googleapis'
import { getDatabase } from '../database'
import { generateInvoicePDF } from '../pdf'
import { readFileSync } from 'fs'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import crypto from 'node:crypto'

/**
 * Gmail outbox poller
 * - Runs every 60 seconds
 * - Sends scheduled invoices via Gmail API with PDF attachment
 */

function notifyOutboxUpdate(): void {
    const windows = BrowserWindow.getAllWindows()
    const count = getPendingOutboxCount()
    windows.forEach(win => {
        win.webContents.send('outbox:status-updated', { pendingCount: count })
    })
}

export function getPendingOutboxCount(): number {
    const db = getDatabase()
    const result = db.prepare(`SELECT COUNT(*) as count FROM outbox WHERE status = 'PENDING'`).get() as { count: number }
    return result.count
}

let pollerInterval: NodeJS.Timeout | null = null
let isPolling = false

export function startOutboxPoller(): void {
    if (pollerInterval) return

    // Run immediately, then every 60 seconds
    pollAndSend()
    pollerInterval = setInterval(pollAndSend, 60 * 1000)
    console.log('Outbox poller started')
}

export function stopOutboxPoller(): void {
    if (pollerInterval) {
        clearInterval(pollerInterval)
        pollerInterval = null
    }
}

async function pollAndSend(): Promise<void> {
    console.log('Poller wake up...');
    if (!isGoogleConnected()) {
        console.log('Poller: Google not connected');
        return;
    }
    if (isPolling) {
        console.log('Poller: Already polling, skipping');
        return;
    }
    isPolling = true;

    try {
        const db = getDatabase()
        const now = Date.now()

        // Find all pending outbox items that are due
        const pending = db.prepare(`
            SELECT o.*, i.invoice_no, i.items, i.currency, i.total_amount, i.tax_rate,
                   i.client_id, i.signature_id
            FROM outbox o
            JOIN invoices i ON o.invoice_id = i.uuid
            WHERE o.status = 'PENDING' AND o.scheduled_at <= ?
            ORDER BY o.scheduled_at ASC
        `).all(now) as any[]

        console.log(`Poller: Found ${pending.length} pending items`);

        for (const item of pending) {
            try {
                console.log(`Poller: Processing invoice ${item.invoice_no} for ${item.recipient_email}`);
                
                console.log(`Poller: Generating PDF for ${item.invoice_no}...`);
                await sendInvoiceEmail(item)
                console.log(`Poller: Generated PDF and email for ${item.invoice_no}`);

                // Mark as sent and update invoice status atomically
                const updateStatus = db.transaction(() => {
                    db.prepare(`
                        UPDATE outbox SET status = 'SENT', sent_at = ? WHERE id = ?
                    `).run(now, item.id)

                    db.prepare(`
                        UPDATE invoices SET status = 'SENT', updated_at = ? WHERE uuid = ?
                    `).run(now, item.invoice_id)
                })
                updateStatus()

                console.log(`Poller: Successfully completed dispatch for invoice ${item.invoice_no}`);
            } catch (e: any) {
                console.error(`Failed to send invoice ${item.invoice_no}:`, e.message)

                // Mark as failed with error message
                db.prepare(`
                    UPDATE outbox SET status = 'FAILED', error_message = ? WHERE id = ?
                `).run(e.message, item.id)
            }
        }
    } catch (e: any) {
        console.error('Poller: CRITICAL ERROR IN POLL LOOP:', e);
    } finally {
        isPolling = false
        notifyOutboxUpdate()
    }
}

async function sendInvoiceEmail(outboxItem: any): Promise<void> {
    const auth = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth })

    // Generate PDF
    const db = getDatabase()
    const invoice = db.prepare('SELECT * FROM invoices WHERE uuid = ?').get(outboxItem.invoice_id) as any
    const client = invoice.client_id
        ? db.prepare('SELECT * FROM clients WHERE uuid = ?').get(invoice.client_id)
        : null
    const paymentProfile = db.prepare('SELECT * FROM payment_profiles WHERE is_default = 1').get()
    
    // Load seller info from settings file
    let sellerInfo = null
    try {
        const settingsPath = join(app.getPath('userData'), 'seller-info.json')
        sellerInfo = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    } catch { /* no seller info yet */ }

    let signature = null
    if (invoice.signature_id) {
        signature = db.prepare('SELECT * FROM signatures WHERE id = ?').get(invoice.signature_id)
    }
    if (!signature) {
        signature = db.prepare('SELECT * FROM signatures WHERE is_default = 1').get() || db.prepare('SELECT * FROM signatures ORDER BY rowid LIMIT 1').get()
    }

    const pdfBuffer = await generateInvoicePDF({
        ...invoice,
        items: JSON.parse(invoice.items),
        client,
        paymentProfile,
        signature,
        sellerInfo
    })

    const pdfBase64 = pdfBuffer.toString('base64')
    const safeInvoiceNo = (invoice.invoice_no || 'invoice').replace(/\//g, '-')
    const filename = `${safeInvoiceNo}.pdf`

    const subject = outboxItem.subject || `Invoice ${invoice.invoice_no}`
    const bodyHtml = outboxItem.body || `<p>Please find attached invoice ${invoice.invoice_no}.</p>`
    // Create plain text fallback by stripping HTML tags
    const bodyText = bodyHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()

    // Build RFC 2822 message with PDF attachment and HTML body
    const mixedBoundary = 'mixed_boundary_' + crypto.randomBytes(8).toString('hex')
    const altBoundary = 'alt_boundary_' + crypto.randomBytes(8).toString('hex')

    const rawMessage = [
        `From: me`,
        `To: ${outboxItem.recipient_email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        '',
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        '',
        `--${altBoundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        '',
        bodyText,
        '',
        `--${altBoundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        '',
        `<html><body>${bodyHtml}</body></html>`,
        '',
        `--${altBoundary}--`,
        '',
        `--${mixedBoundary}`,
        `Content-Type: application/pdf; name="${filename}"`,
        `Content-Disposition: attachment; filename="${filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        pdfBase64,
        `--${mixedBoundary}--`
    ].join('\r\n')

    const encodedMessage = Buffer.from(rawMessage).toString('base64url')

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
    })
}

/**
 * Schedule an invoice for sending
 */
export function scheduleInvoice(
    invoiceId: string,
    recipientEmail: string,
    scheduledAt: number,
    subject?: string,
    body?: string
): void {
    const db = getDatabase()
    const id = crypto.randomUUID()

    // NEW: Clean up any existing PENDING outbox items for this invoice to prevent duplicates
    db.prepare(`
        DELETE FROM outbox WHERE invoice_id = ? AND status = 'PENDING'
    `).run(invoiceId)

    db.prepare(`
        INSERT INTO outbox (id, invoice_id, recipient_email, subject, body, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(id, invoiceId, recipientEmail, subject || null, body || null, scheduledAt)

    // Update invoice status to SCHEDULED
    db.prepare(`
        UPDATE invoices SET status = 'SCHEDULED', scheduled_at = ?, updated_at = ?
        WHERE uuid = ?
    `).run(scheduledAt, Date.now(), invoiceId)

    notifyOutboxUpdate()
}

/**
 * Cancel a scheduled invoice
 */
export function cancelScheduledInvoice(invoiceId: string): void {
    const db = getDatabase()
    
    // Check if it is actually pending in the outbox
    const pendingQuery = db.prepare(`SELECT id FROM outbox WHERE invoice_id = ? AND status = 'PENDING'`)
    const pending = pendingQuery.get(invoiceId) as { id: string } | undefined
    
    if (pending) {
        db.transaction(() => {
            // Delete pending outbox entries
            db.prepare(`DELETE FROM outbox WHERE invoice_id = ? AND status = 'PENDING'`).run(invoiceId)
            
            // Change invoice status back to DRAFT
            db.prepare(`
                UPDATE invoices SET status = 'DRAFT', scheduled_at = NULL, updated_at = ?
                WHERE uuid = ? AND status = 'SCHEDULED'
            `).run(Date.now(), invoiceId)
        })()
        
        console.log(`[Outbox] Cancelled scheduled dispatch for invoice: ${invoiceId}`)
        notifyOutboxUpdate()
    }
}

/**
 * Get outbox items with status
 */
export function getOutboxItems(): any[] {
    const db = getDatabase()
    return db.prepare(`
        SELECT o.*, i.invoice_no FROM outbox o
        JOIN invoices i ON o.invoice_id = i.uuid
        ORDER BY o.scheduled_at DESC
    `).all()
}
