import { beforeEach, describe, it, expect } from 'vitest'
import { useStore, pruneCart, cartLines, cartTotal } from './useStore'

const tea = { id: 1, name: 'Tea', price: 40, trackStock: true, stock: 3, variants: [], addons: [] }
const latte = {
  id: 2, name: 'Latte', price: null, trackStock: false, stock: 0,
  variants: [{ name: 'S', price: 60 }, { name: 'L', price: 80 }],
  addons: [{ name: 'Shot', price: 20 }],
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ items: [tea, latte], cart: {}, cartNotes: {}, cartAddons: {}, discount: { type: 'flat', value: '' }, toast: null })
})

describe('addToCart stock cap', () => {
  it('stops at tracked stock and raises a toast', () => {
    const { addToCart } = useStore.getState()
    expect(addToCart('1')).toBe(true)
    expect(addToCart('1')).toBe(true)
    expect(addToCart('1')).toBe(true)
    expect(addToCart('1')).toBe(false)
    expect(useStore.getState().cart['1']).toBe(3)
    expect(useStore.getState().toast?.msg).toContain('3')
  })

  it('does not cap untracked items', () => {
    const { addToCart } = useStore.getState()
    for (let i = 0; i < 20; i++) addToCart('2_0')
    expect(useStore.getState().cart['2_0']).toBe(20)
  })
})

describe('clearCart', () => {
  it('also resets notes, add-ons and the discount', () => {
    useStore.setState({ cart: { '1': 1 }, cartNotes: { '1': 'x' }, cartAddons: { '2_0': [0] }, discount: { type: 'percent', value: '10' } })
    useStore.getState().clearCart()
    const s = useStore.getState()
    expect(s.cart).toEqual({})
    expect(s.cartNotes).toEqual({})
    expect(s.cartAddons).toEqual({})
    expect(s.discount).toEqual({ type: 'flat', value: '' })
  })

  it('returns the payment method to cash', () => {
    useStore.setState({ payMethod: 'gcash' })
    useStore.getState().clearCart()
    expect(useStore.getState().payMethod).toBe('cash')
  })
})

describe('pruneCart', () => {
  it('drops deleted items, unknown variants and bad add-ons', () => {
    const out = pruneCart([latte], {
      cart: { '99': 2, '2_0': 1, '2_7': 1, '2': 1 },
      cartNotes: { '99': 'gone', '2_0': 'keep' },
      cartAddons: { '2_0': [0, 5], '99': [0] },
    })
    expect(out.cart).toEqual({ '2_0': 1 })
    expect(out.cartNotes).toEqual({ '2_0': 'keep' })
    expect(out.cartAddons).toEqual({ '2_0': [0] })
  })

  it('clamps quantities to remaining stock', () => {
    const out = pruneCart([{ ...tea, stock: 2 }], { cart: { '1': 5 }, cartNotes: {}, cartAddons: {} })
    expect(out.cart).toEqual({ '1': 2 })
    expect(pruneCart([{ ...tea, stock: 0 }], { cart: { '1': 5 }, cartNotes: {}, cartAddons: {} }).cart).toEqual({})
  })

  it('is applied when the catalog changes', () => {
    useStore.setState({ cart: { '1': 3, '2_1': 1 } })
    useStore.getState().setItems([latte])
    expect(useStore.getState().cart).toEqual({ '2_1': 1 })
  })
})

describe('totals', () => {
  it('prices variants and add-ons', () => {
    const cart = { '2_1': 2 }
    const addons = { '2_1': [0] }
    expect(cartTotal([tea, latte], cart, addons)).toBe(200)
    expect(cartLines([tea, latte], cart, addons)[0].displayName).toBe('Latte (L)')
  })
})
