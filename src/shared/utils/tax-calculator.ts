/**
 * Indian Tax Back-Calculation Utility
 * Implements inclusive tax calculation: Base = Total / (1 + tax_rate)
 */

export interface ItemizedTax {
    description: string
    totalAmount: number
    baseAmount: number
    taxAmount: number
    taxRate: number
    showSgstCgst?: boolean
    sgstAmount?: number
    cgstAmount?: number
}

export interface TaxBreakdown {
    totalAmount: number
    baseAmount: number
    taxAmount: number
    items: ItemizedTax[]
    aggregateByRate: Record<number, { base: number; tax: number; sgst?: number; cgst?: number }>
}

/**
 * Calculate tax breakdown from an inclusive total amount for a single rate
 */
export function calculateTax(totalAmount: number, taxRate: number): { baseAmount: number; taxAmount: number } {
    const baseAmount = totalAmount / (1 + taxRate)
    const taxAmount = totalAmount - baseAmount
    return {
        baseAmount: round(baseAmount, 2),
        taxAmount: round(taxAmount, 2)
    }
}

/**
 * Calculate full breakdown for an invoice with item-level GST
 */
export function calculateInvoiceTax(items: any[]): TaxBreakdown {
    const safeItems = items || []
    let totalAmount = 0
    let baseAmount = 0
    let taxAmount = 0
    const itemized: ItemizedTax[] = []
    const aggregate: Record<number, { base: number; tax: number; sgst?: number; cgst?: number }> = {}

    safeItems.forEach(item => {
        if (!item) return
        const rate = item.tax_rate || 0
        const amount = Number(item.amount) || 0
        const { baseAmount: base, taxAmount: tax } = calculateTax(amount, rate)
        
        const itemTax: ItemizedTax = {
            description: item.description,
            totalAmount: item.amount,
            baseAmount: base,
            taxAmount: tax,
            taxRate: rate,
            showSgstCgst: !!item.show_sgst_cgst
        }

        if (itemTax.showSgstCgst) {
            itemTax.sgstAmount = round(tax / 2, 2)
            itemTax.cgstAmount = round(tax / 2, 2)
        }

        itemized.push(itemTax)
        totalAmount += item.amount
        baseAmount += base
        taxAmount += tax

        if (!aggregate[rate]) {
            aggregate[rate] = { base: 0, tax: 0 }
        }
        aggregate[rate].base = round(aggregate[rate].base + base, 2)
        aggregate[rate].tax = round(aggregate[rate].tax + tax, 2)
        
        if (item.show_sgst_cgst) {
            aggregate[rate].sgst = round((aggregate[rate].sgst || 0) + (tax / 2), 2)
            aggregate[rate].cgst = round((aggregate[rate].cgst || 0) + (tax / 2), 2)
        }
    })

    return {
        totalAmount: round(totalAmount, 2),
        baseAmount: round(baseAmount, 2),
        taxAmount: round(taxAmount, 2),
        items: itemized,
        aggregateByRate: aggregate
    }
}

/**
 * Round a number to specified decimal places
 */
function round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
}
