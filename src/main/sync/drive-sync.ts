import { getOAuth2Client } from '../auth/google-auth'
import { google } from 'googleapis'
import { getDatabase } from '../database'
import * as zlib from 'zlib'

/**
 * Drive sync service
 * - Syncs invoice JSON metadata to a private 'appData' scope folder
 * - Uploads PDFs to a user-visible 'Invoices' folder
 */

const APP_FOLDER_NAME = 'PrismInvoice-Data'
let appFolderId: string | null = null
let syncInterval: NodeJS.Timeout | null = null;

export function startPeriodicSync() {
    if (syncInterval) clearInterval(syncInterval)
    
    const tables = [
        { name: 'invoices', pk: 'uuid' },
        { name: 'clients', pk: 'uuid' },
        { name: 'signatures', pk: 'id' },
        { name: 'payment_profiles', pk: 'id' },
        { name: 'email_templates', pk: 'id' }
    ]

    const runAll = async () => {
        for (const table of tables) {
            await syncTableToDrive(table.name, table.pk).catch(e => console.error(`Sync failed for ${table.name}:`, e.message))
        }
    }

    runAll()
    syncInterval = setInterval(runAll, 30 * 60 * 1000)
}

export async function pushSingleRecordToDrive(tableName: string, localRecord: any, primaryKey: string = 'uuid'): Promise<void> {
    if (!localRecord || localRecord.has_conflict) return;

    try {
        const folderId = await getOrCreateAppFolder()
        const auth = getOAuth2Client()
        const drive = google.drive({ version: 'v3', auth })
        
        const id = localRecord[primaryKey]
        const fileName = `${tableName}-${id}.json.gz`

        const res = await drive.files.list({
            q: `'${folderId}' in parents and name = '${fileName}' and trashed=false`,
            fields: 'files(id)'
        })
        const existingFile = res.data.files?.[0]

        const { has_conflict, conflict_data, last_synced_at, ...cleanRecord } = localRecord
        
        if (tableName === 'invoices' && typeof cleanRecord.items === 'string') {
            try { cleanRecord.items = JSON.parse(cleanRecord.items) } catch(e){}
        }
        
        const content = JSON.stringify(cleanRecord)
        const compressedBuffer = zlib.gzipSync(Buffer.from(content, 'utf-8'))
        
        const { Readable } = require('stream')
        const stream = new Readable()
        stream.push(compressedBuffer)
        stream.push(null)

        if (existingFile) {
            await drive.files.update({ fileId: existingFile.id!, media: { mimeType: 'application/gzip', body: stream } })
        } else {
            await drive.files.create({ requestBody: { name: fileName, parents: [folderId] }, media: { mimeType: 'application/gzip', body: stream } })
        }
        
        getDatabase().prepare(`UPDATE ${tableName} SET last_synced_at = ? WHERE ${primaryKey} = ?`).run(localRecord.updated_at, id)
    } catch (e: any) {
        console.error(`Silent delta-push failed for ${tableName}-${localRecord?.[primaryKey]}:`, e.message)
    }
}

async function getOrCreateAppFolder(): Promise<string> {
    if (appFolderId) return appFolderId

    const auth = getOAuth2Client()
    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.list({
        q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)'
    })

    if (res.data.files && res.data.files.length > 0) {
        appFolderId = res.data.files[0].id!
        return appFolderId
    }

    const folder = await drive.files.create({
        requestBody: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
    })

    appFolderId = folder.data.id!
    return appFolderId
}

export async function syncTableToDrive(tableName: string, primaryKey: string = 'uuid'): Promise<{ synced: number; errors: string[] }> {
    const db = getDatabase()
    const errors: string[] = []
    let synced = 0

    const folderId = await getOrCreateAppFolder()
    const auth = getOAuth2Client()
    const drive = google.drive({ version: 'v3', auth })

    const localRecords = db.prepare(`SELECT * FROM ${tableName}`).all() as any[]
    const localMap = new Map<string, any>()
    for (const rec of localRecords) localMap.set(rec[primaryKey], rec)

    let remoteFiles: any[] = []
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and name contains '${tableName}-' and name contains '.json.gz' and trashed=false`,
            fields: 'files(id, name, modifiedTime)'
        })
        remoteFiles = res.data.files || []
    } catch (e: any) {
        errors.push(`List remote files failed: ${e.message}`)
        return { synced, errors }
    }

    const remoteMap = new Map<string, any>()
    for (const file of remoteFiles) {
        const match = file.name?.match(new RegExp(`${tableName}-(.+)\\.json\\.gz`))
        if (match && match[1]) remoteMap.set(match[1], file)
    }

    for (const [id, remoteFile] of remoteMap) {
        const remoteTime = new Date(remoteFile.modifiedTime!).getTime()
        const localRec = localMap.get(id)

        if (!localRec || remoteTime > (localRec.last_synced_at || 0)) {
            try {
                const downloadRes = await drive.files.get({ fileId: remoteFile.id!, alt: 'media' }, { responseType: 'arraybuffer' })
                const decompressed = zlib.gunzipSync(Buffer.from(downloadRes.data as ArrayBuffer)).toString('utf-8')
                const remoteData = JSON.parse(decompressed)
                
                if (tableName === 'invoices' && typeof remoteData.items !== 'string') {
                    remoteData.items = JSON.stringify(remoteData.items || [])
                }

                if (!localRec) {
                    const keys = Object.keys(remoteData)
                    const marks = keys.map(() => '?').join(',')
                    db.prepare(`INSERT INTO ${tableName} (${keys.join(',')}, has_conflict, conflict_data, last_synced_at) VALUES (${marks}, 0, NULL, ?)`).run(...keys.map(k => remoteData[k]), remoteData.updated_at)
                    synced++
                    localMap.set(id, db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey}=?`).get(id))
                } else {
                    if (localRec.updated_at > localRec.last_synced_at) {
                        const localClone = { ...localRec, has_conflict: undefined, conflict_data: undefined, last_synced_at: undefined, updated_at: undefined }
                        const remoteClone = { ...remoteData, has_conflict: undefined, conflict_data: undefined, last_synced_at: undefined, updated_at: undefined }
                        if (JSON.stringify(localClone) !== JSON.stringify(remoteClone)) {
                            console.log(`Conflict detected for ${tableName} ${id}`)
                            db.prepare(`UPDATE ${tableName} SET has_conflict = 1, conflict_data = ? WHERE ${primaryKey} = ?`).run(JSON.stringify(remoteData), id)
                            synced++
                        } else {
                            db.prepare(`UPDATE ${tableName} SET last_synced_at = ? WHERE ${primaryKey} = ?`).run(localRec.updated_at, id)
                        }
                    } else {
                        const updates = Object.keys(remoteData).map(k => `${k} = ?`).join(', ')
                        const vals = Object.values(remoteData)
                        db.prepare(`UPDATE ${tableName} SET ${updates}, has_conflict = 0, conflict_data = NULL, last_synced_at = ? WHERE ${primaryKey} = ?`).run(...vals, remoteData.updated_at, id)
                        synced++
                    }
                    localMap.set(id, db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey}=?`).get(id))
                }
            } catch (e: any) { errors.push(`Download failed ${id}: ${e.message}`) }
        }
    }

    for (const [id, localRec] of localMap) {
        if (localRec.has_conflict) continue
        const remoteFile = remoteMap.get(id)
        if (!remoteFile || localRec.updated_at > (localRec.last_synced_at || 0)) {
            await pushSingleRecordToDrive(tableName, localRec, primaryKey)
            synced++
        }
    }

    return { synced, errors }
}

// ---------------------------------------------------------------------------
//  Backward-compat aliases (invoices.ts still uses these names)
// ---------------------------------------------------------------------------

/** @deprecated Use pushSingleRecordToDrive('invoices', invoice, 'uuid') */
export async function pushSingleInvoiceToDrive(invoice: any): Promise<void> {
    return pushSingleRecordToDrive('invoices', invoice, 'uuid')
}

/** @deprecated Use syncTableToDrive('invoices', 'uuid') */
export async function syncInvoicesToDrive() {
    return syncTableToDrive('invoices', 'uuid')
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
