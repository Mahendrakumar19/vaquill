/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'courtroom': {
          'dark': '#1a1a2e',
          'judge': '#8b5a3c',
          'accent': '#d4af37',
          'plaintiff': '#2c5282',
          'defendant': '#742a2a',
        }
      },
      fontFamily: {
        'legal': ['Crimson Text', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
