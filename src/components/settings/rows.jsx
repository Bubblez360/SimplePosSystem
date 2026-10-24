import Icon from '../Icon'

export function SectionLabel({ children }) {
  return <h2 className="eyebrow px-1 pt-6 pb-2">{children}</h2>
}

export function SettingGroup({ children }) {
  return <div className="card overflow-hidden divide-y divide-border">{children}</div>
}

// One row of a settings list. Pass onClick to make the whole row a button;
// pass href to make it a link. `right` is the trailing control.
export function SettingRow({ icon, tone = 'muted', label, sub, right, onClick, href }) {
  const tones = {
    muted: 'bg-surface-2 text-muted',
    amber: 'bg-amber-light text-amber-ink',
    green: 'bg-green-light text-green',
  }
  const body = (
    <>
      {icon && (
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-bold leading-snug">{label}</span>
        {sub && <span className="block text-[12px] text-muted mt-0.5">{sub}</span>}
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </>
  )
  const base = 'w-full flex items-center gap-3 px-4 py-3 min-h-[60px]'
  const interactive = `${base} cursor-pointer hover:bg-surface-2/70 active:bg-surface-2 transition-colors duration-150`

  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={interactive}>{body}</a>
  if (onClick) return <button type="button" onClick={onClick} className={interactive}>{body}</button>
  return <div className={base}>{body}</div>
}

export function SegControl({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex bg-surface-2 rounded-xl p-1 gap-1">
      {options.map(([val, text]) => (
        <button
          key={val}
          type="button"
          aria-pressed={value === val}
          onClick={() => onChange(val)}
          className={`min-h-[44px] px-3.5 rounded-lg text-[13px] font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
            value === val ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
