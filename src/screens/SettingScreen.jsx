import { useState, useEffect, useRef } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useStore } from '../store/useStore'
import { getSetting, setSetting, getAllCategories, saveCategory, deleteCategory } from '../db/db'
import { connectPrinter, disconnectPrinter, isSupported as printerSupported } from '../utils/printer'
import { t } from '../i18n'

const CAT_EMOJIS = ['🍱','🍗','🥤','☕','🍵','🧋','🍔','🍕','🌮','🍜','🥗','🍰','🍦','🍩','🧁','🥞','🍖','🥪','🍲','🥘']

export default function SettingScreen() {
  const { lang, setLang, businessName, setBusinessName, gcashQR, setGcashQR, categories, setCategories, printerConnected, setPrinterConnected, currentShift, setShiftModalOpen } = useStore()
  const [nameInput, setNameInput] = useState(businessName)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🍱')
  const [showCatEmoji, setShowCatEmoji] = useState(false)
  const [toast, setToast] = useState(null)
  const [qrCropSrc, setQrCropSrc] = useState(null)
  const [qrCrop, setQrCrop] = useState()
  const [qrCompletedCrop, setQrCompletedCrop] = useState(null)
  const qrImgRef = useRef(null)

  useEffect(() => {
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
    getAllCategories().then(setCategories)
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function handleGCashUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setQrCropSrc(ev.target.result)
      setQrCrop(undefined)
      setQrCompletedCrop(null)
    }
    reader.readAsDataURL(file)
  }

  function onQrImageLoad(e) {
    const { width, height } = e.currentTarget
    const c = centerCrop(makeAspectCrop({ unit: '%', width: 80 }, 1, width, height), width, height)
    setQrCrop(c)
  }

  async function applyQrCrop() {
    if (!qrCompletedCrop || !qrImgRef.current) return
    const img = qrImgRef.current
    const canvas = document.createElement('canvas')
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    canvas.width = qrCompletedCrop.width
    canvas.height = qrCompletedCrop.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, qrCompletedCrop.x * scaleX, qrCompletedCrop.y * scaleY, qrCompletedCrop.width * scaleX, qrCompletedCrop.height * scaleY, 0, 0, qrCompletedCrop.width, qrCompletedCrop.height)
    const data = canvas.toDataURL('image/jpeg', 0.92)
    setGcashQR(data)
    await setSetting('gcashQR', data)
    setQrCropSrc(null)
    showToast(lang === 'fil' ? 'GCash QR na-save!' : 'GCash QR saved!')
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
    const updated = await getAllCategories()
    setCategories(updated)
    setNewCatName('')
    setNewCatEmoji('🍱')
    setShowCatEmoji(false)
    showToast(lang === 'fil' ? 'Category nadagdag!' : 'Category added!')
  }

  async function handleDeleteCategory(id) {
    await deleteCategory(id)
    const updated = await getAllCategories()
    setCategories(updated)
    showToast(lang === 'fil' ? 'Category nabura!' : 'Category deleted!')
  }

  if (qrCropSrc) {
    return (
      <div className="screen-enter">
        <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center gap-3">
          <button onClick={() => setQrCropSrc(null)} className="text-amber font-bold text-sm">← {t('cancel', lang)}</button>
          <p className="text-lg font-extrabold text-text flex-1">{t('cropQR', lang)}</p>
          <button onClick={applyQrCrop} className="text-amber font-bold text-sm">{t('applyCrop', lang)}</button>
        </header>
        <div className="flex flex-col items-center p-4 gap-4">
          <p className="text-xs text-muted text-center">{t('cropQRHint', lang)}</p>
          <ReactCrop crop={qrCrop} onChange={c => setQrCrop(c)} onComplete={c => setQrCompletedCrop(c)} aspect={1}>
            <img ref={qrImgRef} src={qrCropSrc} alt="qr" onLoad={onQrImageLoad} className="max-w-full rounded-card" />
          </ReactCrop>
          <button onClick={applyQrCrop} className="w-full h-12 rounded-btn bg-amber text-white font-bold text-sm">
            {t('applyCrop', lang)}
          </button>
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
              onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              placeholder={t('enterName', lang)}
              className="flex-1 h-12 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
            />
            <button onClick={handleNameSave} className="h-12 px-4 rounded-btn bg-amber text-white font-bold text-sm">
              {t('save', lang)}
            </button>
          </div>
        </section>

        {/* Categories */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('categories', lang)}</p>

          {categories.length > 0 && (
            <div className="flex flex-col gap-1 mb-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-card">
                  <span className="text-sm font-semibold text-text">
                    {cat.emoji && <span className="mr-1">{cat.emoji}</span>}{cat.name}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-error text-xs font-bold px-2 py-1"
                  >
                    {t('delete', lang)}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowCatEmoji(v => !v)}
              className="w-12 h-12 rounded-lg border border-border bg-surface-2 text-2xl flex items-center justify-center flex-shrink-0"
            >
              {newCatEmoji}
            </button>
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder={t('categoryName', lang)}
              className="flex-1 h-12 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="h-12 px-3 rounded-btn bg-amber text-white font-bold text-sm disabled:opacity-40"
            >
              +
            </button>
          </div>

          {showCatEmoji && (
            <div className="grid grid-cols-10 gap-1 p-2 mt-2 bg-surface-2 rounded-card border border-border">
              {CAT_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setNewCatEmoji(e); setShowCatEmoji(false) }}
                  className={`text-xl h-9 rounded flex items-center justify-center ${newCatEmoji === e ? 'bg-amber-light' : ''}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
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

        {/* Receipt Printer */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">🖨️ Receipt Printer</p>
          {!printerSupported() ? (
            <p className="text-xs text-faint">{t('noPrinterSupport', lang)}</p>
          ) : printerConnected ? (
            <div className="flex items-center justify-between px-3 py-3 bg-green-light border border-green rounded-card">
              <p className="text-sm font-semibold text-green">{t('printerConnected', lang)}</p>
              <button
                onClick={async () => { await disconnectPrinter(); setPrinterConnected(false) }}
                className="text-xs font-bold text-green underline"
              >
                {t('disconnectPrinter', lang)}
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  await connectPrinter()
                  setPrinterConnected(true)
                  showToast(lang === 'fil' ? 'Printer nakakonekta!' : 'Printer connected!')
                } catch (e) {
                  showToast(e.message || (lang === 'fil' ? 'Hindi makakonekta' : 'Could not connect'))
                }
              }}
              className="w-full h-12 rounded-btn border-2 border-dashed border-border bg-surface text-sm font-bold text-muted flex items-center justify-center gap-2"
            >
              <span>🖨️</span> {t('connectPrinter', lang)}
            </button>
          )}
        </section>

        {/* Shift */}
        <section>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">⏱️ {lang === 'fil' ? 'Shift' : 'Shift'}</p>
          {currentShift ? (
            <div className="flex items-center justify-between px-3 py-3 bg-amber-light border border-amber rounded-card">
              <div>
                <p className="text-sm font-bold text-amber-dark">{t('shiftOpen', lang)}</p>
                <p className="text-xs text-amber-dark/70 mt-0.5">
                  {new Date(currentShift.openedAt).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setShiftModalOpen(true)}
                className="h-9 px-3 rounded-btn bg-amber text-white text-xs font-bold"
              >
                {t('closeShift', lang)}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShiftModalOpen(true)}
              className="w-full h-12 rounded-btn border-2 border-dashed border-border bg-surface text-sm font-bold text-muted flex items-center justify-center gap-2"
            >
              <span>⏱️</span> {t('openShift', lang)}
            </button>
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
