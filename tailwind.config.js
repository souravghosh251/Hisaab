/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (index.css) so light and dark themes share the same class names.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), line: v('line'),
        ink: v('ink'), // dark surfaces: primary buttons, totals card, avatars
        fg: v('fg'), // text and strong borders
        muted: v('muted'), due: v('due'), paid: v('paid'), link: v('link'),
        lime: '#D4FF3A',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
