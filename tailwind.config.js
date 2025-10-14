/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
     "./pages/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}", // ← AÑADE ESTA LÍNEA
    "./components/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
