// Pure money/sale helpers shared by the cash and GCash checkout paths.
// Kept free of store/DB imports so they are trivially unit-testable.

export function roundMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// discount: { type: 'flat' | 'percent', value: number | numeric string }.
// Returns the peso amount to subtract: never negative, never more than the
// subtotal, always rounded to the centavo. Garbage input yields 0.
export function computeDiscount(subtotal, discount) {
  const { type = 'flat', value = 0 } = discount || {}
  const v = Number(value)
  if (!Number.isFinite(v) || v <= 0 || !(subtotal > 0)) return 0
  const raw = type === 'percent' ? (subtotal * Math.min(v, 100)) / 100 : v
  return roundMoney(Math.min(subtotal, raw))
}

// Shape persisted by db.recordSale(). `lines` are cartLines() output.
export function buildSale({ lines, method, discount }) {
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.subtotal, 0))
  const amount = computeDiscount(subtotal, discount)
  return {
    total: roundMoney(subtotal - amount),
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
    method,
    discount: amount > 0 ? { type: discount.type, amount } : null,
    lines: lines.map(l => ({
      itemId: l.id,
      name: l.displayName,
      qty: l.qty,
      subtotal: l.subtotal,
      addons: l.selectedAddons.map(a => a.name),
      note: l.note || '',
    })),
  }
}

// Keeps only a plain decimal number while the user types: digits, one dot,
// at most `maxDecimals` places. Replaces <input type="number"> (which accepts
// "e", "-" and changes value on scroll) for every money field.
export function sanitizeAmount(raw, maxDecimals = 2) {
  const cleaned = String(raw ?? '').replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('').slice(0, maxDecimals)}`
}

const BILLS = [20, 50, 100, 200, 500, 1000]

// Quick-cash chips: the exact amount first (most street-food sales are paid
// with the right money), then bills above it. Past P1000 there is no bill
// above, so offer the next P500 / P1000 round-ups instead.
export function cashSuggestions(payable) {
  const exact = roundMoney(payable)
  if (!(exact > 0)) return []
  const above = BILLS.filter(v => v > exact)
  if (above.length > 0) return [exact, ...above]
  const roundUp = step => Math.floor(exact / step) * step + step
  return [...new Set([exact, roundUp(500), roundUp(1000)])]
}
