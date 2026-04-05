import { getOAuth2Client } from '../auth/google-auth'
import { google } from 'googleapis'
import { getDatabase } from '../database'

/**
 * Drive sync service
 * - Syncs invoice JSON metadata to a private 'appData' scope folder
 * - Uploads PDFs to a user-visible 'Invoices' folder
 */

const APP_FOLDER_NAME = 'AutomateInvoice-Data'
let appFolderId: string | null = null

async function getOrCreateAppFolder(): Promise<string> {
    if (appFolderId) return appFolderId

    const auth = getOAuth2Client()
    const drive = google.drive({ version: 'v3', auth })

    // Check if folder exists
    const res = await drive.files.list({
        q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)'
    })

    if (res.data.files && res.data.files.length > 0) {
        appFolderId = res.data.files[0].id!
        return appFolderId
    }

    // Create the folder
    const folder = await drive.files.create({
        requestBody: {
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
    })

    appFolderId = folder.data.id!
    return appFolderId
}

/**
 * Sync all non-SENT invoices' metadata to Google Drive as JSON
 */
export async function syncInvoicesToDrive(): Promise<{ synced: number; errors: string[] }> {
    const db = getDatabase()
    const errors: string[] = []
    let synced = 0

    // Only sync non-SENT invoices (SENT invoices are immutable)
    const invoices = db.prepare(
        "SELECT * FROM invoices WHERE status != 'SENT'"
    ).all() as any[]

    const folderId = await getOrCreateAppFolder()
    const auth = getOAuth2Client()
    const drive = google.drive({ version: 'v3', auth })

    for (const invoice of invoices) {
        try {
            const fileName = `invoice-${invoice.uuid}.json`
            const content = JSON.stringify(invoice, null, 2)

            // Check if file already exists on Drive
            const existing = await drive.files.list({
                q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
                fields: 'files(id, modifiedTime)'
            })

            if (existing.data.files && existing.data.files.length > 0) {
                const driveFile = existing.data.files[0]
                const driveUpdatedAt = new Date(driveFile.modifiedTime!).getTime()

                // Conflict detection: remote newer → skip
                if (driveUpdatedAt > invoice.updated_at) {
                    console.log(`Drive has newer version for invoice ${invoice.invoice_no}, skipping`)
                    continue
                }

                // Update existing file
                await drive.files.update({
                    fileId: driveFile.id!,
                    media: {
                        mimeType: 'application/json',
                        body: content
                    }
                })
            } else {
                // Create new file
                await drive.files.create({
                    requestBody: {
                        name: fileName,
                        parents: [folderId]
                    },
                    media: {
                        mimeType: 'application/json',
                        body: content
                    }
                })
            }
            synced++
        } catch (e: any) {
            errors.push(`Invoice ${invoice.invoice_no}: ${e.message}`)
        }
    }

    return { synced, errors }
}

/**
 * Upload a PDF to Google Drive and return the shareable file ID
 */
export async function uploadPDFToDrive(
    pdfBuffer: Buffer,
    fileName: string
): Promise<string> {
    const folderId = await getOrCreateAppFolder()
    const auth = getOAuth2Client()
    const drive = google.drive({ version: 'v3', auth })

    const { Readable } = require('stream')
    const stream = new Readable()
    stream.push(pdfBuffer)
    stream.push(null)

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
            mimeType: 'application/pdf'
        },
        media: {
            mimeType: 'application/pdf',
            body: stream
        },
        fields: 'id, webViewLink'
    })

    return res.data.id!
}
