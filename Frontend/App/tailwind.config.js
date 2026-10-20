/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 🔥 مهم جدا

  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/ClientApp/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preline/dist/*.js"
  ],

  theme: {
    extend: {},
  },

  plugins: [],
}