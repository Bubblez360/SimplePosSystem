import { useState, useEffect } from 'react'
import { useStore, cartTotal, cartLines } from '../store/useStore'
import { t } from '../i18n'

export default function StickyBar() {
  const {
    items, cart, cartAddons, setCheckoutOpen,
    addToCart, removeFromCart, clearCart, lang,
  } = useStore()
  const total = cartTotal(items, cart, cartAddons)
  const lines = cartLines(items, cart, cartAddons)
  const hasItems = lines.length > 0
  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!hasItems) setExpanded(false)
  }, [hasItems])

  if (!hasItems) return null

  return (
    <div className="fixed above-nav left-0 right-0 z-20 px-3 pb-2 max-w-3xl mx-auto">

      {/* ── Expandable cart list ── */}
      {expanded && (
        <div
          className="mb-2 bg-surface rounded-[16px] overflow-hidden flex flex-col"
          style={{ border: '1px solid var(--border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.10)', maxHeight: '46vh' }}
        >
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
            <p className="text-xs font-extrabold text-muted uppercase tracking-widest">
              {itemCount} {t('items', lang)}
            </p>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-faint underline underline-offset-2"
            >
              {lang === 'fil' ? 'Alisin lahat' : 'Clear all'}
            </button>
          </div>

          {/* Item rows — scrollable */}
          <div className="overflow-y-auto">
            {lines.map(line => (
              <div
                key={line.cartKey}
                className="flex items-center gap-3 px-4 border-b border-border last:border-0"
                style={{ minHeight: '60px', paddingTop: '10px', paddingBottom: '10px' }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--surface-2)' }}
                >
                  {line.photo
                    ? <img src={line.photo} alt={line.name} className="w-full h-full object-cover" />
                    : line.emoji || '🍱'}
                </div>

                {/* Name */}
                <p className="flex-1 text-sm font-semibold text-text truncate min-w-0 leading-tight">
                  {line.displayName}
                </p>

                {/* − qty + controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => removeFromCart(line.cartKey)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}
                  >−</button>
                  <span className="w-6 text-center font-mono text-sm font-bold text-text">{line.qty}</span>
                  <button
                    onClick={() => addToCart(line.cartKey)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{ background: 'var(--amber)', color: '#fff' }}
                  >+</button>
                </div>

                {/* Price */}
                <p
                  className="font-mono text-sm font-semibold flex-shrink-0 text-right"
                  style={{ minWidth: '52px', color: 'var(--amber-dark)' }}
                >
                  ₱{line.subtotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div
        className="bg-surface rounded-btn flex items-center justify-between px-4 h-[56px]"
        style={{ border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.10)' }}
      >
        {/* Tap to expand/collapse cart */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2.5 h-full"
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
            style={{ background: 'var(--amber)' }}
          >
            {itemCount}
          </span>
          <div className="text-left">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wide leading-none mb-0.5">
              {t('total', lang)}
            </p>
            <p className="font-mono text-xl font-semibold text-amber-dark leading-none">
              ₱{total.toFixed(2)}
            </p>
          </div>
          <span
            className="text-faint text-xs ml-0.5 transition-transform duration-200"
            style={{ display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >▲</span>
        </button>

        <button
          onClick={() => { setExpanded(false); setCheckoutOpen(true) }}
          className="px-6 h-10 rounded-btn text-sm font-bold bg-amber text-white pulse-cta"
        >
          {t('bayad', lang)} →
        </button>
      </div>
    </div>
  )
}
