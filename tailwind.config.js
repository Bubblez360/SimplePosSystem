/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FEF3C7',
        },
        green: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        bg: '#FAFAF7',
        surface: '#FFFFFF',
        surface2: '#F5F5F0',
        border: '#E7E5E4',
        text: '#1C1917',
        muted: '#78716C',
        faint: '#A8A29E',
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
