import { queryAllByRole } from '@testing-library/react';
import axe from 'axe-core';

// Revisión básica, sin dependencias: imágenes sin texto alternativo, botones y enlaces sin nombre accesible
// y campos sin etiqueta. Devuelve una lista de problemas legibles (vacía si todo está bien).
export function revisarBasico(contenedor: HTMLElement): string[] {
  const problemas: string[] = [];
  const describir = (elemento: Element) => elemento.outerHTML.slice(0, 120);

  for (const imagen of contenedor.querySelectorAll('img:not([alt])')) {
    problemas.push(`imagen sin alt: ${describir(imagen)}`);
  }
  for (const svg of contenedor.querySelectorAll('svg:not([aria-hidden="true"])')) {
    const conNombre = svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby') || svg.querySelector('title');
    if (!conNombre) problemas.push(`svg sin aria-hidden ni nombre: ${describir(svg)}`);
  }
  for (const rol of ['button', 'link', 'menuitem', 'switch'] as const) {
    for (const elemento of queryAllByRole(contenedor, rol, { name: '' })) {
      problemas.push(`${rol} sin nombre accesible: ${describir(elemento)}`);
    }
  }
  for (const rol of ['textbox', 'spinbutton', 'combobox', 'checkbox', 'radio', 'searchbox'] as const) {
    for (const elemento of queryAllByRole(contenedor, rol, { name: '' })) {
      problemas.push(`${rol} sin etiqueta: ${describir(elemento)}`);
    }
  }
  return problemas;
}

// Reglas de axe-core que no aplican a un componente suelto en jsdom: el contraste necesita los estilos reales
// (se prueba aparte, en contraste.test.ts, y en el navegador), y las de página completa (landmarks, título,
// idioma, h1) dependen del layout.
const REGLAS_FUERA = ['color-contrast', 'region', 'page-has-heading-one', 'landmark-one-main', 'document-title', 'html-has-lang'];

export async function revisarConAxe(contenedor: HTMLElement): Promise<string[]> {
  // jsdom no tiene canvas (axe lo usa para detectar íconos en fuentes): sin esto avisa en la consola.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  const resultado = await axe.run(contenedor, {
    rules: Object.fromEntries(REGLAS_FUERA.map((regla) => [regla, { enabled: false }])),
    resultTypes: ['violations'],
  });
  return resultado.violations.map(
    (violacion) => `${violacion.id}: ${violacion.help} (${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(', ')})`,
  );
}
