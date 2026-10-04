import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}', './packages/ui/src/**/*.{vue,ts}'],
  // SBadge builds its class at runtime (badge-${tone}); keep every tone.
  safelist: ['badge-primary', 'badge-info', 'badge-success', 'badge-warning', 'badge-danger', 'badge-gray', 'badge-accent'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e'
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        // Semantic surface colors (CSS variables, light/dark swap)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)'
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)'
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)'
        },
        // Status colors: fixed mapping (UI-P0-4)
        info: colors.sky,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.red,
        accent: colors.violet
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        chip: '0.375rem',
        control: '0.75rem',
        card: '1rem',
        panel: '1.25rem'
      },
      height: {
        'control-sm': '2rem',
        control: '2.5rem',
        'control-lg': '3rem'
      },
      minHeight: {
        'control-sm': '2rem',
        control: '2.5rem',
        'control-lg': '3rem'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        popover: '0 12px 32px -8px rgba(15, 23, 42, 0.18)',
        modal: '0 24px 64px -12px rgba(15, 23, 42, 0.28)',
        glow: '0 0 20px rgba(20, 184, 166, 0.25)'
      },
      fontSize: {
        xxs: ['0.6875rem', '1rem']
      },
      transitionDuration: {
        fast: '150ms'
      },
      zIndex: {
        topbar: '20',
        sidebar: '40',
        overlay: '50',
        drawer: '55',
        popover: '60',
        toast: '100'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } }
      }
    }
  },
  plugins: []
}
