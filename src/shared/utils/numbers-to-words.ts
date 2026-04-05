/**
 * Convert number to Indian Rupees in Words
 * Handles the Indian numbering system (lakhs, crores)
 */

const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
]

const TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

function convertTwoDigits(n: number): string {
    if (n < 20) {
        return ONES[n]
    }
    const ones = n % 10
    const tens = Math.floor(n / 10)
    return TENS[tens] + (ones ? ' ' + ONES[ones] : '')
}

function convertThreeDigits(n: number): string {
    const hundreds = Math.floor(n / 100)
    const remainder = n % 100

    let result = ''
    if (hundreds) {
        result = ONES[hundreds] + ' Hundred'
    }
    if (remainder) {
        result += (result ? ' ' : '') + convertTwoDigits(remainder)
    }
    return result
}

/**
 * Convert a number to Indian Rupees in words
 * @param amount - The amount to convert
 * @returns The amount in words (e.g., "Rupees Ten Thousand Only")
 */
export function numberToWords(amount: number): string {
    if (amount === 0) {
        return 'Rupees Zero Only'
    }

    // Round to nearest integer for words
    amount = Math.round(amount)

    if (amount < 0) {
        return 'Minus ' + numberToWords(Math.abs(amount))
    }

    // Handle paise (decimal part)
    const rupees = Math.floor(amount)

    if (rupees === 0) {
        return 'Rupees Zero Only'
    }

    let words = ''

    // Crores (1,00,00,000)
    const crores = Math.floor(rupees / 10000000)
    if (crores) {
        words += convertThreeDigits(crores) + ' Crore '
    }

    // Lakhs (1,00,000)
    const lakhs = Math.floor((rupees % 10000000) / 100000)
    if (lakhs) {
        words += convertTwoDigits(lakhs) + ' Lakh '
    }

    // Thousands (1,000)
    const thousands = Math.floor((rupees % 100000) / 1000)
    if (thousands) {
        words += convertTwoDigits(thousands) + ' Thousand '
    }

    // Hundreds and below
    const remainder = rupees % 1000
    if (remainder) {
        words += convertThreeDigits(remainder)
    }

    return 'Rupees ' + words.trim() + ' Only'
}

/**
 * Format a number in Indian numbering system (with commas)
 * @param amount - The amount to format
 * @returns Formatted string (e.g., "1,23,45,678")
 */
export function formatIndianNumber(amount: number): string {
    const isNegative = amount < 0
    const absAmount = Math.abs(amount)

    const [integerPart, decimalPart] = absAmount.toString().split('.')

    // Apply Indian comma formatting (after first 3 digits, every 2 digits)
    let result = ''
    const len = integerPart.length

    for (let i = 0; i < len; i++) {
        if (i > 0 && i < len) {
            const posFromEnd = len - i
            if (posFromEnd === 3 || (posFromEnd > 3 && (posFromEnd - 3) % 2 === 0)) {
                result += ','
            }
        }
        result += integerPart[i]
    }

    if (decimalPart) {
        result += '.' + decimalPart
    }

    return (isNegative ? '-' : '') + result
}
