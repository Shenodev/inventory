/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{html,ts}',
    '../../packages/ui/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-slate': '#080E1E',
        'deep-slate-2': '#0B1224',
        surface: '#111E32',
        'surface-2': '#162845',
        'surface-3': '#1B3458',
        line: 'rgba(255,255,255,0.07)',
        'line-strong': 'rgba(255,255,255,0.11)',
        'electric-cyan': '#22D3EE',
        'electric-cyan-strong': '#06B6D4',
        primary: '#22D3EE',
        amber: '#F59E0B',
        emerald: '#10B981',
      },
      fontFamily: {
        heading: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'card': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -16px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.4)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.09) inset, 0 16px 40px -18px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.45)',
        'inset': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
