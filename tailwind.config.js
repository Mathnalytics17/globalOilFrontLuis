/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        go: {
          canvas: '#111214',
          sidebar: '#151618',
          surface: '#191b1e',
          elevated: '#1e2024',
          hover: '#24272c',
          border: '#30343a',
          muted: '#969ca6',
          text: '#f3f4f6',
          red: '#ef2b32',
          'red-hover': '#d9232a',
        },
      },
      boxShadow: {
        'go-panel': '0 10px 30px rgba(0,0,0,.16)',
      },
    },
  },
  plugins: [],
};
