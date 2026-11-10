// Shared by the donut and category charts so their currency labels agree.
export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const percentageFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})
