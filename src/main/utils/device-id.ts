import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

let cachedDeviceId: string | null = null

export function getDeviceId(): string {
    if (cachedDeviceId) return cachedDeviceId

    const idPath = join(app.getPath('userData'), 'device-id.json')
    try {
        if (existsSync(idPath)) {
            const data = JSON.parse(readFileSync(idPath, 'utf-8'))
            if (data.deviceId) {
                cachedDeviceId = data.deviceId
                return cachedDeviceId!
            }
        }
    } catch (err) {
        console.error('Failed to read deviceId', err)
    }

    const newId = uuidv4()
    try {
        writeFileSync(idPath, JSON.stringify({ deviceId: newId }, null, 2), 'utf-8')
        cachedDeviceId = newId
    } catch (err) {
        console.error('Failed to save deviceId', err)
    }
    return newId
}
