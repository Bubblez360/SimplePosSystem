import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { validateLicense, clearLicense, retrieveLicenseByEmail, getCachedLicense, createCheckout } from '../../lib/license'
import { pushToCloud, pullFromCloud, noteSyncResult } from '../../lib/sync'
import { t } from '../../i18n'
import Icon from '../Icon'
import SyncStatus from '../SyncStatus'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FEATURES = [
  ['cloud', 'Cloud backup'],
  ['phone', 'Multi-device sync'],
  ['chart', 'Full sales history'],
  ['download', 'CSV export'],
]

export default function PremiumCard() {
  const lang = useStore(s => s.lang)
  const isPremium = useStore(s => s.isPremium)
  const setIsPremium = useStore(s => s.setIsPremium)
  const licenseKey = useStore(s => s.licenseKey)
  const setLicenseKey = useStore(s => s.setLicenseKey)
  const showToast = useStore(s => s.showToast)
  const isFil = lang === 'fil'
  const license = isPremium ? getCachedLicense() : null

  const [licenseInput, setLicenseInput] = useState(licenseKey)
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(null) // 'license' | 'email' | 'push' | 'pull'
  const [trialUsed, setTrialUsed] = useState(() => localStorage.getItem('tindapos_trial_used') === '1')
  const [showPaid, setShowPaid] = useState(false)
  const [buyEmail, setBuyEmail] = useState(() => localStorage.getItem('buyEmail') || '')
  const [buyEmailTouched, setBuyEmailTouched] = useState(false)
  const buyEmailValid = EMAIL_PATTERN.test(buyEmail.trim())

  // Opens PayMongo's hosted checkout with the buyer's email attached, so the
  // payment can issue (and email) their license automatically.
  async function buy(plan) {
    setBuyEmailTouched(true)
    if (!buyEmailValid) { document.getElementById('buy-email')?.focus(); return }
    localStorage.setItem('buyEmail', buyEmail.trim())
    setLoading(`buy-${plan}`)
    const result = await createCheckout(buyEmail.trim(), plan)
    if (result.url) { window.location.assign(result.url); return }
    setLoading(null)
    showToast(result.network ? t('serverUnreachable', lang) : result.error || t('saleError', lang), 'error')
  }

  async function activate(e) {
    e.preventDefault()
    const key = licenseInput.trim()
    if (!key) return
    setLoading('license')
    const result = await validateLicense(key)
    setLoading(null)
    if (!result.valid) {
      showToast(result.network ? t('serverUnreachable', lang) : result.error || (isFil ? 'Invalid na license key' : 'Invalid license key'), 'error')
      return
    }
    setLicenseKey(key)
    setIsPremium(true)
    if (result.plan === 'trial') {
      localStorage.setItem('tindapos_trial_used', '1')
      setTrialUsed(true)
    }
    showToast(isFil ? 'Premium na-activate!' : 'Premium activated!')
  }

  async function retrieveKey(e) {
    e.preventDefault()
    if (!emailInput.trim()) return
    setLoading('email')
    const result = await retrieveLicenseByEmail(emailInput.trim())
    setLoading(null)
    // The server only emails the key (it never reveals whether the address has a
    // license), so the answer is the same either way: check your inbox.
    if (result.sent) showToast(t('keySentToEmail', lang))
    else showToast(result.network ? t('serverUnreachable', lang) : result.error || t('saleError', lang), 'error')
  }

  function removeLicense() {
    if (!window.confirm(t('removePremiumConfirm', lang))) return
    clearLicense()
    setLicenseKey('')
    setLicenseInput('')
    setIsPremium(false)
    setTrialUsed(false)
    showToast(isFil ? 'Premium na-remove' : 'Premium removed')
  }

  async function push() {
    if (!licenseKey) return
    setLoading('push')
    try {
      await pushToCloud(licenseKey)
      showToast(isFil ? 'Na-sync sa cloud!' : 'Synced to cloud!')
    } catch (err) {
      noteSyncResult(err?.message || 'Sync failed')
      showToast(isFil ? 'Hindi na-sync. Subukan ulit.' : 'Sync failed. Try again.', 'error')
    }
    setLoading(null)
  }

  async function pull() {
    if (!licenseKey) return
    const msg = isFil
      ? 'Papalitan ang menu/items mula sa cloud. Hindi mawawala ang mga benta — isasama lang ang mga wala pa. Ituloy?'
      : 'Your menu/items will be replaced with the cloud copy. Sales are never lost — missing ones are merged in. Continue?'
    if (!window.confirm(msg)) return
    setLoading('pull')
    try {
      const { restored } = await pullFromCloud(licenseKey)
      showToast(isFil ? `Na-restore ang ${restored} records mula cloud!` : `Restored ${restored} records from cloud!`)
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      noteSyncResult(err?.message || 'Restore failed')
      showToast(isFil ? 'Hindi ma-restore. Subukan ulit.' : 'Restore failed. Try again.', 'error')
      setLoading(null)
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="premium-title">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border bg-amber-bg">
        <h2 id="premium-title" className="flex items-center gap-2.5 text-[16px] font-extrabold">
          <span className="w-9 h-9 rounded-xl bg-amber text-on-amber flex items-center justify-center"><Icon name="star" size={18} /></span>
          Premium
        </h2>
        {isPremium && <span className="pill-badge bg-green text-on-green">Active</span>}
      </div>

      {isPremium ? (
        <div className="p-4 flex flex-col gap-2.5">
          <div className="rounded-xl bg-amber-light border border-amber/40 px-4 py-3">
            <p className="flex items-center gap-2 text-[14px] font-extrabold text-amber-ink"><Icon name="cloud" size={18} />Cloud Sync</p>
            <SyncStatus lang={lang} />
            {license?.expires_at && (
              <p className="mt-1.5 text-[13px] font-semibold text-muted">
                {t('validUntil', lang).replace('{date}', new Date(license.expires_at).toLocaleDateString(isFil ? 'fil-PH' : 'en-PH', { year: 'numeric', month: 'long', day: 'numeric' }))}
              </p>
            )}
          </div>
          <button type="button" onClick={push} disabled={!!loading} className="btn-primary w-full">
            <Icon name="cloud" size={18} />
            {loading === 'push' ? '…' : isFil ? 'I-sync sa Cloud' : 'Sync to Cloud'}
          </button>
          <button type="button" onClick={pull} disabled={!!loading} className="btn-secondary w-full">
            <Icon name="cloud-download" size={18} />
            {loading === 'pull' ? '…' : isFil ? 'I-restore mula Cloud' : 'Restore from Cloud'}
          </button>
          <button type="button" onClick={removeLicense} className="btn-ghost btn-sm self-center text-error hover:bg-error-light mt-1">
            {isFil ? 'Alisin ang Premium' : 'Remove Premium'}
          </button>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
            {FEATURES.map(([icon, label]) => (
              <li key={label} className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                <Icon name={icon} size={16} className="text-amber-ink" />{label}
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="buy-email" className="field-label">{t('buyEmailLabel', lang)}</label>
            <input
              id="buy-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={buyEmail}
              onChange={e => setBuyEmail(e.target.value)}
              placeholder="name@email.com"
              aria-invalid={buyEmailTouched && !buyEmailValid}
              aria-describedby="buy-email-hint"
              className="field"
            />
            <p id="buy-email-hint" className={`mt-1.5 text-[13px] ${buyEmailTouched && !buyEmailValid ? 'font-bold text-error' : 'text-muted'}`}>
              {buyEmailTouched && !buyEmailValid ? t('enterValidEmail', lang) : t('buyEmailHint', lang)}
            </p>
          </div>

          {!trialUsed && (
            <button type="button" onClick={() => buy('trial')} disabled={!!loading} className="btn-secondary w-full !border-amber !bg-amber-light !text-amber-ink">
              <Icon name="sparkle" size={18} />
              {loading === 'buy-trial' ? t('checkoutStarting', lang) : isFil ? 'Subukan — ₱49 / 7 araw' : 'Try it — ₱49 / 7 days'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => buy('monthly')} disabled={!!loading} className="btn-secondary !flex-col !gap-1 min-h-[68px]">
              <span className="font-mono text-[20px] font-medium">₱99</span>
              <span className="text-[12px] font-bold text-muted">{loading === 'buy-monthly' ? t('checkoutStarting', lang) : isFil ? 'bawat buwan' : 'per month'}</span>
            </button>
            <button type="button" onClick={() => buy('annual')} disabled={!!loading} className="btn-primary !flex-col !gap-1 min-h-[68px] relative">
              <span className="font-mono text-[20px] font-medium">₱499</span>
              <span className="text-[12px] font-bold">{loading === 'buy-annual' ? t('checkoutStarting', lang) : isFil ? 'bawat taon' : 'per year'}</span>
              <span className="absolute -top-2 right-2 pill-badge bg-text text-surface">{isFil ? 'Mas mura' : 'Best value'}</span>
            </button>
          </div>
          <p className="text-[12px] text-muted text-center">{isFil ? 'Makatipid ng ₱689 sa taunan vs buwanan' : 'Save ₱689/yr with annual vs monthly'}</p>

          <button
            type="button"
            aria-expanded={showPaid}
            onClick={() => setShowPaid(v => !v)}
            className="flex items-center justify-between w-full min-h-[44px] text-[13px] font-bold text-muted cursor-pointer"
          >
            {isFil ? 'May key na?' : 'Already paid?'}
            <Icon name="chevron-down" size={18} className={`transition-transform duration-200 ${showPaid ? 'rotate-180' : ''}`} />
          </button>

          {showPaid && (
            <div className="flex flex-col gap-3 pt-3 border-t border-border">
              <form onSubmit={retrieveKey}>
                <label htmlFor="paid-email" className="field-label">{t('emailPaid', lang)}</label>
                <div className="flex flex-col gap-2">
                  <input
                    id="paid-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="name@email.com"
                    className="field flex-1 min-w-0"
                  />
                  <button type="submit" disabled={loading === 'email' || !emailInput.trim()} className="btn-secondary w-full">
                    {loading === 'email' ? '…' : t('emailMeKey', lang)}
                  </button>
                </div>
              </form>
              <form onSubmit={activate} className="flex flex-col gap-2">
                <div>
                  <label htmlFor="license-key" className="field-label">{t('licenseKeyLabel', lang)}</label>
                  <input
                    id="license-key"
                    value={licenseInput}
                    onChange={e => setLicenseInput(e.target.value)}
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="field font-mono"
                  />
                </div>
                <button type="submit" disabled={loading === 'license' || !licenseInput.trim()} className="btn-primary w-full">
                  {loading === 'license' ? (isFil ? 'Chine-check…' : 'Checking…') : isFil ? 'I-activate ang Key' : 'Activate license key'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
