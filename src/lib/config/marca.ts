// Identidad visible de la app. Todo texto que nombre la app usa estas constantes; los identificadores internos
// (paquete, tablas, variables de entorno, rutas, repositorio y dominio) conservan el nombre anterior a propósito
// (ver README, sección «Marca»).
export const NOMBRE_APP = 'Agón';
export const LOGOTIPO = 'AGÓN';
export const LEMA = 'Tu lucha, tu progreso';
export const SLUG_APP = 'agon';

// color-fijo: el theme-color del navegador (barra del navegador en el celular) no puede leer variables CSS.
// Es el fondo de la app (--color-fondo de src/app/globals.css), para que la barra se funda con ella;
// tests/visual/colores.test.ts lo comprueba.
export const COLOR_MARCA = '#0d0918';

// El fondo radial de la baldosa (--marca-baldosa de globals.css), para las imágenes que se dibujan en el servidor
// (ícono de Apple), que tampoco leen variables CSS.
export const BALDOSA_FIJA = 'radial-gradient(circle at 30% 18%, #4a2d96 0%, #24164a 38%, #0b0814 78%)';
