import { safeStorage } from 'electron'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { google } from 'googleapis'

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email',
    'profile'
]

const TOKENS_FILE = join(app.getPath('userData'), 'google-tokens.enc')
const REDIRECT_PORT = 42813
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`

export interface GoogleCredentials {
    client_id: string
    client_secret: string
}

function loadCredentials(): GoogleCredentials | null {
    const credPath = join(app.getPath('userData'), 'credentials.json')
    if (existsSync(credPath)) {
        try {
            const credsJson = JSON.parse(readFileSync(credPath, 'utf-8'))
            return credsJson.installed || credsJson.web || credsJson
        } catch (e) {
            console.error('Invalid custom credentials.json', e)
        }
    }

    // Fallback 1: Environment Variables (Vite main process)
    const env = (import.meta as any).env || process.env
    if (env.VITE_GOOGLE_CLIENT_ID && env.VITE_GOOGLE_CLIENT_SECRET) {
        return {
            client_id: env.VITE_GOOGLE_CLIENT_ID,
            client_secret: env.VITE_GOOGLE_CLIENT_SECRET
        }
    }

    // Fallback 2: the config directory
    const configPath = join(app.getAppPath(), 'config', 'credentials.json')
    if (existsSync(configPath)) {
        try {
            const credsJson = JSON.parse(readFileSync(configPath, 'utf-8'))
            return credsJson.installed || credsJson.web || credsJson
        } catch (e) {}
    }
    
    return null
}

export function hasCustomCredentials(): boolean {
    return existsSync(join(app.getPath('userData'), 'credentials.json'))
}

export function saveCustomCredentials(filePath: string): void {
    const credPath = join(app.getPath('userData'), 'credentials.json')
    const content = readFileSync(filePath, 'utf-8')
    // Validate it's JSON
    JSON.parse(content)
    writeFileSync(credPath, content, 'utf-8')
}

export function deleteCustomCredentials(): void {
    const credPath = join(app.getPath('userData'), 'credentials.json')
    if (existsSync(credPath)) {
        const { rmSync } = require('fs')
        rmSync(credPath)
    }
}

function saveTokens(tokens: object): void {
    const json = JSON.stringify(tokens)
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(json)
        writeFileSync(TOKENS_FILE, encrypted)
    } else {
        // Fallback: store as plaintext (development)
        writeFileSync(TOKENS_FILE + '.plain', json, 'utf-8')
    }
}

function loadTokens(): object | null {
    try {
        if (existsSync(TOKENS_FILE)) {
            const encrypted = readFileSync(TOKENS_FILE)
            if (safeStorage.isEncryptionAvailable()) {
                const json = safeStorage.decryptString(encrypted)
                return JSON.parse(json)
            }
        }
        // Fallback plaintext
        const plainPath = TOKENS_FILE + '.plain'
        if (existsSync(plainPath)) {
            return JSON.parse(readFileSync(plainPath, 'utf-8'))
        }
    } catch (e) {
        console.warn('Failed to load Google tokens:', e)
    }
    return null
}

export function getOAuth2Client() {
    const creds = loadCredentials()
    if (!creds) throw new Error('Google credentials not found. Add credentials.json to userData directory.')

    const oauth2Client = new google.auth.OAuth2(
        creds.client_id,
        creds.client_secret,
        REDIRECT_URI
    )

    const tokens = loadTokens()
    if (tokens) {
        oauth2Client.setCredentials(tokens as any)
    }

    // Auto-save refreshed tokens
    oauth2Client.on('tokens', (newTokens) => {
        const existing = loadTokens() || {}
        saveTokens({ ...existing, ...newTokens })
    })

    return oauth2Client
}

export async function startOAuthFlow(): Promise<string> {
    const creds = loadCredentials()
    if (!creds) throw new Error('Google credentials not found')

    const oauth2Client = new google.auth.OAuth2(
        creds.client_id,
        creds.client_secret,
        REDIRECT_URI
    )

    // The caller (ipc.ts) opens the authUrl in the browser via shell.openExternal.
    // We just wait for the loopback callback with the auth code.
    const code = await waitForOAuthCode()

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    saveTokens(tokens)

    return 'Google account connected successfully'
}

function waitForOAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
        const http = require('http')
        const server = http.createServer((req: any, res: any) => {
            const url = new URL(req.url, `http://127.0.0.1:${REDIRECT_PORT}`)
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')

            res.writeHead(200, { 'Content-Type': 'text/html' })
            if (code) {
                res.end('<h2>✅ Authorization successful! You can close this window.</h2>')
                server.close()
                resolve(code)
            } else {
                res.end(`<h2>❌ Authorization failed: ${error}</h2>`)
                server.close()
                reject(new Error(`OAuth error: ${error}`))
            }
        })

        server.listen(REDIRECT_PORT, '127.0.0.1', () => {
            console.log(`OAuth server listening on port ${REDIRECT_PORT}`)
        })

        server.on('error', reject)

        // Timeout after 5 minutes
        setTimeout(() => {
            server.close()
            reject(new Error('OAuth flow timed out'))
        }, 5 * 60 * 1000)
    })
}

export function isGoogleConnected(): boolean {
    try {
        const tokens = loadTokens()
        return tokens !== null
    } catch {
        return false
    }
}

export function getAuthUrl(): string | null {
    const creds = loadCredentials()
    if (!creds) return null

    const oauth2Client = new google.auth.OAuth2(
        creds.client_id,
        creds.client_secret,
        REDIRECT_URI
    )

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    })
}

export function disconnectGoogle(): void {
    try {
        const { rmSync } = require('fs')
        if (existsSync(TOKENS_FILE)) rmSync(TOKENS_FILE)
        if (existsSync(TOKENS_FILE + '.plain')) rmSync(TOKENS_FILE + '.plain')
    } catch (e) {
        console.warn('Failed to disconnect Google:', e)
    }
}

export async function getUserProfile() {
    const auth = getOAuth2Client()
    const oauth2 = google.oauth2({ version: 'v2', auth })
    const res = await oauth2.userinfo.get()
    return res.data
}
