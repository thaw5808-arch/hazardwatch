/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hazard: {
          safe: '#22c55e', low: '#84cc16', moderate: '#eab308',
          high: '#f97316', critical: '#ef4444', emergency: '#7c3aed',
        }
      }
    }
  },
  plugins: [],
};
