/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        diktemel: ['TTKBDikTemel-Normal', 'sans-serif'],
        'diktemel-normal': ['TTKBDikTemel-Normal', 'sans-serif'],
        'diktemel-kilavuzlu': ['TTKBDikTemel-Kilavuzlu', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
