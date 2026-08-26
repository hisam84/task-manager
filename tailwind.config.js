/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vercel: {
          bg: '#000000',
          card: '#0a0a0a',
          surface: '#111111',
          border: '#222222',
          hover: '#1a1a1a',
          gray: '#888888',
          lightgray: '#eaeaea',
          blue: '#0070f3',
          cyan: '#50e3c2',
          purple: '#7928ca',
          pink: '#ff0080',
          yellow: '#f5a623',
          red: '#ee0000',
          green: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'vercel-glow': '0 0 20px rgba(0, 112, 243, 0.15)',
        'vercel-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
