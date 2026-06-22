import { useState } from 'react'
import { useStore } from '../store/useStore'
import { HELP } from '../data/help'

const GUIDE_URL = 'https://bubblez360.github.io/SimplePosSystem/'

export default function HelpModal() {
  const { lang, setHelpOpen } = useStore()
  const [open, setOpen] = useState(null)
  const isFil = lang === 'fil'
  const items = HELP[lang] || HELP.fil

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-bg rounded-t-[24px] max-h-[88vh] flex flex-col max-w-2xl mx-auto"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xl font-extrabold text-text">{isFil ? 'Tulong' : 'Help'}</p>
            <p className="text-xs text-muted font-medium mt-0.5">
              {isFil ? 'Mga madalas na tanong' : 'Frequently asked questions'}
            </p>
          </div>
          <button
            onClick={() => setHelpOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted text-lg"
            style={{ background: 'var(--surface-2)' }}
          >×</button>
        </div>

        <div className="px-4 sheet-pb flex flex-col gap-2 overflow-y-auto">
          {items.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left min-h-[52px]">
                  <span className="text-sm font-bold text-text">{item.q}</span>
                  <span className={`text-faint text-base flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>
                {isOpen && (
                  <p className="px-4 pb-3 pt-0 text-[13px] leading-relaxed text-muted border-t border-border pt-3">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}

          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 h-12 rounded-btn border border-border bg-surface font-bold text-sm text-text flex items-center justify-center gap-2"
          >
            📖 {isFil ? 'Buong gabay (online)' : 'Full guide (online)'}
          </a>
        </div>
      </div>
    </div>
  )
}
