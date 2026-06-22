import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'b-blue': '#252B5F',
        'accent': '#3B6EF6',
        'gctu-gold': '#E7AD29',
        'gold-ink': '#5A4A1E',
        'page-bg': '#EEF1F8',
      },
    },
  },
  plugins: [],
};

export default config;
