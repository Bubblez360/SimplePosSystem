import { useEffect, useState } from 'react'
import { hasUnsynced } from '../db/db'
import { getSyncError, getLastSyncTime, SYNC_CHANGED_EVENT } from '../lib/sync'

const TONES = {
  ok: { dot: 'var(--green)', text: 'var(--green)' },
  pending: { dot: 'var(--amber)', text: 'var(--amber-dark)' },
  error: { dot: 'var(--error)', text: 'var(--error)' },
}

// Small live badge: green = all backed up, amber = pending upload,
// red = last sync failed. Refreshes on the sync-changed event so a failed
// background autoSync is no longer invisible.
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
  const colors = TONES[tone]

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
      <span className="text-[11px] font-bold" style={{ color: colors.text }}>{label}</span>
      {tone === 'ok' && last && (
        <span className="text-[10px] text-muted">
          · {new Date(last).toLocaleString(isFil ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
