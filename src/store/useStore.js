import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Navigation
  screen: 'benta',
  setScreen: (screen) => set({ screen }),

  // Item catalog
  items: [],
  setItems: (items) => set({ items }),

  // Categories
  categories: [],
  setCategories: (categories) => set({ categories }),

  // Cart: { [cartKey]: qty }
  // cartKey = itemId (no variants) or "itemId_variantIdx" (with variants)
  cart: {},
  addToCart: (cartKey) => {
    const cart = { ...get().cart }
    cart[cartKey] = (cart[cartKey] || 0) + 1
    set({ cart })
  },
  removeFromCart: (cartKey) => {
    const cart = { ...get().cart }
    if (!cart[cartKey]) return
    if (cart[cartKey] <= 1) {
      delete cart[cartKey]
    } else {
      cart[cartKey] -= 1
    }
    set({ cart })
  },
  clearCart: () => set({ cart: {}, cartNotes: {}, cartAddons: {} }),

  // Per-line notes: { [cartKey]: string }
  cartNotes: {},
  setCartNote: (cartKey, note) => {
    const cartNotes = { ...get().cartNotes }
    if (note) cartNotes[cartKey] = note
    else delete cartNotes[cartKey]
    set({ cartNotes })
  },

  // Per-line selected add-ons: { [cartKey]: number[] }
  cartAddons: {},
  setCartAddons: (cartKey, addonIndices) => {
    const cartAddons = { ...get().cartAddons }
    if (addonIndices.length > 0) cartAddons[cartKey] = addonIndices
    else delete cartAddons[cartKey]
    set({ cartAddons })
  },

  // Modals
  checkoutOpen: false,
  setCheckoutOpen: (v) => set({ checkoutOpen: v }),
  gcashOpen: false,
  setGcashOpen: (v) => set({ gcashOpen: v }),
  variantPickerItem: null,
  setVariantPickerItem: (item) => set({ variantPickerItem: item }),
  receiptOpen: false,
  setReceiptOpen: (v) => set({ receiptOpen: v }),
  lastSale: null,
  setLastSale: (sale) => set({ lastSale: sale }),

  // GCash QR
  gcashQR: null,
  setGcashQR: (v) => set({ gcashQR: v }),

  // Printer
  printerConnected: false,
  setPrinterConnected: (v) => set({ printerConnected: v }),

  // Shift
  currentShift: null,
  setCurrentShift: (shift) => set({ currentShift: shift }),
  shiftModalOpen: false,
  setShiftModalOpen: (v) => set({ shiftModalOpen: v }),

  // Settings
  lang: localStorage.getItem('lang') || 'fil',
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },
  businessName: localStorage.getItem('businessName') || '',
  setBusinessName: (name) => {
    localStorage.setItem('businessName', name)
    set({ businessName: name })
  },
}))

// Parse cart key into itemId + optional variantIdx
export function parseCartKey(key) {
  const str = String(key)
  const parts = str.split('_')
  return {
    itemId: Number(parts[0]),
    variantIdx: parts.length > 1 ? Number(parts[1]) : null,
  }
}

// Get price for a cart key
function resolvePrice(item, variantIdx) {
  if (variantIdx !== null && item.variants?.length) {
    return item.variants[variantIdx]?.price ?? 0
  }
  return item.price ?? 0
}

// Total qty for an item across all its variants
export function itemTotalQty(cart, itemId) {
  return Object.entries(cart)
    .filter(([key]) => parseCartKey(key).itemId === itemId)
    .reduce((sum, [, qty]) => sum + qty, 0)
}

export function cartTotal(items, cart, cartAddons = {}) {
  return Object.entries(cart).reduce((sum, [key, qty]) => {
    const { itemId, variantIdx } = parseCartKey(key)
    const item = items.find(i => i.id === itemId)
    if (!item) return sum
    const addonTotal = (cartAddons[key] || []).reduce((s, idx) => s + (item.addons?.[idx]?.price ?? 0), 0)
    return sum + (resolvePrice(item, variantIdx) + addonTotal) * qty
  }, 0)
}

export function cartLines(items, cart, cartAddons = {}, cartNotes = {}) {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => {
      const { itemId, variantIdx } = parseCartKey(key)
      const item = items.find(i => i.id === itemId)
      if (!item) return null
      const selectedAddons = (cartAddons[key] || []).map(idx => item.addons?.[idx]).filter(Boolean)
      const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
      const price = resolvePrice(item, variantIdx) + addonTotal
      const variantName = variantIdx !== null ? item.variants?.[variantIdx]?.name ?? null : null
      return {
        ...item,
        cartKey: key,
        qty,
        price,
        subtotal: price * qty,
        variantName,
        displayName: variantName ? `${item.name} (${variantName})` : item.name,
        selectedAddons,
        note: cartNotes[key] || '',
      }
    })
    .filter(Boolean)
}
