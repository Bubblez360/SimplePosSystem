import { peso } from '../cart/useCart'

// Vertical bars (hour / weekday / month). The peak bar is solid amber and
// labelled; the rest are muted so the eye lands on the busiest slot first.
export function BarChart({ data, ariaLabel }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0])
  // 17 hourly bars can't each carry a legible label on a phone: show every other one.
  const labelStep = data.length > 12 ? 2 : 1
  return (
    <div role="img" aria-label={ariaLabel} className="flex items-end gap-1 h-28">
      {data.map((bar, i) => {
        const isPeak = bar.value > 0 && bar === peak
        return (
          <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1">
            {isPeak && (
              <span className="font-mono text-[12px] font-medium text-amber-ink leading-none whitespace-nowrap">
                {peso(bar.value, { compact: true })}
              </span>
            )}
            <div
              className={`w-full rounded-t-md transition-[height] duration-300 ${
                bar.value > 0 ? (isPeak ? 'bg-amber' : 'bg-amber/45') : 'bg-border/60'
              }`}
              style={{ height: `${Math.max(3, (bar.value / max) * 70)}%` }}
            />
            <span className={`text-[12px] font-bold text-muted leading-none ${i % labelStep ? 'invisible' : ''}`} aria-hidden="true">{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Horizontal ranked bars (best sellers, categories).
export function RankedRows({ rows }) {
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <ol className="divide-y divide-border">
      {rows.map((row, i) => (
        <li key={row.key} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-6 h-6 rounded-full text-[12px] font-extrabold font-mono flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-amber text-on-amber' : 'bg-surface-2 text-muted'
                }`}
              >
                {i + 1}
              </span>
              <p className="text-[14px] font-bold truncate">{row.label}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.badge && <span className="pill-badge bg-surface-2 text-muted !normal-case">{row.badge}</span>}
              <span className="font-mono text-[13px] font-medium text-amber-ink">{peso(row.value, { compact: true })}</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full rounded-full ${i === 0 ? 'bg-amber' : 'bg-amber/45'}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          {row.footnote && <p className="text-[12px] text-muted mt-1">{row.footnote}</p>}
        </li>
      ))}
    </ol>
  )
}
