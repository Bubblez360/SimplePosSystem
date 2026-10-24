import { useEffect, useState } from 'react'
import { hasUnsynced } from '../db/db'
import { getSyncError, getLastSyncTime, SYNC_CHANGED_EVENT } from '../lib/sync'

const TONES = {
  ok: { dot: 'bg-green', text: 'text-green' },
  pending: { dot: 'bg-amber', text: 'text-amber-ink' },
  error: { dot: 'bg-error', text: 'text-error' },
}

// Small live badge: green = all backed up, amber = pending upload,
// red = last sync failed. Refreshes on the sync-changed event so a failed
// background autoSync is never invisible.
export default function SyncStatus({ lang }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [last, setLast] = useState(null)
  const isFil = lang === 'fil'

  useEffect(() => {
    let alive = true
    async function refresh() {
      const [p, l] = await Promise.all([hasUnsynced(), getLastSyncTime()])
      if (!alive) return
      setPending(p)
      setLast(l)
      setError(getSyncError())
    }
    refresh()
    window.addEventListener(SYNC_CHANGED_EVENT, refresh)
    const id = setInterval(refresh, 15000)
    return () => {
      alive = false
      window.removeEventListener(SYNC_CHANGED_EVENT, refresh)
      clearInterval(id)
    }
  }, [])

  const tone = error ? 'error' : pending ? 'pending' : 'ok'
  const label = error
    ? (isFil ? 'Hindi na-sync — susubukan ulit' : 'Sync failed — will retry')
    : pending
      ? (isFil ? 'May hindi pa na-backup' : 'Pending backup')
      : (isFil ? 'Naka-backup lahat' : 'All backed up')
  const { dot, text } = TONES[tone]

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1" role="status">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      <span className={`text-[12px] font-bold ${text}`}>{label}</span>
      {tone === 'ok' && last && (
        <span className="text-[12px] text-muted">
          · {new Date(last).toLocaleString(isFil ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </p>
  )
}
