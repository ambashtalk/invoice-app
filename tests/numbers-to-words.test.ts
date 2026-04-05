import { describe, it, expect } from 'vitest'
import { numberToWords, formatIndianNumber } from '../src/shared/utils/numbers-to-words'

describe('numberToWords', () => {
    it('converts zero', () => {
        expect(numberToWords(0)).toBe('Rupees Zero Only')
    })

    it('converts single digit', () => {
        expect(numberToWords(5)).toBe('Rupees Five Only')
    })

    it('converts teen numbers', () => {
        expect(numberToWords(15)).toBe('Rupees Fifteen Only')
    })

    it('converts tens', () => {
        expect(numberToWords(50)).toBe('Rupees Fifty Only')
    })

    it('converts hundreds', () => {
        expect(numberToWords(100)).toBe('Rupees One Hundred Only')
    })

    it('converts thousands', () => {
        expect(numberToWords(10000)).toBe('Rupees Ten Thousand Only')
    })

    it('converts full invoice amount (18,000)', () => {
        expect(numberToWords(18000)).toBe('Rupees Eighteen Thousand Only')
    })

    it('converts lakhs', () => {
        expect(numberToWords(100000)).toBe('Rupees One Lakh Only')
    })

    it('converts complex lakh amount (1,23,456)', () => {
        const result = numberToWords(123456)
        expect(result).toContain('One Lakh')
        expect(result).toContain('Twenty')
        expect(result).toContain('Three Thousand')
    })

    it('converts crores', () => {
        expect(numberToWords(10000000)).toBe('Rupees One Crore Only')
    })

    it('rounds to nearest integer', () => {
        expect(numberToWords(100.7)).toBe('Rupees One Hundred One Only')
        expect(numberToWords(100.3)).toBe('Rupees One Hundred Only')
    })

    it('always starts with Rupees and ends with Only', () => {
        const result = numberToWords(75000)
        expect(result.startsWith('Rupees ')).toBe(true)
        expect(result.endsWith(' Only')).toBe(true)
    })
})

describe('formatIndianNumber', () => {
    it('formats numbers below 1000 unchanged', () => {
        expect(formatIndianNumber(999)).toBe('999')
    })

    it('formats thousands (1,000)', () => {
        expect(formatIndianNumber(1000)).toBe('1,000')
    })

    it('formats 10,000', () => {
        expect(formatIndianNumber(10000)).toBe('10,000')
    })

    it('formats lakhs (1,00,000)', () => {
        expect(formatIndianNumber(100000)).toBe('1,00,000')
    })

    it('formats 10 lakhs (10,00,000)', () => {
        expect(formatIndianNumber(1000000)).toBe('10,00,000')
    })

    it('formats crore (1,00,00,000)', () => {
        expect(formatIndianNumber(10000000)).toBe('1,00,00,000')
    })

    it('handles decimals', () => {
        expect(formatIndianNumber(1234.56)).toBe('1,234.56')
    })

    it('handles negative numbers', () => {
        expect(formatIndianNumber(-100000)).toBe('-1,00,000')
    })

    it('handles zero', () => {
        expect(formatIndianNumber(0)).toBe('0')
    })
})
