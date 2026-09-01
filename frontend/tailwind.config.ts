import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf9',
          100: '#d1faef',
          200: '#a7f3df',
          300: '#6ee7cb',
          400: '#34d3b2',
          500: '#13b89a',
          600: '#0b947d',
          700: '#0b7767',
          800: '#0d5f54',
          900: '#0e4e46',
          950: '#052f2c',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.045)',
        raised: '0 18px 48px rgba(15, 23, 42, 0.11)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(3px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
