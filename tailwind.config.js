/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        retro: {
          blue: '#00f2fe',
          pink: '#ff00e6',
          yellow: '#fbff00',
        },
        'retro-yellow': '#FFD700',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'bounce': 'bounce 1s infinite',
        'float': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-20px) translateX(10px)' },
          '50%': { transform: 'translateY(0) translateX(20px)' },
          '75%': { transform: 'translateY(20px) translateX(10px)' },
        },
      },
      fontFamily: {
        'press-start': ['"Press Start 2P"', 'cursive'],
      },
      fontSize: {
        'xs-dynamic': 'var(--font-size-xs, 0.75rem)',
        'sm-dynamic': 'var(--font-size-sm, 0.875rem)',
        'base-dynamic': 'var(--font-size-base, 1rem)',
        'lg-dynamic': 'var(--font-size-lg, 1.125rem)',
        'xl-dynamic': 'var(--font-size-xl, 1.25rem)',
      },
    },
  },
  plugins: [],
} 