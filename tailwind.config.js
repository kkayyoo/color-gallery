/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // CSS-variable-driven semantic tokens (theme-aware)
        canvas: {
          DEFAULT: 'var(--canvas)',
          50: 'var(--canvas-50)',
          100: 'var(--canvas-100)',
          200: 'var(--canvas-200)',
          300: 'var(--canvas-300)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          border: 'var(--surface-border)',
          'border-strong': 'var(--surface-border-strong)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          dim: 'var(--brand-dim)',
          bright: 'var(--brand-bright)',
          violet: 'var(--brand-violet)',
          'violet-bright': 'var(--brand-violet-bright)',
        },
        // Text semantic tokens
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        // Fixed accent colors (not theme-dependent)
        accent: {
          amber: '#f59e0b',
          'amber-bright': '#fbbf24',
          teal: '#2dd4bf',
          rose: '#f43f5e',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1, #7c3aed)',
        'brand-gradient-h': 'linear-gradient(90deg, #6366f1, #7c3aed)',
        'subtle-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.2)',
        'brand-glow': '0 0 24px rgba(99,102,241,0.3)',
        'brand-glow-lg': '0 0 48px rgba(99,102,241,0.2)',
        'swatch': '0 2px 8px rgba(0,0,0,0.15)',
        'swatch-lg': '0 4px 16px rgba(0,0,0,0.2)',
        'modal': '0 24px 80px rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
}
