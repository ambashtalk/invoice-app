import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../index'

export interface PaymentProfile {
    id: string
    beneficiary_name: string
    bank_name: string
    account_type: string
    branch: string | null
    ifsc_code: string | null
    account_number: string
    is_default: number
    updated_at?: number
    last_synced_at?: number
    has_conflict?: number
    conflict_data?: string | null
}

export interface CreatePaymentProfileData {
    beneficiary_name: string
    bank_name: string
    account_type?: string
    branch?: string
    ifsc_code?: string
    account_number: string
}

export function getPaymentProfiles(): PaymentProfile[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM payment_profiles ORDER BY is_default DESC, beneficiary_name ASC').all() as PaymentProfile[]
}

export function getPaymentProfile(id: string): PaymentProfile | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM payment_profiles WHERE id = ?').get(id) as PaymentProfile | null
}

export function getDefaultPaymentProfile(): PaymentProfile | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM payment_profiles WHERE is_default = 1').get() as PaymentProfile | null
}

export function createPaymentProfile(data: CreatePaymentProfileData): PaymentProfile {
    const db = getDatabase()
    const id = uuidv4()
    const now = Date.now()

    // If this is the first profile, make it default
    const existingProfiles = getPaymentProfiles()
    const isDefault = existingProfiles.length === 0 ? 1 : 0

    db.prepare(`
    INSERT INTO payment_profiles (id, beneficiary_name, bank_name, account_type, branch, ifsc_code, account_number, is_default, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        data.beneficiary_name,
        data.bank_name,
        data.account_type || 'Savings Account',
        data.branch || null,
        data.ifsc_code || null,
        data.account_number,
        isDefault,
        now
    )

    const newProfile = getPaymentProfile(id)!
    // Fire-and-forget event-driven push
    import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('payment_profiles', newProfile, 'id')).catch(() => {})
    return newProfile
}

export function updatePaymentProfile(id: string, data: Partial<CreatePaymentProfileData>): PaymentProfile | null {
    const db = getDatabase()
    const existing = getPaymentProfile(id)
    if (!existing) return null

    const updates: string[] = ['updated_at = ?']
    const values: any[] = [Date.now()]

    if (data.beneficiary_name !== undefined) { updates.push('beneficiary_name = ?'); values.push(data.beneficiary_name) }
    if (data.bank_name !== undefined) { updates.push('bank_name = ?'); values.push(data.bank_name) }
    if (data.account_type !== undefined) { updates.push('account_type = ?'); values.push(data.account_type) }
    if (data.branch !== undefined) { updates.push('branch = ?'); values.push(data.branch) }
    if (data.ifsc_code !== undefined) { updates.push('ifsc_code = ?'); values.push(data.ifsc_code) }
    if (data.account_number !== undefined) { updates.push('account_number = ?'); values.push(data.account_number) }

    if (updates.length === 1) return existing // only updated_at, nothing real changed

    values.push(id)
    db.prepare(`UPDATE payment_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updatedProfile = getPaymentProfile(id)
    if (updatedProfile) {
        import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('payment_profiles', updatedProfile, 'id')).catch(() => {})
    }
    return updatedProfile
}

export function setDefaultPaymentProfile(id: string): PaymentProfile | null {
    const db = getDatabase()
    const profile = getPaymentProfile(id)
    if (!profile) return null

    db.prepare('UPDATE payment_profiles SET is_default = 0, updated_at = ?').run(Date.now())
    db.prepare('UPDATE payment_profiles SET is_default = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)

    return getPaymentProfile(id)
}
