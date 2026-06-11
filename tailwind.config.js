/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          DEFAULT: 'var(--amber)',
          dark: 'var(--amber-dark)',
          light: 'var(--amber-light)',
        },
        green: {
          DEFAULT: 'var(--green)',
          light: 'var(--green-light)',
        },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        error: 'var(--error)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
        btn: '14px',
      },
    },
  },
  plugins: [],
}
