import { useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'

// Renders the selected crop at the photo's real resolution (capped), so item
// photos and QR codes stay sharp on retina phones without bloating storage.
function cropToDataUrl(img, crop, maxSize) {
  const scaleX = img.naturalWidth / img.width
  const scaleY = img.naturalHeight / img.height
  const srcW = crop.width * scaleX
  const srcH = crop.height * scaleY
  const ratio = Math.min(1, maxSize / Math.max(srcW, srcH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(srcW * ratio))
  canvas.height = Math.max(1, Math.round(srcH * ratio))
  canvas.getContext('2d').drawImage(img, crop.x * scaleX, crop.y * scaleY, srcW, srcH, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export default function ImageCropper({ src, title, hint, lang, maxSize = 720, onCancel, onApply }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [done, setDone] = useState(null)

  function onLoad(e) {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height))
  }

  function apply() {
    if (!done?.width || !imgRef.current) return
    onApply(cropToDataUrl(imgRef.current, done, maxSize))
  }

  return (
    <Sheet variant="full" hideHeader title={title} onClose={onCancel}>
      <div className="min-h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <header className="flex items-center gap-2 px-2 h-16 border-b border-border shrink-0">
          <button type="button" onClick={onCancel} className="icon-btn" aria-label={t('cancel', lang)}>
            <Icon name="arrow-left" size={22} />
          </button>
          <h2 className="flex-1 text-lg font-extrabold tracking-tight">{title}</h2>
        </header>

        <div className="flex-1 flex flex-col items-center gap-4 p-4">
          <p className="text-[13px] text-muted text-center">{hint}</p>
          <ReactCrop crop={crop} onChange={setCrop} onComplete={setDone} aspect={1}>
            <img ref={imgRef} src={src} alt="" onLoad={onLoad} className="max-w-full max-h-[60dvh] rounded-xl" />
          </ReactCrop>
        </div>

        <div className="px-4 pt-3 sheet-pb border-t border-border bg-bg">
          <div className="max-w-md mx-auto">
            <button type="button" onClick={apply} disabled={!done?.width} className="btn-primary w-full h-14 text-base">
              <Icon name="check" size={20} strokeWidth={2.6} />
              {t('applyCrop', lang)}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
