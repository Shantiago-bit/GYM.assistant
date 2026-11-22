import type { Config } from 'tailwindcss';

// Todos los colores salen de las variables CSS de src/app/globals.css: para cambiar la paleta se edita ese archivo.
const variable = (nombre: string) => `var(--color-${nombre})`;

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      borderRadius: {
        boton: '12px',
        tarjeta: '16px',
        // Alias de los controles y botones (12 px). Se usa en todos los componentes anteriores a los tokens nuevos.
        gym: '12px',
      },
      boxShadow: {
        // Sombras teñidas de morado en lugar de grises.
        suave: `0 8px 24px color-mix(in srgb, ${variable('primario')} 10%, transparent)`,
        elevada: `0 16px 40px color-mix(in srgb, ${variable('primario')} 16%, transparent)`,
        // Nombre anterior de la sombra de menús y burbujas: igual a "elevada".
        soft: `0 16px 40px color-mix(in srgb, ${variable('primario')} 16%, transparent)`,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        titulos: ['var(--font-titulos)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // h1: 28–32 px; h2: 20–22 px. Con tracking ligeramente negativo.
        'titulo-1': ['clamp(1.75rem, 1.55rem + 0.8vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'titulo-2': ['clamp(1.25rem, 1.18rem + 0.3vw, 1.375rem)', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
      },
      colors: {
        primario: {
          DEFAULT: variable('primario'),
          fuerte: variable('primario-fuerte'),
          suave: variable('primario-suave'),
        },
        lavanda: variable('lavanda'),
        acento: variable('acento'),
        subir: variable('subir'),
        mantener: variable('mantener'),
        descarga: variable('descarga'),
        peso: variable('peso'),
        calistenia: variable('calistenia'),
        peligro: {
          DEFAULT: variable('peligro'),
          suave: variable('peligro-suave'),
        },
        aviso: {
          DEFAULT: variable('aviso'),
          suave: variable('aviso-suave'),
        },
        exito: {
          DEFAULT: variable('exito'),
          suave: variable('exito-suave'),
        },
        fondo: variable('fondo'),
        superficie: variable('superficie'),
        texto: {
          DEFAULT: variable('texto'),
          suave: variable('texto-suave'),
        },
        borde: variable('borde'),
      },
    },
  },
  plugins: [],
};

export default config;
