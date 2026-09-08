/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Government-tech green + trust blue palette
        kisan: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#0f3d22',
        },
        soil: {
          50: '#faf6f0',
          100: '#f2e8d8',
          200: '#e4cfae',
          300: '#d2b183',
          400: '#c0925c',
          500: '#a97742',
          600: '#8a5e35',
          700: '#6d4a2d',
          800: '#573c28',
          900: '#4a3324',
        },
        trust: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 61, 34, 0.08), 0 1px 2px rgba(15, 61, 34, 0.06)',
        lift: '0 10px 30px -10px rgba(15, 61, 34, 0.18)',
      },
    },
  },
  plugins: [],
};
