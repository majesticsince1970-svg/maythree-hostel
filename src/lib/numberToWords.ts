// Utility to convert INR number amounts into Indian English words
// e.g. 15500 -> "Rupees Fifteen Thousand Five Hundred Only"

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

function convertTwoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const ten = Math.floor(n / 10)
  const one = n % 10
  return (TENS[ten] + (one ? ' ' + ONES[one] : '')).trim()
}

function convertThreeDigits(n: number): string {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  let res = ''
  if (hundred) {
    res += ONES[hundred] + ' Hundred'
  }
  if (rest) {
    res += (res ? ' and ' : '') + convertTwoDigits(rest)
  }
  return res.trim()
}

export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only'

  const absAmount = Math.abs(Math.round(amount))
  let n = absAmount

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundreds = n

  const parts: string[] = []

  if (crore) {
    parts.push(convertThreeDigits(crore) + ' Crore')
  }
  if (lakh) {
    parts.push(convertTwoDigits(lakh) + ' Lakh')
  }
  if (thousand) {
    parts.push(convertTwoDigits(thousand) + ' Thousand')
  }
  if (hundreds) {
    parts.push(convertThreeDigits(hundreds))
  }

  const words = parts.join(' ').trim()
  return `Rupees ${words} Only`
}

