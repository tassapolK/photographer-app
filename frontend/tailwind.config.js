/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6c63ff', dark: '#5a52d5' },
        dark: { DEFAULT: '#1a1a2e', card: '#16213e', surface: '#0f3460' },
      },
    },
  },
  plugins: [],
};
