import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

// While any sheet is open the app behind it is inert: no focus, no clicks and
// hidden from screen readers. Counted so stacked sheets restore correctly.
let openSheets = 0
function lockBackground(lock) {
  const root = document.getElementById('root')
  if (!root) return
  openSheets += lock ? 1 : -1
  if (openSheets > 0) root.setAttribute('inert', '')
  else root.removeAttribute('inert')
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Accessible modal used by every sheet/dialog in the app: role="dialog",
// Escape to close, focus moved in and trapped, focus restored on close.
// variant="sheet": bottom sheet on phones, centered dialog from md up.
// variant="full": takes over the whole screen (receipt, GCash QR).
export default function Sheet({
  title, subtitle, onClose, children, footer, variant = 'sheet',
  tone = 'default', hideHeader = false, closeLabel = 'Close', icon,
}) {
  const ref = useRef(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    lockBackground(true)
    const root = ref.current
    const first = root?.querySelector('[data-autofocus]') || root?.querySelector(FOCUSABLE)
    ;(first || root)?.focus({ preventScroll: true })

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !root) return
      const nodes = [...root.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null)
      if (!nodes.length) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus() }
      else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      lockBackground(false)
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [])

  const isFull = variant === 'full'
  const panel = isFull
    ? 'w-full h-full'
    : 'w-full max-w-lg max-h-[92dvh] rounded-t-[28px] md:rounded-[28px] shadow-sheet animate-sheet-up'
  const surface = tone === 'dark' ? 'bg-[#141210] text-white' : 'bg-bg text-text'

  return createPortal(
    <div
      className={`scrim flex ${isFull ? '' : 'items-end md:items-center'} justify-center`}
      onMouseDown={e => { if (!isFull && e.target === e.currentTarget) onClose?.() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : titleId}
        aria-label={hideHeader ? title : undefined}
        tabIndex={-1}
        className={`${panel} ${surface} flex flex-col overflow-hidden focus:outline-none`}
      >
        {!hideHeader && (
          <>
            {!isFull && (
              <div className="flex justify-center pt-2.5 pb-1 shrink-0 md:hidden" aria-hidden="true">
                <div className="w-10 h-1.5 rounded-full bg-border" />
              </div>
            )}
            <div className="px-5 pt-2 pb-3 md:pt-5 flex items-center gap-3 shrink-0">
              {icon}
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className="text-xl font-extrabold tracking-tight leading-tight truncate">{title}</h2>
                {subtitle && <p className="text-[13px] font-medium text-muted mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} className="icon-btn bg-surface-2 -mr-1" aria-label={closeLabel}>
                <Icon name="x" size={20} />
              </button>
            </div>
          </>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 px-5 pt-3 sheet-pb border-t border-border bg-bg">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
