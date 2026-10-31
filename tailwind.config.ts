import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      borderRadius: {
        gym: '10px',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.25)',
      },
      colors: {
        accent: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        primario: {
          DEFAULT: 'var(--color-primario)',
          suave: 'var(--color-primario-suave)',
        },
        subir: 'var(--color-subir)',
        mantener: 'var(--color-mantener)',
        peso: 'var(--color-peso)',
        calistenia: 'var(--color-calistenia)',
        fondo: 'var(--color-fondo)',
        superficie: 'var(--color-superficie)',
        texto: {
          DEFAULT: 'var(--color-texto)',
          suave: 'var(--color-texto-suave)',
        },
        borde: 'var(--color-borde)',
      },
    },
  },
  plugins: [],
};

export default config;
