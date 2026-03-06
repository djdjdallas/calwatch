/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        canvas: '#080808',
      },
      keyframes: {
        pulse_glow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(239,68,68,0.4)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(239,68,68,0.7)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse_glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
