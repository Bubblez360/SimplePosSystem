import { describe, it, expect } from 'vitest'
import { roundMoney, computeDiscount, buildSale, sanitizeAmount, cashSuggestions } from './checkout'

const line = (over = {}) => ({
  id: 1, displayName: 'Milk Tea (Large)', qty: 2, subtotal: 180,
  selectedAddons: [{ name: 'Extra Pearls', price: 10 }], note: 'less ice', ...over,
})

describe('roundMoney', () => {
  it('rounds to centavos without float drift', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(4.955)).toBe(4.96)
  })
})

describe('computeDiscount', () => {
  it('ignores negative, zero, NaN and empty input', () => {
    expect(computeDiscount(100, { type: 'flat', value: -50 })).toBe(0)
    expect(computeDiscount(100, { type: 'flat', value: 0 })).toBe(0)
    expect(computeDiscount(100, { type: 'flat', value: 'abc' })).toBe(0)
    expect(computeDiscount(100, { type: 'flat', value: '' })).toBe(0)
    expect(computeDiscount(100, undefined)).toBe(0)
  })

  it('never exceeds the subtotal', () => {
    expect(computeDiscount(100, { type: 'flat', value: 500 })).toBe(100)
    expect(computeDiscount(100, { type: 'percent', value: 250 })).toBe(100)
  })

  it('computes percent discounts to the centavo', () => {
    expect(computeDiscount(33, { type: 'percent', value: 15 })).toBe(4.95)
    expect(computeDiscount(100, { type: 'percent', value: 10 })).toBe(10)
  })

  it('accepts numeric strings from inputs', () => {
    expect(computeDiscount(100, { type: 'flat', value: '12.5' })).toBe(12.5)
  })
})

describe('buildSale', () => {
  it('applies the discount to the stored total (GCash and cash alike)', () => {
    const sale = buildSale({ lines: [line()], method: 'gcash', discount: { type: 'percent', value: 10 } })
    expect(sale.method).toBe('gcash')
    expect(sale.total).toBe(162)
    expect(sale.discount).toEqual({ type: 'percent', amount: 18 })
    expect(sale.itemCount).toBe(2)
  })

  it('stores null discount when none applies', () => {
    const sale = buildSale({ lines: [line()], method: 'cash', discount: { type: 'flat', value: '' } })
    expect(sale.discount).toBeNull()
    expect(sale.total).toBe(180)
  })

  it('maps lines to the persisted sale-line shape', () => {
    const [l] = buildSale({ lines: [line()], method: 'cash' }).lines
    expect(l).toEqual({
      itemId: 1, name: 'Milk Tea (Large)', qty: 2, subtotal: 180,
      addons: ['Extra Pearls'], note: 'less ice',
    })
  })
})

describe('sanitizeAmount', () => {
  it('strips everything except digits and one decimal point', () => {
    expect(sanitizeAmount('-12e3')).toBe('123')
    expect(sanitizeAmount('1,250.50')).toBe('1250.50')
    expect(sanitizeAmount('1.2.3')).toBe('1.23')
    expect(sanitizeAmount('abc')).toBe('')
    expect(sanitizeAmount(null)).toBe('')
  })

  it('limits decimal places', () => {
    expect(sanitizeAmount('9.999')).toBe('9.99')
    expect(sanitizeAmount('.5')).toBe('.5')
  })
})

describe('cashSuggestions', () => {
  it('leads with the exact amount, then bills above it', () => {
    expect(cashSuggestions(130)).toEqual([130, 200, 500, 1000])
    expect(cashSuggestions(100)).toEqual([100, 200, 500, 1000])
    expect(cashSuggestions(69.45)).toEqual([69.45, 100, 200, 500, 1000])
  })

  it('still offers useful round-ups for big orders', () => {
    expect(cashSuggestions(1200)).toEqual([1200, 1500, 2000])
    expect(cashSuggestions(1000)).toEqual([1000, 1500, 2000])
  })

  it('offers nothing for a free order', () => {
    expect(cashSuggestions(0)).toEqual([])
  })
})
