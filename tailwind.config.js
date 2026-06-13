/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#05060B',
        accent: {
          cyan: '#22d3ee',
          purple: '#a855f7',
          orange: '#f59e0b',
          gold: '#f59e0b',
          pink: '#ec4899',
          yellow: '#eab308',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
