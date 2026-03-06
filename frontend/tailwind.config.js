module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Unbounded', 'Orbitron', 'sans-serif'],
        body: ['JetBrains Mono', 'Rajdhani', 'monospace'],
        ui: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        void: {
          DEFAULT: '#000000',
          paper: '#050505',
          subtle: '#0A0A0A',
        },
        accent: 'var(--accent-color)',
      },
    },
  },
  plugins: [],
};
