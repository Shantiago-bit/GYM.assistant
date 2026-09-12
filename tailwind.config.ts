import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.25)',
      },
      colors: {
        accent: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
