/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // This will include all JS/TS files in src
  ],
  theme: {
    extend: {
      scrollbar: {
        DEFAULT: {
          '::-webkit-scrollbar': { width: '8px' },
          '::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
          '::-webkit-scrollbar-thumb:hover': { background: '#555' },
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hidden': {
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          '-ms-overflow-style': 'none', /* IE and Edge */
          'scrollbar-width': 'none', /* Firefox */
        },
      });
    }),
  ],
}