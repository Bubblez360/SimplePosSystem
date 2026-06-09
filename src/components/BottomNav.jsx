import { useStore } from '../store/useStore'
import { t } from '../i18n'

const tabs = [
  { key: 'benta', icon: '🛒', labelKey: 'benta' },
  { key: 'menu',  icon: '📋', labelKey: 'menu' },
  { key: 'ulat',  icon: '📊', labelKey: 'ulat' },
  { key: 'setting', icon: '⚙️', labelKey: 'setting' },
]

export default function BottomNav() {
  const { screen, setScreen, lang } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border safe-bottom z-30">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(tab => {
          const active = screen === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setScreen(tab.key)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-amber' : 'text-faint'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-amber' : 'text-faint'}`}>
                {t(tab.labelKey, lang)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
