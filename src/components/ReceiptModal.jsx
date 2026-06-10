import { useStore } from '../store/useStore'
import { t } from '../i18n'

export default function ReceiptModal() {
  const { lastSale, setReceiptOpen, lang, businessName } = useStore()
  if (!lastSale) return null

  const { ref, date, lines, total, method, cashGiven, change, discount } = lastSale
  const isFil = lang === 'fil'

  function handleDone() {
    setReceiptOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg overflow-y-auto">
      {/* Success header */}
      <div className="flex flex-col items-center pt-10 pb-6 px-4" style={{ background: '#FFFBEB' }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: '#F59E0B', boxShadow: '0 4px 24px rgba(245,158,11,0.35)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xl font-extrabold text-text tracking-tight">
          {isFil ? 'Bayad na!' : 'Payment received!'}
        </p>
        <p className="text-sm text-muted mt-0.5 font-medium">
          {method === 'gcash' ? 'GCash' : isFil ? 'Cash' : 'Cash'}
        </p>
      </div>

      {/* Receipt body */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-0">
        <div className="bg-surface rounded-[18px] overflow-hidden" style={{ border: '1px solid #E7E5E4' }}>

          {/* Store name + ref */}
          <div className="px-4 py-4 flex flex-col items-center border-b border-dashed border-border">
            <p className="text-base font-extrabold text-text">{businessName || 'TindaPOS'}</p>
            <p className="text-[11px] text-faint font-mono mt-0.5">
              {date ? new Date(date).toLocaleString(isFil ? 'fil-PH' : 'en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              }) : ''}
            </p>
            {ref && (
              <p className="text-[10px] font-mono font-bold text-faint mt-1 tracking-widest">
                #{ref}
              </p>
            )}
          </div>

          {/* Items */}
          <div className="px-4 py-2">
            {lines.map((line, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-dashed border-border last:border-0">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-semibold text-text leading-snug">{line.name}</p>
                  {line.addons?.length > 0 && (
                    <p className="text-[11px] text-muted mt-0.5">+ {line.addons.join(', ')}</p>
                  )}
                  {line.note && (
                    <p className="text-[11px] text-faint mt-0.5 italic">"{line.note}"</p>
                  )}
                  <p className="text-xs text-faint mt-0.5">× {line.qty}</p>
                </div>
                <p className="font-mono text-sm font-semibold text-text flex-shrink-0">
                  ₱{line.subtotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 flex flex-col gap-1.5" style={{ background: '#FFFBEB', borderTop: '2px dashed #F59E0B' }}>
            {discount?.amount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">{isFil ? 'Diskwento' : 'Discount'}</p>
                <p className="font-mono text-sm font-semibold" style={{ color: '#16A34A' }}>
                  -₱{discount.amount.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-amber-dark uppercase tracking-wide">
                {t('totalAmount', lang)}
              </p>
              <p className="font-mono text-2xl font-bold text-amber-dark">₱{total.toFixed(2)}</p>
            </div>
            {method === 'cash' && cashGiven && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">{isFil ? 'Ibinigay' : 'Cash given'}</p>
                  <p className="font-mono text-sm text-text">₱{parseFloat(cashGiven).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold" style={{ color: '#16A34A' }}>
                    {isFil ? 'Sukli' : 'Change'}
                  </p>
                  <p className="font-mono text-lg font-bold" style={{ color: '#16A34A' }}>
                    ₱{parseFloat(change || 0).toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Thank you */}
          <div className="px-4 py-3 flex items-center justify-center border-t border-dashed border-border">
            <p className="text-xs text-faint font-medium">
              {isFil ? 'Salamat sa inyong pagbili! 🙏' : 'Thank you for your purchase! 🙏'}
            </p>
          </div>
        </div>
      </div>

      {/* Done button */}
      <div className="px-4 pt-2 pb-8">
        <button
          onClick={handleDone}
          className="w-full h-[56px] rounded-[16px] font-extrabold text-base tracking-wide text-white"
          style={{ background: '#F59E0B', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
        >
          {isFil ? 'Tapos na' : 'Done'}
        </button>
      </div>
    </div>
  )
}
