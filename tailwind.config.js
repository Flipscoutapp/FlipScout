/** @type {import('tailwindcss').Config} */
module.export = {
  content: [
    "./src/**/js,jsx,tx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          500: '#333333',
          600: '#262626',
          700: '#1a1a1a',
          800: '#0d0d0d',
          900: '#020202',
        },
      },
      borderRadius: {
        '24l': '1.5rem',
        '28l': '1.75rem',
        '36l': '2.25rem',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight .3s ease-out',
        'slide-up': 'slideUp .3s ease-out',
      },
    },
  },
  plugins: [],
};
