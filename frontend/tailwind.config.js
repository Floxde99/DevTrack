/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        // Stitch: DevTrack Dark Amber High-Contrast
        surface: '#17130a',
        background: '#17130a',
        'surface-container-lowest': '#120e06',
        'surface-container-low': '#201b11',
        'surface-container': '#241f15',
        'surface-container-high': '#2f291f',
        'surface-container-highest': '#3a3429',
        'on-surface': '#ece1d1',
        'on-surface-variant': '#d3c5ac',
        outline: '#9c8f79',
        'outline-variant': '#4f4633',
        primary: '#ffe1a7',
        'on-primary': '#402d00',
        'primary-container': '#fbbf24',
        'on-primary-container': '#6c4f00',
        secondary: '#ffb95f',
        'on-secondary': '#472a00',
        'secondary-container': '#ee9800',
        'on-secondary-container': '#5b3800',
        live: '#4ade80',
        danger: '#ffb4ab',
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
      },
    },
  },
  plugins: [],
};
