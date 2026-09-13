/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F9F4',
          100: '#EAF7EF',
          200: '#C8E8D5',
          300: '#94D3B0',
          400: '#52B482',
          DEFAULT: '#198754', // Primary Green
          dark: '#146C43',    // Dark Green
          darker: '#0F5132',
          900: '#0B3B24'
        },
        bodytext: '#212529',
        darkbg: {
          DEFAULT: '#0F1713',
          card: '#16231D',
          cardAlt: '#1C2E26',
          border: '#294337'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(20, 108, 67, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'dark-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(25, 135, 84, 0.1)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
