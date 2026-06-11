import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { t } from '../i18n'

export default function InstallPrompt() {
  const { lang } = useStore()
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

  function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null)
    })
  }

  function handleDismiss() {
    localStorage.setItem('installDismissed', '1')
    setDismissed(true)
  }

  if (!deferredPrompt || dismissed) return null

  return (
    <div className="fixed left-3 right-3 z-40 rounded-[16px] border border-amber bg-amber-light px-4 py-3 flex items-center gap-3 max-w-md mx-auto"
      style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.25)', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
      <span className="text-2xl flex-shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-amber-dark leading-tight">{t('installApp', lang)}</p>
        <p className="text-xs text-amber-dark opacity-70 leading-tight mt-0.5">{t('installHint', lang)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="h-9 px-4 rounded-btn bg-amber text-white text-xs font-bold"
        >
          {t('installApp', lang)}
        </button>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 flex items-center justify-center rounded-full text-amber-dark opacity-60 text-lg leading-none"
        >×</button>
      </div>
    </div>
  )
}
