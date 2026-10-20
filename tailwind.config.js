/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
          /* Fixed dark maroon for the photographic brand panel; never inverts. */
          panel: 'rgb(var(--c-brand-panel) / <alpha-value>)',
          strong: 'rgb(var(--c-brand-strong) / <alpha-value>)',
          ink: 'rgb(var(--c-brand-ink) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-accent-ink) / <alpha-value>)',
          bright: 'rgb(var(--c-accent-bright) / <alpha-value>)',
        },
        ok: { DEFAULT: 'rgb(var(--c-ok) / <alpha-value>)', soft: 'rgb(var(--c-ok-soft) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)', soft: 'rgb(var(--c-warn-soft) / <alpha-value>)' },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          soft: 'rgb(var(--c-danger-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-danger-ink) / <alpha-value>)',
        },
        badge: {
          DEFAULT: 'rgb(var(--c-badge) / <alpha-value>)',
          ink: 'rgb(var(--c-badge-ink) / <alpha-value>)',
        },
        info: { DEFAULT: 'rgb(var(--c-info) / <alpha-value>)', soft: 'rgb(var(--c-info-soft) / <alpha-value>)' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgb(46 12 14 / 0.05), 0 1px 3px rgb(46 12 14 / 0.07)',
        lift: '0 4px 12px rgb(46 12 14 / 0.09), 0 1px 3px rgb(46 12 14 / 0.06)',
        pop: '0 12px 32px rgb(46 12 14 / 0.16), 0 2px 8px rgb(46 12 14 / 0.09)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'slide-up': 'slide-up .18s ease-out',
        'slide-in-right': 'slide-in-right .22s cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
};
