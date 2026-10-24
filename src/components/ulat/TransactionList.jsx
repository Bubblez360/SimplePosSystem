import { useState } from 'react'
import { t } from '../../i18n'
import Icon from '../Icon'
import { peso } from '../cart/useCart'

export default function TransactionList({ sales, period, lang, onVoid }) {
  const [openId, setOpenId] = useState(null)
  const locale = lang === 'fil' ? 'fil-PH' : 'en-PH'

  return (
    <ul className="flex flex-col gap-2">
      {[...sales].reverse().map(sale => {
        const isOpen = openId === sale.id
        const voided = sale.status === 'voided'
        const gcash = sale.method === 'gcash'
        return (
          <li key={sale.id} className={`card overflow-hidden ${voided ? 'opacity-70' : ''}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`sale-${sale.id}`}
              onClick={() => setOpenId(isOpen ? null : sale.id)}
              className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left cursor-pointer hover:bg-surface-2/60"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                voided ? 'bg-error-light text-error' : gcash ? 'bg-green-light text-green' : 'bg-surface-2 text-muted'
              }`}>
                <Icon name={voided ? 'ban' : gcash ? 'phone' : 'banknote'} size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold">
                  {voided ? t('voided', lang) : gcash ? 'GCash' : t('cash', lang)}
                  <span className="font-mono text-[12px] font-medium text-faint ml-2">{sale.ref || '—'}</span>
                </span>
                <span className="block text-[12px] text-muted">
                  {new Date(sale.date).toLocaleString(locale, {
                    month: period === 'today' ? undefined : 'short',
                    day: period === 'today' ? undefined : 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </span>
              <span className={`font-mono text-[16px] font-medium ${voided ? 'line-through text-faint' : ''}`}>{peso(sale.total)}</span>
              <Icon name="chevron-down" size={18} className={`text-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div id={`sale-${sale.id}`} className="border-t border-border bg-surface-2/60 px-4 py-3 flex flex-col gap-1">
                <p className="eyebrow mb-1">{t('orderDetails', lang)}</p>
                {sale.lines?.length > 0 ? sale.lines.map((line, i) => (
                  <div key={i} className="py-1.5 border-b border-border last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-semibold">
                        <span className="font-mono text-muted mr-2">{line.qty}×</span>{line.name}
                      </p>
                      <span className="font-mono text-[13px] text-muted shrink-0">{peso(line.subtotal)}</span>
                    </div>
                    {line.addons?.length > 0 && <p className="text-[12px] text-muted ml-7">+ {line.addons.join(', ')}</p>}
                    {line.note && <p className="text-[12px] text-faint italic ml-7">“{line.note}”</p>}
                  </div>
                )) : (
                  <p className="text-[13px] text-muted py-1">{sale.itemCount} {t('items', lang)}</p>
                )}
                {sale.discount?.amount > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-[13px] text-muted">{t('discount', lang)}</span>
                    <span className="font-mono text-[13px] text-green">−{peso(sale.discount.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-border">
                  <span className="text-[13px] font-bold text-muted">{t('totalAmount', lang)}</span>
                  <span className="font-mono text-[18px] font-medium text-amber-ink">{peso(sale.total)}</span>
                </div>
                {!voided && (
                  <button type="button" onClick={() => onVoid(sale.id)} className="btn-danger btn-sm mt-2">
                    <Icon name="ban" size={16} />
                    {t('voidSale', lang)}
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
