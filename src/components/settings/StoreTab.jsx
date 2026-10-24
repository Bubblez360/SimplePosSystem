import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { setSetting, getAllCategories, saveCategory, deleteCategory, getAllItems } from '../../db/db'
import { t } from '../../i18n'
import Icon from '../Icon'
import ImageCropper from '../ImageCropper'
import { SectionLabel, SettingGroup } from './rows'

const CAT_EMOJIS = ['🍱','🍗','🥤','☕','🍵','🧋','🍔','🍕','🌮','🍜','🥗','🍰','🍦','🍩','🧁','🥞','🍖','🥪','🍲','🥘']
const LOGO_SIZE = 256

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function squareLogo(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = LOGO_SIZE
      canvas.height = LOGO_SIZE
      canvas.getContext('2d').drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, LOGO_SIZE, LOGO_SIZE)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

function EmojiPicker({ value, onPick, lang }) {
  return (
    <div className="grid grid-cols-5 min-[400px]:grid-cols-10 gap-1 p-2 rounded-xl bg-surface-2 border border-border" role="group" aria-label={t('chooseEmoji', lang)}>
      {CAT_EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          aria-pressed={value === e}
          onClick={() => onPick(e)}
          className={`h-11 rounded-lg text-xl flex items-center justify-center cursor-pointer hover:bg-surface ${value === e ? 'bg-amber-light ring-2 ring-amber' : ''}`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

export default function StoreTab() {
  const lang = useStore(s => s.lang)
  const businessName = useStore(s => s.businessName)
  const setBusinessName = useStore(s => s.setBusinessName)
  const gcashQR = useStore(s => s.gcashQR)
  const setGcashQR = useStore(s => s.setGcashQR)
  const logo = useStore(s => s.logo)
  const setLogo = useStore(s => s.setLogo)
  const categories = useStore(s => s.categories)
  const setCategories = useStore(s => s.setCategories)
  const setItems = useStore(s => s.setItems)
  const showToast = useStore(s => s.showToast)
  const isFil = lang === 'fil'

  const [nameInput, setNameInput] = useState(businessName)
  const [qrSrc, setQrSrc] = useState(null)
  const [newCat, setNewCat] = useState({ name: '', emoji: '🍱', pickerOpen: false })
  const [edit, setEdit] = useState(null) // { id, name, emoji, pickerOpen }

  function handleNameSave(e) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setBusinessName(trimmed)
    showToast(isFil ? 'Pangalan na-save!' : 'Name saved!')
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await squareLogo(await readFile(file))
      setLogo(data)
      await setSetting('logo', data)
      showToast(isFil ? 'Logo na-save!' : 'Logo saved!')
    } catch {
      showToast(t('saleError', lang), 'error')
    }
  }

  async function handleRemoveLogo() {
    setLogo(null)
    await setSetting('logo', null)
    showToast(isFil ? 'Logo tinanggal!' : 'Logo removed!')
  }

  async function handleQrFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setQrSrc(await readFile(file))
  }

  async function applyQr(data) {
    setGcashQR(data)
    await setSetting('gcashQR', data)
    setQrSrc(null)
    showToast(isFil ? 'GCash QR na-save!' : 'GCash QR saved!')
  }

  async function refreshCategories() {
    setCategories(await getAllCategories())
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    const name = newCat.name.trim()
    if (!name) return
    await saveCategory({ name, emoji: newCat.emoji })
    await refreshCategories()
    setNewCat({ name: '', emoji: '🍱', pickerOpen: false })
    showToast(isFil ? 'Category nadagdag!' : 'Category added!')
  }

  async function handleSaveCategory(e) {
    e.preventDefault()
    const name = edit.name.trim()
    if (!name) return
    await saveCategory({ id: edit.id, name, emoji: edit.emoji })
    await refreshCategories()
    setEdit(null)
    showToast(isFil ? 'Category na-update!' : 'Category updated!')
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm(t('categoryDeleteConfirm', lang))) return
    await deleteCategory(id)
    await refreshCategories()
    setItems(await getAllItems()) // items were unlinked from the category
    setEdit(null)
    showToast(isFil ? 'Category nabura!' : 'Category deleted!')
  }

  return (
    <div>
      <SectionLabel>{isFil ? 'Pangalan ng Tindahan' : 'Business Name'}</SectionLabel>
      <SettingGroup>
        <form onSubmit={handleNameSave} className="p-3 flex gap-2">
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder={t('enterName', lang)}
            aria-label={t('businessName', lang)}
            maxLength={60}
            className="field flex-1 min-w-0"
          />
          <button type="submit" disabled={!nameInput.trim()} className="btn-primary px-5">{t('save', lang)}</button>
        </form>
      </SettingGroup>

      <SectionLabel>{t('storeLogo', lang)}</SectionLabel>
      <SettingGroup>
        <div className="p-3">
          {logo ? (
            <div className="flex items-center gap-4">
              <img src={logo} alt="" className="w-16 h-16 rounded-2xl border border-border object-cover" />
              <div className="flex flex-wrap gap-2">
                <label className="btn-secondary btn-sm">
                  <Icon name="upload" size={16} />{t('uploadLogo', lang)}
                  <input type="file" accept="image/*" className="sr-only" onChange={handleLogo} />
                </label>
                <button type="button" onClick={handleRemoveLogo} className="btn-ghost btn-sm text-error">
                  <Icon name="trash" size={16} />{t('removeLogo', lang)}
                </button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2.5 min-h-[64px] rounded-xl border-2 border-dashed border-border bg-surface-2 text-muted font-bold text-[14px] cursor-pointer hover:border-amber">
              <Icon name="store" size={22} />
              {t('uploadLogo', lang)}
              <input type="file" accept="image/*" className="sr-only" onChange={handleLogo} />
            </label>
          )}
        </div>
      </SettingGroup>

      <SectionLabel>{t('gcashQR', lang)}</SectionLabel>
      <SettingGroup>
        <div className="p-3">
          {gcashQR ? (
            <div className="flex items-center gap-4">
              <img src={gcashQR} alt={t('gcashQR', lang)} className="w-20 h-20 rounded-xl border border-border bg-white object-contain" />
              <label className="btn-secondary btn-sm">
                <Icon name="camera" size={16} />{t('changeQR', lang)}
                <input type="file" accept="image/*" className="sr-only" onChange={handleQrFile} />
              </label>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1 min-h-[112px] px-4 text-center rounded-xl border-2 border-dashed border-border bg-surface-2 cursor-pointer hover:border-amber">
              <Icon name="qr" size={28} className="text-muted" />
              <span className="text-[14px] font-bold text-text">{t('uploadQR', lang)}</span>
              <span className="text-[12px] text-muted">{t('uploadQRHint', lang)}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleQrFile} />
            </label>
          )}
        </div>
      </SettingGroup>

      <SectionLabel>{t('categories', lang)}</SectionLabel>
      <SettingGroup>
        {categories.map(cat => (
          edit?.id === cat.id ? (
            <form key={cat.id} onSubmit={handleSaveCategory} className="p-3 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary !px-0 w-12 text-2xl"
                  aria-label={t('chooseEmoji', lang)}
                  aria-expanded={edit.pickerOpen}
                  onClick={() => setEdit({ ...edit, pickerOpen: !edit.pickerOpen })}
                >
                  {edit.emoji}
                </button>
                <input
                  data-autofocus
                  value={edit.name}
                  onChange={e => setEdit({ ...edit, name: e.target.value })}
                  aria-label={t('categoryName', lang)}
                  maxLength={30}
                  className="field flex-1 min-w-0"
                />
              </div>
              {edit.pickerOpen && <EmojiPicker value={edit.emoji} lang={lang} onPick={emoji => setEdit({ ...edit, emoji, pickerOpen: false })} />}
              <div className="flex gap-2">
                <button type="submit" disabled={!edit.name.trim()} className="btn-primary btn-sm flex-1">{t('save', lang)}</button>
                <button type="button" onClick={() => setEdit(null)} className="btn-secondary btn-sm">{t('cancel', lang)}</button>
                <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="btn-danger btn-sm">
                  <Icon name="trash" size={16} />
                  <span className="sr-only">{t('delete', lang)}</span>
                </button>
              </div>
            </form>
          ) : (
            <div key={cat.id} className="flex items-center gap-3 pl-4 pr-1 min-h-[56px]">
              <span className="text-2xl" aria-hidden="true">{cat.emoji || '🍱'}</span>
              <span className="flex-1 min-w-0 text-[15px] font-bold truncate">{cat.name}</span>
              <button type="button" className="icon-btn" aria-label={`${t('edit', lang)}: ${cat.name}`} onClick={() => setEdit({ id: cat.id, name: cat.name, emoji: cat.emoji || '🍱', pickerOpen: false })}>
                <Icon name="pencil" size={18} />
              </button>
              <button type="button" className="icon-btn text-error" aria-label={`${t('delete', lang)}: ${cat.name}`} onClick={() => handleDeleteCategory(cat.id)}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          )
        ))}

        <form onSubmit={handleAddCategory} className="p-3 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary !px-0 w-12 text-2xl"
              aria-label={t('chooseEmoji', lang)}
              aria-expanded={newCat.pickerOpen}
              onClick={() => setNewCat({ ...newCat, pickerOpen: !newCat.pickerOpen })}
            >
              {newCat.emoji}
            </button>
            <input
              value={newCat.name}
              onChange={e => setNewCat({ ...newCat, name: e.target.value })}
              placeholder={t('categoryName', lang)}
              aria-label={t('categoryName', lang)}
              maxLength={30}
              className="field flex-1 min-w-0"
            />
            <button type="submit" disabled={!newCat.name.trim()} className="btn-primary !px-0 w-12" aria-label={t('addItem', lang)}>
              <Icon name="plus" size={22} strokeWidth={2.6} />
            </button>
          </div>
          {newCat.pickerOpen && <EmojiPicker value={newCat.emoji} lang={lang} onPick={emoji => setNewCat({ ...newCat, emoji, pickerOpen: false })} />}
        </form>
      </SettingGroup>

      {qrSrc && (
        <ImageCropper
          src={qrSrc}
          lang={lang}
          maxSize={1024}
          title={t('cropQR', lang)}
          hint={t('cropQRHint', lang)}
          onCancel={() => setQrSrc(null)}
          onApply={applyQr}
        />
      )}
    </div>
  )
}
