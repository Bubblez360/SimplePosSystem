import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getSetting, setSetting } from '../db/db'
import { t } from '../i18n'

export default function SettingScreen() {
  const { lang, setLang, businessName, setBusinessName, gcashQR, setGcashQR } = useStore()
  const [nameInput, setNameInput] = useState(businessName)

  useEffect(() => {
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
  }, [])

  function handleGCashUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const data = ev.target.result
      setGcashQR(data)
      await setSetting('gcashQR', data)
    }
    reader.readAsDataURL(file)
  }

  function handleNameSave() {
    setBusinessName(nameInput.trim())
  }

  return (
    <div className="screen-enter">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10">
        <p className="text-lg font-extrabold text-text">{t('setting', lang)}</p>
      </header>

      <div className="p-4 flex flex-col gap-6">
        {/* Business name */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('businessName', lang)}</p>
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder={t('enterName', lang)}
              className="flex-1 h-12 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
            />
            <button
              onClick={handleNameSave}
              className="h-12 px-4 rounded-btn bg-amber text-white font-bold text-sm"
            >
              {t('save', lang)}
            </button>
          </div>
        </section>

        {/* GCash QR */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('gcashQR', lang)}</p>
          {gcashQR ? (
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-card border border-border overflow-hidden bg-surface-2">
                <img src={gcashQR} alt="GCash QR" className="w-full h-full object-contain" />
              </div>
              <label className="text-sm font-semibold text-amber underline cursor-pointer">
                {t('changeQR', lang)}
                <input type="file" accept="image/*" className="hidden" onChange={handleGCashUpload} />
              </label>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 rounded-card border-2 border-dashed border-border bg-surface-2 cursor-pointer gap-2">
              <span className="text-3xl">📷</span>
              <p className="text-sm font-semibold text-muted">{t('uploadQR', lang)}</p>
              <p className="text-xs text-faint">{t('uploadQRHint', lang)}</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleGCashUpload} />
            </label>
          )}
        </section>

        {/* Language */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('language', lang)}</p>
          <div className="flex gap-2">
            {[['fil', 'Filipino 🇵🇭'], ['eng', 'English']].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`flex-1 h-12 rounded-btn border font-bold text-sm transition-all ${
                  lang === code
                    ? 'border-amber bg-amber-light text-amber-dark'
                    : 'border-border bg-surface text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
