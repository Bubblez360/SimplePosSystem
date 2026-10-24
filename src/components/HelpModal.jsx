import { useState } from 'react'
import { useStore } from '../store/useStore'
import { HELP } from '../data/help'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'

export const GUIDE_URL = 'https://bubblez360.github.io/SimplePosSystem/guide.html'

export default function HelpModal() {
  const lang = useStore(s => s.lang)
  const setHelpOpen = useStore(s => s.setHelpOpen)
  const [open, setOpen] = useState(null)
  const isFil = lang === 'fil'
  const items = HELP[lang] || HELP.fil

  return (
    <Sheet
      title={isFil ? 'Tulong' : 'Help'}
      subtitle={isFil ? 'Mga madalas na tanong' : 'Frequently asked questions'}
      closeLabel={t('close', lang)}
      onClose={() => setHelpOpen(false)}
    >
      <div className="px-4 pb-5 sheet-pb flex flex-col gap-2">
        {items.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} className="card overflow-hidden">
              <h3>
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left min-h-[56px] cursor-pointer hover:bg-surface-2 transition-colors"
                >
                  <span className="text-[14px] font-bold leading-snug">{item.q}</span>
                  <Icon name="chevron-down" size={18} className={`text-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </h3>
              {isOpen && (
                <p id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="px-4 pb-4 pt-3 text-[14px] leading-relaxed text-muted border-t border-border">
                  {item.a}
                </p>
              )}
            </div>
          )
        })}

        <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-2 w-full">
          <Icon name="book" size={18} />
          {isFil ? 'Buong gabay (online)' : 'Full guide (online)'}
        </a>
      </div>
    </Sheet>
  )
}
