/**
 * Indian Tax Back-Calculation Utility
 * Implements inclusive tax calculation: Base = Total / (1 + tax_rate)
 */

export interface TaxBreakdown {
    totalAmount: number
    baseAmount: number
    taxAmount: number
    taxRate: number
}

/**
 * Calculate tax breakdown from an inclusive total amount
 * @param totalAmount - The total amount including tax
 * @param taxRate - The tax rate as a decimal (e.g., 0.18 for 18%)
 * @returns Tax breakdown with base amount, tax amount, and totals
 */
export function calculateTax(totalAmount: number, taxRate: number): TaxBreakdown {
    // Base = Total / (1 + tax_rate)
    const baseAmount = totalAmount / (1 + taxRate)
    const taxAmount = totalAmount - baseAmount

    return {
        totalAmount: round(totalAmount, 2),
        baseAmount: round(baseAmount, 2),
        taxAmount: round(taxAmount, 2),
        taxRate
    }
}

/**
 * Calculate total amount from a base amount (add tax)
 * @param baseAmount - The base amount before tax
 * @param taxRate - The tax rate as a decimal
 * @returns The total amount including tax
 */
export function addTax(baseAmount: number, taxRate: number): number {
    return round(baseAmount * (1 + taxRate), 2)
}

/**
 * Round a number to specified decimal places
 */
function round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
}
