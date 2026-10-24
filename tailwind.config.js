/** @type {import('tailwindcss').Config} */

// Every color is a CSS-variable channel triplet (see index.css) so Tailwind
// opacity modifiers work (bg-amber/20) and light/dark swap with one attribute.
const token = name => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        border: token('border'),
        'border-strong': token('border-strong'),
        text: token('text'),
        muted: token('muted'),
        faint: token('faint'),
        amber: {
          DEFAULT: token('amber'),
          ink: token('amber-ink'),
          light: token('amber-light'),
          bg: token('amber-bg'),
        },
        'on-amber': token('on-amber'),
        green: {
          DEFAULT: token('green'),
          light: token('green-light'),
        },
        'on-green': token('on-green'),
        error: {
          DEFAULT: token('error'),
          light: token('error-light'),
        },
        'on-error': token('on-error'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        micro: ['12px', { lineHeight: '16px' }],
      },
      borderRadius: {
        card: '16px',
        btn: '14px',
        pill: '9999px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
        sheet: 'var(--shadow-sheet)',
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'scrim-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.18)' }, '100%': { transform: 'scale(1)' } },
        'toast-in': { from: { transform: 'translate(-50%, -12px)', opacity: '0' }, to: { transform: 'translate(-50%, 0)', opacity: '1' } },
      },
      animation: {
        'sheet-up': 'sheet-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scrim-in': 'scrim-in 150ms ease-out',
        pop: 'pop 260ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
