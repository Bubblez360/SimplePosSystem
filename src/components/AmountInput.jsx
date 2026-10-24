import { sanitizeAmount } from '../lib/checkout'

// Money/number field: DM Mono, decimal keypad on phones, and input is
// sanitized as it is typed (no "e", no minus, max 2 decimals).
export default function AmountInput({
  value, onChange, prefix = '₱', placeholder = '0', size = 'md', decimals = 2,
  className = '', inputClassName = '', ...rest
}) {
  const large = size === 'lg'
  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span
          aria-hidden="true"
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-medium text-muted pointer-events-none ${large ? 'text-xl' : 'text-[15px]'}`}
        >
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={value}
        onChange={e => onChange(sanitizeAmount(e.target.value, decimals))}
        placeholder={placeholder}
        className={`field font-mono ${large ? 'min-h-[60px] text-[28px] font-medium' : ''} ${
          prefix ? (large ? 'pl-10' : 'pl-8') : ''
        } ${inputClassName}`}
        {...rest}
      />
    </div>
  )
}
