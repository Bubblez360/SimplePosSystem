import { useMemo } from 'react'
import { useStore, cartLines, cartTotal } from '../../store/useStore'

// Derived view of the cart: priced lines, subtotal, and total unit count.
export function useCart() {
  const items = useStore(s => s.items)
  const cart = useStore(s => s.cart)
  const cartAddons = useStore(s => s.cartAddons)
  const cartNotes = useStore(s => s.cartNotes)

  return useMemo(() => {
    const lines = cartLines(items, cart, cartAddons, cartNotes)
    return {
      lines,
      total: cartTotal(items, cart, cartAddons),
      count: lines.reduce((sum, l) => sum + l.qty, 0),
    }
  }, [items, cart, cartAddons, cartNotes])
}

// ₱ amount in DM Mono contexts. compact drops ".00" for whole pesos (tiles).
export function peso(n, { compact = false } = {}) {
  const v = Number(n || 0)
  return compact && Number.isInteger(v) ? `₱${v}` : `₱${v.toFixed(2)}`
}
