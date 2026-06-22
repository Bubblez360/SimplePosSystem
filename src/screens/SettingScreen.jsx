import { useState, useEffect, useRef } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useStore } from '../store/useStore'
import { getSetting, setSetting, getAllCategories, saveCategory, deleteCategory, exportAllData, importAllData } from '../db/db'
import { connectPrinter, disconnectPrinter, isSupported as printerSupported } from '../utils/printer'
import { validateLicense, getCachedLicense, clearLicense, retrieveLicenseByEmail } from '../lib/license'
import { pushToCloud, pullFromCloud, noteSyncResult } from '../lib/sync'
import SyncStatus from '../components/SyncStatus'
import { t } from '../i18n'

const PAYMONGO_TRIAL_URL = 'https://pm.link/org-sYFHfsE6iaYeziwvXQQ4fiyP/FsgQoez'
const PAYMONGO_MONTHLY_URL = 'https://pm.link/org-sYFHfsE6iaYeziwvXQQ4fiyP/egcstXO'
const PAYMONGO_ANNUAL_URL = 'https://pm.link/org-sYFHfsE6iaYeziwvXQQ4fiyP/OkGvZss'
const CAT_EMOJIS = ['🍱','🍗','🥤','☕','🍵','🧋','🍔','🍕','🌮','🍜','🥗','🍰','🍦','🍩','🧁','🥞','🍖','🥪','🍲','🥘']

const IcoClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoPrint = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
const IcoSun = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const IcoGlobe = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
const IcoUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
const IcoDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
const IcoBook = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
const IcoChevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
const IcoStar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>

function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold text-muted uppercase tracking-wide px-4 pt-5 pb-1.5">{children}</p>
}

function SettingGroup({ children }) {
  return <div className="bg-surface border-y md:border md:rounded-card md:overflow-hidden border-border divide-y divide-surface-2">{children}</div>
}

function SettingRow({ icon, iconBg, label, sub, right, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 min-h-[52px] text-left ${onClick ? 'cursor-pointer active:bg-surface-2 transition-colors duration-150' : ''}`}>
      {icon && <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">{label}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </Tag>
  )
}

function SegControl({ options, value, onChange }) {
  return (
    <div className="flex bg-surface-2 rounded-lg p-0.5 gap-0.5">
      {options.map(([val, label]) => (
        <button key={val} onClick={e => { e.stopPropagation(); onChange(val) }} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-all cursor-pointer ${value === val ? 'bg-surface text-amber-dark' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function SettingScreen() {
  const { lang, setLang, businessName, setBusinessName, gcashQR, setGcashQR, categories, setCategories, printerConnected, setPrinterConnected, currentShift, setShiftModalOpen, logo, setLogo, theme, setTheme, isPremium, setIsPremium, licenseKey, setLicenseKey, setHelpOpen } = useStore()
  const [nameInput, setNameInput] = useState(businessName)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🍱')
  const [showCatEmoji, setShowCatEmoji] = useState(false)
  const [toast, setToast] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [settingsTab, setSettingsTab] = useState('store')
  const [editingCatId, setEditingCatId] = useState(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingCatEmoji, setEditingCatEmoji] = useState('🍱')
  const [showEditEmoji, setShowEditEmoji] = useState(false)
  const [qrCropSrc, setQrCropSrc] = useState(null)
  const [qrCrop, setQrCrop] = useState()
  const [qrCompletedCrop, setQrCompletedCrop] = useState(null)
  const qrImgRef = useRef(null)
  const [licenseInput, setLicenseInput] = useState(licenseKey)
  const [licenseLoading, setLicenseLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [retrieveLoading, setRetrieveLoading] = useState(false)
  const [trialUsed, setTrialUsed] = useState(() => localStorage.getItem('tindapos_trial_used') === '1')
  const [showAlreadyPaid, setShowAlreadyPaid] = useState(false)

  useEffect(() => {
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
    getAllCategories().then(setCategories)
    const cached = getCachedLicense()
    if (cached) {
      setIsPremium(true)
      if (cached.key) setLicenseKey(cached.key)
    }
  }, [])

  async function handleActivateLicense() {
    if (!licenseInput.trim()) return
    setLicenseLoading(true)
    const result = await validateLicense(licenseInput.trim())
    setLicenseLoading(false)
    if (result.valid) {
      setLicenseKey(licenseInput.trim())
      setIsPremium(true)
      if (result.plan === 'trial') {
        localStorage.setItem('tindapos_trial_used', '1')
        setTrialUsed(true)
      }
      showToast(lang === 'fil' ? 'Premium na-activate! 🎉' : 'Premium activated! 🎉')
    } else {
      showToast(result.error || (lang === 'fil' ? 'Invalid na license key' : 'Invalid license key'))
    }
  }

  async function handleRetrieveKey() {
    if (!emailInput.trim()) return
    setRetrieveLoading(true)
    const result = await retrieveLicenseByEmail(emailInput.trim())
    setRetrieveLoading(false)
    if (result.key) {
      setLicenseInput(result.key)
      showToast(lang === 'fil' ? 'Key na-retrieve! I-activate na.' : 'Key retrieved! Now activate it.')
    } else {
      showToast(result.error || (lang === 'fil' ? 'Walang license para sa email na iyon' : 'No license found for that email'))
    }
  }

  function handleRemoveLicense() {
    clearLicense()
    setLicenseKey('')
    setLicenseInput('')
    setIsPremium(false)
    setTrialUsed(false)
    showToast(lang === 'fil' ? 'Premium na-remove' : 'Premium removed')
  }

  async function handlePushSync() {
    if (!licenseKey) return
    setSyncLoading('push')
    try {
      await pushToCloud(licenseKey)
      showToast(lang === 'fil' ? 'Na-sync sa cloud! ☁️' : 'Synced to cloud! ☁️')
    } catch (err) {
      noteSyncResult(err?.message || 'Sync failed')
      showToast(lang === 'fil' ? 'Hindi na-sync. Subukan ulit.' : 'Sync failed. Try again.')
    }
    setSyncLoading(false)
  }

  async function handlePullSync() {
    if (!licenseKey) return
    const msg = lang === 'fil'
      ? 'Papalitan ang menu/items mula sa cloud. Hindi mawawala ang mga benta — isasama lang ang mga wala pa. Ituloy?'
      : 'Your menu/items will be replaced with the cloud copy. Sales are never lost — missing ones are merged in. Continue?'
    if (!window.confirm(msg)) return
    setSyncLoading('pull')
    try {
      const { restored } = await pullFromCloud(licenseKey)
      showToast(lang === 'fil' ? `Na-restore ang ${restored} records mula cloud!` : `Restored ${restored} records from cloud!`)
      window.location.reload()
    } catch (err) {
      noteSyncResult(err?.message || 'Restore failed')
      showToast(lang === 'fil' ? 'Hindi ma-restore. Subukan ulit.' : 'Restore failed. Try again.')
    }
    setSyncLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2000) }

  function handleGCashUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setQrCropSrc(ev.target.result); setQrCrop(undefined); setQrCompletedCrop(null) }
    reader.readAsDataURL(file)
  }

  function onQrImageLoad(e) {
    const { width, height } = e.currentTarget
    setQrCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, 1, width, height), width, height))
  }

  async function applyQrCrop() {
    if (!qrCompletedCrop || !qrImgRef.current) return
    const img = qrImgRef.current
    const canvas = document.createElement('canvas')
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    canvas.width = qrCompletedCrop.width
    canvas.height = qrCompletedCrop.height
    canvas.getContext('2d').drawImage(img, qrCompletedCrop.x * scaleX, qrCompletedCrop.y * scaleY, qrCompletedCrop.width * scaleX, qrCompletedCrop.height * scaleY, 0, 0, qrCompletedCrop.width, qrCompletedCrop.height)
    const data = canvas.toDataURL('image/jpeg', 0.92)
    setGcashQR(data)
    await setSetting('gcashQR', data)
    setQrCropSrc(null)
    showToast(lang === 'fil' ? 'GCash QR na-save!' : 'GCash QR saved!')
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = async () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 256; canvas.height = 256
        canvas.getContext('2d').drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 256, 256)
        const data = canvas.toDataURL('image/jpeg', 0.9)
        setLogo(data)
        await setSetting('logo', data)
        showToast(lang === 'fil' ? 'Logo na-save!' : 'Logo saved!')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleRemoveLogo() {
    setLogo(null)
    await setSetting('logo', null)
    showToast(lang === 'fil' ? 'Logo tinanggal!' : 'Logo removed!')
  }

  async function handleExportBackup() {
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tindapos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast(t('backupSuccess', lang))
    } catch {
      showToast(lang === 'fil' ? 'Hindi ma-export ang backup.' : 'Export failed.')
    }
  }

  async function handleImportBackup(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm(t('importConfirm', lang))) { e.target.value = ''; return }
    setRestoring(true)
    try {
      const data = JSON.parse(await file.text())
      await importAllData(data)
      showToast(t('restoreSuccess', lang))
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      showToast(t('restoreError', lang))
    } finally {
      setRestoring(false)
      e.target.value = ''
    }
  }

  function handleNameSave() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setBusinessName(trimmed)
    showToast(lang === 'fil' ? 'Pangalan na-save!' : 'Name saved!')
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    await saveCategory({ name: newCatName.trim(), emoji: newCatEmoji })
    setCategories(await getAllCategories())
    setNewCatName(''); setNewCatEmoji('🍱'); setShowCatEmoji(false)
    showToast(lang === 'fil' ? 'Category nadagdag!' : 'Category added!')
  }

  async function handleDeleteCategory(id) {
    await deleteCategory(id)
    setCategories(await getAllCategories())
    if (editingCatId === id) setEditingCatId(null)
    showToast(lang === 'fil' ? 'Category nabura!' : 'Category deleted!')
  }

  async function handleSaveCategory() {
    if (!editingCatName.trim()) return
    await saveCategory({ id: editingCatId, name: editingCatName.trim(), emoji: editingCatEmoji })
    setCategories(await getAllCategories())
    setEditingCatId(null); setShowEditEmoji(false)
    showToast(lang === 'fil' ? 'Category na-update!' : 'Category updated!')
  }

  if (qrCropSrc) {
    return (
      <div className="screen-enter">
        <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center gap-3">
          <button onClick={() => setQrCropSrc(null)} className="text-amber font-bold text-sm cursor-pointer">← {t('cancel', lang)}</button>
          <p className="text-lg font-extrabold text-text flex-1">{t('cropQR', lang)}</p>
          <button onClick={applyQrCrop} className="text-amber font-bold text-sm cursor-pointer">{t('applyCrop', lang)}</button>
        </header>
        <div className="flex flex-col items-center p-4 gap-4">
          <p className="text-xs text-muted text-center">{t('cropQRHint', lang)}</p>
          <ReactCrop crop={qrCrop} onChange={c => setQrCrop(c)} onComplete={c => setQrCompletedCrop(c)} aspect={1}>
            <img ref={qrImgRef} src={qrCropSrc} alt="qr" onLoad={onQrImageLoad} className="max-w-full rounded-card" />
          </ReactCrop>
          <button onClick={applyQrCrop} className="w-full h-12 rounded-btn bg-amber text-white font-bold text-sm cursor-pointer">{t('applyCrop', lang)}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-enter">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-text text-surface text-sm font-semibold px-4 py-2.5 rounded-pill shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <header className="sticky top-0 bg-surface border-b border-border z-10">
        <div className="px-4 pt-3 pb-0 md:max-w-2xl md:mx-auto">
        <p className="text-lg font-extrabold text-text mb-3">{t('setting', lang)}</p>
        <div className="flex">
          {[['store', lang === 'fil' ? 'Tindahan' : 'Store'], ['system', lang === 'fil' ? 'Sistema' : 'System']].map(([tab, label]) => (
            <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${settingsTab === tab ? 'border-amber text-amber' : 'border-transparent text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
        </div>
      </header>

      <div className="pb-[max(2rem,env(safe-area-inset-bottom))] bg-bg min-h-screen md:max-w-2xl md:mx-auto md:px-4 md:pt-4">

        {/* ── TINDAHAN TAB ── */}
        {settingsTab === 'store' && (
          <div>
            <SectionLabel>{lang === 'fil' ? 'Pangalan ng Tindahan' : 'Business Name'}</SectionLabel>
            <SettingGroup>
              <div className="px-4 py-3 flex gap-2">
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  placeholder={t('enterName', lang)}
                  className="flex-1 h-11 rounded-lg border border-border px-3 text-[16px] font-semibold bg-surface focus:outline-none focus:border-amber"
                />
                <button onClick={handleNameSave} className="h-11 px-4 rounded-btn bg-amber text-white font-bold text-sm cursor-pointer">{t('save', lang)}</button>
              </div>
            </SettingGroup>

            <SectionLabel>{t('storeLogo', lang)}</SectionLabel>
            <SettingGroup>
              <div className="px-4 py-3">
                {logo ? (
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="logo" className="w-14 h-14 rounded-card border border-border object-cover" />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-amber cursor-pointer">{t('uploadLogo', lang)}<input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></label>
                      <button onClick={handleRemoveLogo} className="text-xs font-bold text-error text-left cursor-pointer">{t('removeLogo', lang)}</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-11 rounded-lg border-2 border-dashed border-border bg-surface-2 cursor-pointer">
                    <span className="text-base">🏪</span>
                    <span className="text-sm font-semibold text-muted">{t('uploadLogo', lang)}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
            </SettingGroup>

            <SectionLabel>{t('gcashQR', lang)}</SectionLabel>
            <SettingGroup>
              <div className="px-4 py-3">
                {gcashQR ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-card border border-border overflow-hidden bg-surface-2">
                      <img src={gcashQR} alt="GCash QR" className="w-full h-full object-contain" />
                    </div>
                    <label className="text-sm font-bold text-amber cursor-pointer">{t('changeQR', lang)}<input type="file" accept="image/*" className="hidden" onChange={handleGCashUpload} /></label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-card border-2 border-dashed border-border bg-surface-2 cursor-pointer gap-1.5">
                    <span className="text-2xl">📷</span>
                    <p className="text-sm font-semibold text-muted">{t('uploadQR', lang)}</p>
                    <p className="text-xs text-faint">{t('uploadQRHint', lang)}</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleGCashUpload} />
                  </label>
                )}
              </div>
            </SettingGroup>

            <SectionLabel>{t('categories', lang)}</SectionLabel>
            <SettingGroup>
              {categories.map(cat =>
                editingCatId === cat.id ? (
                  <div key={cat.id} className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setShowEditEmoji(v => !v)} className="w-10 h-10 rounded-lg border border-border bg-surface-2 text-xl flex items-center justify-center flex-shrink-0 cursor-pointer">{editingCatEmoji}</button>
                      <input autoFocus value={editingCatName} onChange={e => setEditingCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(); if (e.key === 'Escape') { setEditingCatId(null); setShowEditEmoji(false) } }} className="flex-1 h-10 rounded-lg border border-amber px-3 text-[16px] font-semibold bg-surface focus:outline-none" />
                    </div>
                    {showEditEmoji && (
                      <div className="grid grid-cols-10 gap-1 p-2 bg-surface-2 rounded-card border border-border">
                        {CAT_EMOJIS.map(e => <button key={e} onClick={() => { setEditingCatEmoji(e); setShowEditEmoji(false) }} className={`text-xl h-9 rounded flex items-center justify-center cursor-pointer ${editingCatEmoji === e ? 'bg-amber-light' : ''}`}>{e}</button>)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleSaveCategory} disabled={!editingCatName.trim()} className="flex-1 h-9 rounded-btn bg-amber text-white font-bold text-xs disabled:opacity-40 cursor-pointer">{t('save', lang)}</button>
                      <button onClick={() => { setEditingCatId(null); setShowEditEmoji(false) }} className="h-9 px-3 rounded-btn border border-border text-text font-bold text-xs cursor-pointer">{t('cancel', lang)}</button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="h-9 px-3 rounded-btn text-error font-bold text-xs cursor-pointer">{t('delete', lang)}</button>
                    </div>
                  </div>
                ) : (
                  <div key={cat.id} className="flex items-center justify-between px-4 min-h-[48px]">
                    <span className="text-sm font-semibold text-text">{cat.emoji && <span className="mr-1">{cat.emoji}</span>}{cat.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); setEditingCatEmoji(cat.emoji || '🍱'); setShowEditEmoji(false) }} className="text-amber text-xs font-bold px-2 py-1 cursor-pointer">{t('edit', lang)}</button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-error text-xs font-bold px-2 py-1 cursor-pointer">{t('delete', lang)}</button>
                    </div>
                  </div>
                )
              )}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <button onClick={() => setShowCatEmoji(v => !v)} className="w-12 h-12 rounded-lg border border-border bg-surface-2 text-2xl flex items-center justify-center flex-shrink-0 cursor-pointer">{newCatEmoji}</button>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} placeholder={t('categoryName', lang)} className="flex-1 h-12 rounded-lg border border-border px-3 text-[16px] font-semibold bg-surface focus:outline-none focus:border-amber" />
                  <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="h-12 px-3 rounded-btn bg-amber text-white font-bold text-sm disabled:opacity-40 cursor-pointer">+</button>
                </div>
                {showCatEmoji && (
                  <div className="grid grid-cols-10 gap-1 p-2 bg-surface-2 rounded-card border border-border">
                    {CAT_EMOJIS.map(e => <button key={e} onClick={() => { setNewCatEmoji(e); setShowCatEmoji(false) }} className={`text-xl h-9 rounded flex items-center justify-center cursor-pointer ${newCatEmoji === e ? 'bg-amber-light' : ''}`}>{e}</button>)}
                  </div>
                )}
              </div>
            </SettingGroup>
          </div>
        )}

        {/* ── SISTEMA TAB ── */}
        {settingsTab === 'system' && (
          <div>
            {/* Premium card */}
            <div className="mx-4 mt-4 md:mx-0 bg-surface border border-border rounded-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 text-amber">
                  <IcoStar />
                  <p className="text-[15px] font-bold text-text">Premium</p>
                </div>
                {isPremium && <span className="text-[10px] font-extrabold text-white bg-amber px-2.5 py-0.5 rounded-full">ACTIVE</span>}
              </div>

              {isPremium ? (
                <div className="p-4 flex flex-col gap-2.5">
                  <div className="px-3 py-3 bg-amber-light border border-amber rounded-card">
                    <p className="text-sm font-bold text-amber-dark">☁️ Cloud Sync</p>
                    <SyncStatus lang={lang} />
                  </div>
                  <button onClick={handlePushSync} disabled={!!syncLoading} className="w-full h-12 rounded-btn bg-amber text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                    {syncLoading === 'push' ? '⏳' : '☁️'} {lang === 'fil' ? 'I-sync sa Cloud' : 'Sync to Cloud'}
                  </button>
                  <button onClick={handlePullSync} disabled={!!syncLoading} className="w-full h-12 rounded-btn border border-border bg-surface font-bold text-sm text-text flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                    {syncLoading === 'pull' ? '⏳' : '📲'} {lang === 'fil' ? 'I-restore mula Cloud' : 'Restore from Cloud'}
                  </button>
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {['☁️ Cloud backup', '📱 Multi-device sync', '📊 Full sales history', '📤 CSV export'].map(f => (
                      <p key={f} className="text-[11px] font-semibold text-muted flex items-center gap-1">{f}</p>
                    ))}
                  </div>
                  {!trialUsed && (
                    <a href={PAYMONGO_TRIAL_URL} target="_blank" rel="noopener noreferrer" className="w-full h-12 rounded-btn border-2 border-amber bg-amber-light text-amber-dark font-extrabold text-sm flex items-center justify-center gap-2">
                      🎁 {lang === 'fil' ? 'Subukan — ₱49 / 7 araw' : 'Try it — ₱49 / 7 days'}
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <a href={PAYMONGO_MONTHLY_URL} target="_blank" rel="noopener noreferrer" className="h-16 rounded-btn border border-border bg-surface-2 flex flex-col items-center justify-center gap-0.5">
                      <span className="text-base font-extrabold text-text">₱99</span>
                      <span className="text-[10px] font-bold text-muted">{lang === 'fil' ? 'bawat buwan' : 'per month'}</span>
                    </a>
                    <a href={PAYMONGO_ANNUAL_URL} target="_blank" rel="noopener noreferrer" className="h-16 rounded-btn border-2 border-amber bg-amber text-white flex flex-col items-center justify-center gap-0.5">
                      <span className="text-base font-extrabold">₱499</span>
                      <span className="text-[10px] font-bold opacity-80">{lang === 'fil' ? 'bawat taon ⭐' : 'per year ⭐'}</span>
                    </a>
                  </div>
                  <p className="text-[10px] text-faint text-center">{lang === 'fil' ? 'Makatipid ng ₱689 sa taunan vs buwanan' : 'Save ₱689/yr with annual vs monthly'}</p>
                  <button onClick={() => setShowAlreadyPaid(v => !v)} className="flex items-center justify-between w-full py-1 text-xs font-bold text-muted cursor-pointer">
                    <span>{lang === 'fil' ? 'May key na?' : 'Already paid?'}</span>
                    <span className="text-faint">{showAlreadyPaid ? '▲' : '▼'}</span>
                  </button>
                  {showAlreadyPaid && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-border">
                      <div className="flex gap-2">
                        <input value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRetrieveKey()} placeholder={lang === 'fil' ? 'Email na ginamit sa bayad...' : 'Email used for payment...'} type="email" inputMode="email" className="flex-1 h-11 rounded-lg border border-border px-3 text-[16px] bg-surface-2 focus:outline-none focus:border-amber text-text" />
                        <button onClick={handleRetrieveKey} disabled={retrieveLoading || !emailInput.trim()} className="h-11 px-3 rounded-btn border border-border bg-surface text-xs font-bold text-text disabled:opacity-50 whitespace-nowrap cursor-pointer">
                          {retrieveLoading ? '⏳' : (lang === 'fil' ? 'Kuhanin' : 'Get Key')}
                        </button>
                      </div>
                      <input value={licenseInput} onChange={e => setLicenseInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleActivateLicense()} placeholder="License key..." className="w-full h-11 rounded-lg border border-border px-3 text-[16px] font-mono bg-surface-2 focus:outline-none focus:border-amber text-text" />
                      <button onClick={handleActivateLicense} disabled={licenseLoading || !licenseInput.trim()} className="w-full h-12 rounded-btn bg-amber text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                        {licenseLoading ? '⏳ Checking...' : (lang === 'fil' ? 'I-activate ang Key' : 'Activate License Key')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operations */}
            <SectionLabel>{lang === 'fil' ? 'Operasyon' : 'Operations'}</SectionLabel>
            <SettingGroup>
              <SettingRow
                icon={<IcoClock />}
                iconBg="bg-amber-light text-amber-dark"
                label={lang === 'fil' ? 'Shift' : 'Shift'}
                sub={currentShift
                  ? `${lang === 'fil' ? 'Bukas mula' : 'Open since'} ${new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : (lang === 'fil' ? 'Walang bukas na shift' : 'No open shift')}
                right={
                  <button onClick={() => setShiftModalOpen(true)} className={`h-8 px-3 rounded-btn text-xs font-bold cursor-pointer ${currentShift ? 'bg-amber text-white' : 'border border-border bg-surface-2 text-muted'}`}>
                    {currentShift ? t('closeShift', lang) : t('openShift', lang)}
                  </button>
                }
              />
              <SettingRow
                icon={<IcoPrint />}
                iconBg="bg-surface-2 text-muted"
                label={lang === 'fil' ? 'Receipt Printer' : 'Receipt Printer'}
                sub={!printerSupported() ? t('noPrinterSupport', lang) : printerConnected ? t('printerConnected', lang) : (lang === 'fil' ? 'Walang koneksyon' : 'Not connected')}
                right={printerSupported() && (
                  printerConnected ? (
                    <button onClick={async () => { await disconnectPrinter(); setPrinterConnected(false) }} className="h-8 px-3 rounded-btn text-xs font-bold border border-green text-green cursor-pointer">
                      {t('disconnectPrinter', lang)}
                    </button>
                  ) : (
                    <button onClick={async () => { try { await connectPrinter(); setPrinterConnected(true); showToast(lang === 'fil' ? 'Printer nakakonekta!' : 'Printer connected!') } catch (e) { showToast(e.message || (lang === 'fil' ? 'Hindi makakonekta' : 'Could not connect')) } }} className="h-8 px-3 rounded-btn text-xs font-bold border border-border bg-surface-2 text-muted cursor-pointer">
                      {lang === 'fil' ? 'Ikonekta' : 'Connect'}
                    </button>
                  )
                )}
              />
            </SettingGroup>

            {/* Display */}
            <SectionLabel>{lang === 'fil' ? 'Display' : 'Display'}</SectionLabel>
            <SettingGroup>
              <SettingRow
                icon={<IcoSun />}
                iconBg="bg-amber-light text-amber-dark"
                label={t('theme', lang)}
                right={<SegControl options={[['light', t('lightMode', lang)], ['dark', t('darkMode', lang)]]} value={theme} onChange={setTheme} />}
              />
              <SettingRow
                icon={<IcoGlobe />}
                iconBg="bg-surface-2 text-muted"
                label={t('language', lang)}
                right={<SegControl options={[['fil', 'Filipino 🇵🇭'], ['eng', 'English']]} value={lang} onChange={setLang} />}
              />
            </SettingGroup>

            {/* Data */}
            <SectionLabel>{lang === 'fil' ? 'Data' : 'Data'}</SectionLabel>
            <SettingGroup>
              <SettingRow
                icon={<IcoUpload />}
                iconBg="bg-surface-2 text-green"
                label={t('exportBackup', lang)}
                sub={lang === 'fil' ? 'I-download bilang .json file' : 'Download as .json file'}
                right={<IcoChevron />}
                onClick={handleExportBackup}
              />
              <label className={`flex items-center gap-3 px-4 py-3 min-h-[52px] cursor-pointer ${restoring ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-2 text-muted"><IcoDownload /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">{restoring ? (lang === 'fil' ? 'Nire-restore...' : 'Restoring...') : t('importBackup', lang)}</p>
                  <p className="text-[11px] text-muted mt-0.5">{lang === 'fil' ? 'Palitan lahat ng data' : 'Replace all local data'}</p>
                </div>
                <IcoChevron />
                <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} disabled={restoring} />
              </label>
              <SettingRow
                icon={<IcoBook />}
                iconBg="bg-surface-2 text-muted"
                label={lang === 'fil' ? 'Tulong' : 'Help'}
                sub={lang === 'fil' ? 'Mga madalas na tanong' : 'Frequently asked questions'}
                right={<IcoChevron />}
                onClick={() => setHelpOpen(true)}
              />
              <a href="https://bubblez360.github.io/SimplePosSystem/" target="_blank" rel="noopener noreferrer">
                <SettingRow
                  icon={<IcoBook />}
                  iconBg="bg-surface-2 text-muted"
                  label={lang === 'fil' ? 'User Guide' : 'User Guide'}
                  sub={lang === 'fil' ? 'Buksan sa browser' : 'Open in browser'}
                  right={<IcoChevron />}
                />
              </a>
            </SettingGroup>

            {isPremium && (
              <div className="px-4 pt-6 pb-2 text-center">
                <button onClick={handleRemoveLicense} className="text-xs font-bold text-error cursor-pointer py-2 px-4">
                  {lang === 'fil' ? 'Alisin ang Premium' : 'Remove Premium'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
