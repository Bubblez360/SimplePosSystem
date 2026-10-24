import { useStore } from '../store/useStore'
import { t } from '../i18n'
import Icon from './Icon'

const TABS = [
  { key: 'benta', icon: 'cart' },
  { key: 'menu', icon: 'grid' },
  { key: 'ulat', icon: 'chart' },
  { key: 'setting', icon: 'gear' },
]

// Thumb-reach bottom bar on phones/tablets; becomes a left rail on wide
// screens where there is no "one hand" constraint.
export default function BottomNav() {
  const screen = useStore(s => s.screen)
  const setScreen = useStore(s => s.setScreen)
  const lang = useStore(s => s.lang)
  const logo = useStore(s => s.logo)

  return (
    <nav
      aria-label={lang === 'fil' ? 'Pangunahing menu' : 'Main navigation'}
      className="fixed z-30 inset-x-0 bottom-0 bg-surface/95 backdrop-blur border-t border-border safe-bottom
        rail:inset-y-0 rail:right-auto rail:w-[88px] rail:border-t-0 rail:border-r rail:pt-[env(safe-area-inset-top)]"
    >
      <div className="grid grid-cols-4 h-16 max-w-2xl mx-auto rail:max-w-none rail:h-auto rail:grid-cols-1 rail:gap-1 rail:px-2 rail:pt-5">
        {logo && (
          <img src={logo} alt="" className="hidden rail:block w-11 h-11 mx-auto mb-3 rounded-xl object-cover border border-border" />
        )}
        {TABS.map(({ key, icon }) => {
          const active = screen === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setScreen(key)}
              aria-current={active ? 'page' : undefined}
              className="group relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] cursor-pointer
                rail:h-[68px] short:h-[54px] rail:rounded-2xl rail:hover:bg-surface-2 transition-colors"
            >
              <span
                className={`flex items-center justify-center h-8 w-14 rounded-pill transition-colors duration-150 ${
                  active ? 'bg-amber text-on-amber' : 'text-muted group-hover:text-text'
                }`}
              >
                <Icon name={icon} size={22} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`text-[12px] font-bold tracking-wide ${active ? 'text-text' : 'text-muted'}`}>
                {t(key, lang)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
