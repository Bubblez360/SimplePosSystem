import { createPortal } from 'react-dom'
import { useStore } from '../store/useStore'
import Icon from './Icon'

const TONES = {
  info: { icon: 'check', cls: 'bg-text text-surface' },
  warn: { icon: 'alert', cls: 'bg-amber text-on-amber' },
  error: { icon: 'alert', cls: 'bg-error text-on-error' },
}

// Two persistent live regions, portaled to <body> so they are still announced
// while a sheet has made #root inert: errors interrupt (role="alert"),
// everything else waits its turn (role="status").
// Anything can call useStore().showToast(msg, tone).
export default function Toast() {
  const toast = useStore(s => s.toast)
  const tone = TONES[toast?.tone] || TONES.info
  const isError = toast?.tone === 'error'

  const bubble = toast && (
    <div
      key={toast.id}
      className={`${tone.cls} flex items-center gap-2.5 rounded-pill px-4 py-3 text-[14px] font-bold shadow-float animate-sheet-up`}
    >
      <Icon name={tone.icon} size={18} />
      <span className="min-w-0">{toast.msg}</span>
    </div>
  )

  return createPortal(
    <div
      className="pointer-events-none fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[80] w-[calc(100%-2rem)] max-w-sm"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div role="status" aria-live="polite">{!isError && bubble}</div>
      <div role="alert">{isError && bubble}</div>
    </div>,
    document.body,
  )
}
