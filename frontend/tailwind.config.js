/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '8xl': '6rem',
        '9xl': '8rem',
      },
    },
  },
  plugins: [],
}
