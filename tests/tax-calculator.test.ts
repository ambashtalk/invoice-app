import { describe, it, expect } from 'vitest'
import { calculateTax } from '../src/shared/utils/tax-calculator'

describe('calculateTax', () => {
    it('computes base and tax with 18% GST (inclusive)', () => {
        const result = calculateTax(11800, 0.18)
        expect(result.baseAmount).toBeCloseTo(10000, 1)
        expect(result.taxAmount).toBeCloseTo(1800, 1)
        expect(result.totalAmount).toBe(11800)
    })

    it('computes base and tax with 5% GST (inclusive)', () => {
        const result = calculateTax(10500, 0.05)
        expect(result.baseAmount).toBeCloseTo(10000, 1)
        expect(result.taxAmount).toBeCloseTo(500, 1)
    })

    it('computes base and tax with 12% GST', () => {
        const result = calculateTax(11200, 0.12)
        expect(result.baseAmount).toBeCloseTo(10000, 1)
        expect(result.taxAmount).toBeCloseTo(1200, 1)
    })

    it('computes base and tax with 28% GST', () => {
        const result = calculateTax(12800, 0.28)
        expect(result.baseAmount).toBeCloseTo(10000, 1)
        expect(result.taxAmount).toBeCloseTo(2800, 1)
    })

    it('returns zero tax when tax rate is 0', () => {
        const result = calculateTax(5000, 0)
        expect(result.baseAmount).toBe(5000)
        expect(result.taxAmount).toBe(0)
    })

    it('handles zero total correctly', () => {
        const result = calculateTax(0, 0.18)
        expect(result.baseAmount).toBe(0)
        expect(result.taxAmount).toBe(0)
    })

    it('base + tax = total (identity check)', () => {
        const total = 75000
        const result = calculateTax(total, 0.18)
        expect(result.baseAmount + result.taxAmount).toBeCloseTo(total, 5)
    })

    it('handles large amounts correctly', () => {
        const result = calculateTax(11800000, 0.18) // 1 crore + 18%
        expect(result.baseAmount).toBeCloseTo(10000000, 0)
    })
})
