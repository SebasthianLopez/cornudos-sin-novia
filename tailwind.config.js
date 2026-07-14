/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080c',
          900: '#0e0e15',
          850: '#13131c',
          800: '#181822',
          700: '#22222f',
          600: '#2e2e3e',
          500: '#3a3a4d',
        },
        brand: {
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        neon: {
          pink: '#f0abfc',
          fuchsia: '#e879f9',
          cyan: '#22d3ee',
        },
        gold: '#fbbf24',
        silver: '#cbd5e1',
        bronze: '#d97706',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(168, 85, 247, 0.5)',
        'glow-sm': '0 0 12px -2px rgba(168, 85, 247, 0.45)',
        card: '0 8px 30px -12px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
        'sheet-up': 'sheet-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
