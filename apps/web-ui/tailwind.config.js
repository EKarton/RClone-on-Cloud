/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'light', // Default light theme
      'dark', // Default dark theme
      'cupcake', // Additional themes if needed
    ],
    darkTheme: 'dark', // Set the default dark theme
  },
};
