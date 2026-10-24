import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getSetting, getAllCategories } from '../db/db'
import { getCachedLicense } from '../lib/license'
import { t } from '../i18n'
import StoreTab from '../components/settings/StoreTab'
import SystemTab from '../components/settings/SystemTab'

export default function SettingScreen() {
  const lang = useStore(s => s.lang)
  const setGcashQR = useStore(s => s.setGcashQR)
  const setCategories = useStore(s => s.setCategories)
  const setIsPremium = useStore(s => s.setIsPremium)
  const setLicenseKey = useStore(s => s.setLicenseKey)
  const [tab, setTab] = useState('store')
  const isFil = lang === 'fil'

  useEffect(() => {
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
    getAllCategories().then(setCategories)
    const cached = getCachedLicense()
    if (cached) {
      setIsPremium(true)
      if (cached.key) setLicenseKey(cached.key)
    }
  }, [setGcashQR, setCategories, setIsPremium, setLicenseKey])

  const tabs = [['store', isFil ? 'Tindahan' : 'Store'], ['system', isFil ? 'Sistema' : 'System']]

  return (
    <div className="screen-enter">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 pt-3 pb-3 flex flex-col gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight">{t('setting', lang)}</h1>
        <div role="group" aria-label={t('setting', lang)} className="flex gap-1 p-1 rounded-2xl bg-surface-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 min-h-[44px] rounded-xl text-[14px] font-bold transition-colors duration-150 cursor-pointer ${
                tab === key ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pb-8">
        {tab === 'store' ? <StoreTab /> : <SystemTab />}
      </div>
    </div>
  )
}
