import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Navigation
  screen: 'benta',
  setScreen: (screen) => set({ screen }),

  // Item catalog (loaded from IndexedDB)
  items: [],
  setItems: (items) => set({ items }),

  // Cart: { [itemId]: quantity }
  cart: {},
  addToCart: (itemId) => {
    const cart = { ...get().cart }
    cart[itemId] = (cart[itemId] || 0) + 1
    set({ cart })
  },
  removeFromCart: (itemId) => {
    const cart = { ...get().cart }
    if (!cart[itemId]) return
    if (cart[itemId] <= 1) {
      delete cart[itemId]
    } else {
      cart[itemId] -= 1
    }
    set({ cart })
  },
  clearCart: () => set({ cart: {} }),

  // Checkout modal
  checkoutOpen: false,
  setCheckoutOpen: (v) => set({ checkoutOpen: v }),

  // GCash modal
  gcashOpen: false,
  setGcashOpen: (v) => set({ gcashOpen: v }),

  // GCash QR image (base64, loaded from IndexedDB)
  gcashQR: null,
  setGcashQR: (v) => set({ gcashQR: v }),

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

// Derived: cart total (pesos)
export function cartTotal(items, cart) {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = items.find(i => i.id === Number(id))
    return sum + (item ? item.price * qty : 0)
  }, 0)
}

// Derived: cart line items for display
export function cartLines(items, cart) {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = items.find(i => i.id === Number(id))
      return item ? { ...item, qty, subtotal: item.price * qty } : null
    })
    .filter(Boolean)
}
