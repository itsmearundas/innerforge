/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand — deep teal inspired by Aetrus logo
        brand: {
          950: '#040C10',
          900: '#071520',
          800: '#0D2030',
          700: '#122A3D',
          600: '#1A3D52',
          500: '#1E5068',
          400: '#2A6B85',
          300: '#3A8FA8',
          200: '#5AAFC8',
          100: '#8ACFE0',
        },
        // Copper accent — from AETRUS logo text
        copper: {
          DEFAULT: '#C8834A',
          dark: '#A86835',
          light: '#E0A070',
          glow: '#C8834A40',
        },
        // Surfaces
        surface: {
          base: '#040C10',
          card: '#071A24',
          elevated: '#0D2535',
          border: '#163040',
          hover: '#112030',
        },
        // Text
        ink: {
          primary: '#E8F4F6',
          secondary: '#7AAAB8',
          muted: '#3A6070',
          ghost: '#1E3840',
        }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: []
}