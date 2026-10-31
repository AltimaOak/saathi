/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1B3F',
          dark: '#07122B',
          light: '#162C5B',
        },
        royal: {
          DEFAULT: '#002970',
          hover: '#001E54',
        },
        sky: {
          DEFAULT: '#00B9F5',
          dark: '#0095C7',
          light: '#E1F6FD',
          tint: '#F0F9FE',
        },
        yellow: {
          DEFAULT: '#FFC845',
          hover: '#F5B925',
          light: '#FFF8DB',
        },
        'soft-blue': '#EAF4FD',
        'soft-white': '#F8FBFE',
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'hard': '4px 4px 0px #0B1B3F',
        'hard-sm': '2px 2px 0px #0B1B3F',
        'hard-lg': '6px 6px 0px #0B1B3F',
        'hard-xl': '8px 8px 0px #0B1B3F',
        'hard-yellow': '4px 4px 0px #FFC845',
        'hard-sky': '4px 4px 0px #00B9F5',
      },
      borderRadius: {
        'card': '18px',
      }
    },
  },
  plugins: [],
}

