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
        // En el tema oscuro las sombras negras no se ven: un borde sutil y un resplandor morado tenue.
        suave: '0 0 0 1px var(--color-borde), 0 8px 30px var(--sombra-resplandor)',
        elevada: '0 0 0 1px var(--color-borde-fuerte), 0 12px 40px var(--sombra-resplandor-fuerte)',
        // Nombre anterior de la sombra de menús y burbujas: igual a "elevada".
        soft: '0 0 0 1px var(--color-borde-fuerte), 0 12px 40px var(--sombra-resplandor-fuerte)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        titulos: ['var(--font-titulos)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        // Solo el logotipo «AGÓN» (Cinzel 700).
        marca: ['var(--font-marca)', 'Georgia', 'serif'],
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
        enlace: variable('enlace'),
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
        elevada: variable('elevada'),
        campo: variable('campo'),
        texto: {
          DEFAULT: variable('texto'),
          suave: variable('texto-suave'),
        },
        borde: {
          DEFAULT: variable('borde'),
          fuerte: variable('borde-fuerte'),
          campo: variable('borde-campo'),
        },
      },
      // En el tema oscuro el morado de los botones no alcanza 4,5:1 como texto: "text-primario" pinta el color de
      // enlace (9,5:1) y "text-primario-fuerte" el texto claro. El fondo (bg-primario) sigue siendo el morado.
      textColor: {
        primario: {
          DEFAULT: variable('enlace'),
          fuerte: variable('texto'),
          suave: variable('enlace'),
        },
      },
      // El foco y los anillos usan el lavanda (#b79cff), visible sobre el fondo oscuro.
      outlineColor: {
        primario: variable('lavanda'),
      },
      ringColor: {
        primario: {
          DEFAULT: variable('lavanda'),
          suave: variable('lavanda'),
        },
      },
      // Bordes que señalan un estado (activo, seleccionado, al pasar el mouse): el lavanda, que se distingue (3:1).
      borderColor: {
        primario: {
          DEFAULT: variable('lavanda'),
          fuerte: variable('lavanda'),
          suave: variable('borde-fuerte'),
        },
      },
    },
  },
  plugins: [],
};

export default config;
