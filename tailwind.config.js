// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './App.tsx',
    './index.tsx'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Prompt', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        serif: ['Sarabun', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--primary-blue)',
          hover: 'var(--primary-medium)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--accent-peach)',
          hover: 'var(--accent-peach-hover)',
        },
        accent: {
          DEFAULT: 'var(--error-red)',
        },
        neutral: {
          light: 'var(--neutral-light)',
          DEFAULT: '#E0E0E0',
          dark: 'var(--neutral-gray)',
          medium: 'var(--neutral-gray)',
        },
        white: 'var(--white)',
        brandGreen: {
          DEFAULT: 'var(--success-green)',
          text: 'color-mix(in srgb, var(--success-green) 50%, black)',
        }
      }
    }
  },
  plugins: [],
};