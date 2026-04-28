/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forge: { DEFAULT: '#e8a84c', dark: '#b07830' },
        mirror: { DEFAULT: '#7eb8d4', dark: '#5a90b0' },
        coach: { DEFAULT: '#7ec47e', dark: '#4a944e' },
        arena: { DEFAULT: '#c47eb8', dark: '#8a4a98' },
        ink: { 50: '#f0f0f8', 100: '#e0e0f0', 200: '#c0c0e0', 300: '#9090c0', 400: '#6060a0', 500: '#404080', 600: '#303070', 700: '#202060', 800: '#141440', 900: '#0a0a28', 950: '#050514' }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      }
    }
  },
  plugins: []
}
