import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { t } from '../i18n'
import Icon from './Icon'

// Offers "Add to Home Screen" once, as a slim banner under the status bar so
// it never covers the cart bar or the nav.
export default function InstallPrompt() {
  const lang = useStore(s => s.lang)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('installDismissed') === '1')

  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice.catch(() => {})
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('installDismissed', '1')
    setDismissed(true)
  }

  if (!deferredPrompt || dismissed) return null

  return (
    <aside
      aria-label={t('installApp', lang)}
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 mx-auto max-w-md card shadow-float
        border-amber/50 bg-amber-light flex items-center gap-3 p-3 pl-4 animate-sheet-up"
    >
      <span className="w-11 h-11 rounded-xl bg-amber text-on-amber flex items-center justify-center shrink-0">
        <Icon name="download" size={22} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-extrabold leading-tight text-text">{t('installApp', lang)}</p>
        <p className="text-[12px] leading-tight text-muted mt-0.5">{t('installHint', lang)}</p>
      </div>
      <button type="button" onClick={handleInstall} className="btn-primary btn-sm shrink-0">{t('installApp', lang)}</button>
      <button type="button" onClick={handleDismiss} className="icon-btn shrink-0 -mr-1" aria-label={t('installLater', lang)}>
        <Icon name="x" size={18} />
      </button>
    </aside>
  )
}
