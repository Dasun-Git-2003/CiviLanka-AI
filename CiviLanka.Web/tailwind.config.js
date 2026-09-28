/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        gis: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          teal: '#22B3C2',
          amber: '#E8871E',
          indigo: '#6366F1',
          navy: '#0B1730',
          dark: '#070D1A',
          light: '#F6F8FB',
        },
        navy: {
          950: '#070D1A',
          900: '#0B1730',
          850: '#0B132B',
          800: '#0F1A30',
          750: '#13213D',
          700: '#17284B',
          600: '#1E3563',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        slate: {
          850: '#151e2e',
        }
      }
    },
  },
  plugins: [],
}

