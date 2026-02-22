/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./server/**/*.mjs",
    "./src/**/*.{js,ts,mjs,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
