/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{html,ts}',
    '../../packages/ui/**/*.{html,ts}',
  ],
  theme: {
    // ShenoInventory is a strict flat system: no elevation, depth or glow.
    // Emptying these keys removes the shadow utilities entirely.
    boxShadow: {},
    dropShadow: {},
    extend: {
      colors: {
        'deep-slate': '#0F172A',
        surface: '#1E293B',
        'electric-cyan': '#06B6D4',
        primary: '#06B6D4',
      },
      fontFamily: {
        heading: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
};
