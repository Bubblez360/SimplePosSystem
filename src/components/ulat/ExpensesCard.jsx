import { useState } from 'react'
import { t } from '../../i18n'
import Icon from '../Icon'
import AmountInput from '../AmountInput'
import { peso } from '../cart/useCart'

export default function ExpensesCard({ expenses, lang, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const valid = Number(amount) > 0

  function submit(e) {
    e.preventDefault()
    if (!valid) return
    onAdd({ name: name.trim(), amount: Number(amount) })
    setName('')
    setAmount('')
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="gastos-title">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 id="gastos-title" className="section-title"><Icon name="receipt" size={18} className="text-muted" />{t('gastos', lang)}</h2>
        {total > 0 && <span className="font-mono text-[14px] font-medium text-error">−{peso(total)}</span>}
      </div>

      <form onSubmit={submit} className="px-4 pb-4 grid grid-cols-[1fr_8.5rem] gap-x-2 gap-y-3">
        <div className="col-span-2">
          <label htmlFor="gastos-name" className="field-label">{t('gastosFor', lang)}</label>
          <input
            id="gastos-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('gastosName', lang)}
            maxLength={60}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="gastos-amount" className="field-label">{t('amountLabel', lang)}</label>
          <AmountInput id="gastos-amount" value={amount} onChange={setAmount} />
        </div>
        <button type="submit" disabled={!valid} className="btn-primary self-end">
          <Icon name="plus" size={18} strokeWidth={2.6} />
          {t('addGastos', lang)}
        </button>
      </form>

      {expenses.length > 0 && (
        <ul className="border-t border-border divide-y divide-border">
          {[...expenses].reverse().map(exp => (
            <li key={exp.id} className="flex items-center gap-2 pl-4 pr-1 min-h-[56px]">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{exp.name || t('gastos', lang)}</p>
                <p className="text-[12px] text-muted">
                  {new Date(exp.date).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="font-mono text-[14px] font-medium text-error shrink-0">−{peso(exp.amount)}</span>
              <button type="button" className="icon-btn" aria-label={`${t('delete', lang)}: ${exp.name || t('gastos', lang)}`} onClick={() => onDelete(exp.id)}>
                <Icon name="x" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
