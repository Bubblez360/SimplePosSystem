import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import { GUIDE_URL } from './HelpModal'

const STEPS = [
  { icon: 'grid', key: 'welcomeStep1' },
  { icon: 'qr', key: 'welcomeStep2' },
  { icon: 'chart', key: 'welcomeStep3' },
]

// First-run welcome. Dismissal is remembered by the parent in localStorage.
export default function OnboardingModal({ lang, onClose }) {
  function openGuide() {
    window.open(GUIDE_URL, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <Sheet title={t('welcomeTitle', lang)} subtitle={t('welcomeSub', lang)} closeLabel={t('close', lang)} onClose={onClose}>
      <ol className="px-5 pb-4 flex flex-col gap-3">
        {STEPS.map(({ icon, key }, i) => (
          <li key={key} className="flex items-center gap-3.5">
            <span className="relative w-12 h-12 rounded-2xl bg-amber-light text-amber-ink flex items-center justify-center shrink-0">
              <Icon name={icon} size={22} />
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-text text-surface text-[12px] font-extrabold font-mono flex items-center justify-center">
                {i + 1}
              </span>
            </span>
            <span className="text-[15px] font-semibold leading-snug">{t(key, lang)}</span>
          </li>
        ))}
      </ol>
      <div className="px-5 pb-5 sheet-pb flex flex-col gap-2">
        <button type="button" data-autofocus onClick={openGuide} className="btn-primary w-full h-14 text-base">
          <Icon name="book" size={20} />
          {t('openGuide', lang)}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost w-full">{t('skipGuide', lang)}</button>
      </div>
    </Sheet>
  )
}
