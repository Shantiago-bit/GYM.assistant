// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// El chat de CHRONO es position: fixed bajo el Pórtico. La entrada de las páginas de /gym (.anim-entrada) usa
// transform, que convertiría a la plantilla en su referencia y lo sacaría de lugar. La excepción para el chat debe
// ganarle también a las reglas por nivel (html[data-movimiento='completas'] .anim-entrada, más específicas): por
// eso lleva !important. Sin él, desde el movimiento expresivo el chat quedaba dentro del flujo y vacío.
describe('el chat queda fijo bajo el Pórtico en todos los niveles de movimiento', () => {
  it('la plantilla no se anima cuando contiene el chat, con !important', () => {
    const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8');
    expect(css).toMatch(/\.anim-entrada:has\(> \.chat-pantalla\)\s*\{\s*animation:\s*none\s*!important;\s*\}/);
    expect(css).toMatch(/\.chat-pantalla\s*\{\s*position:\s*fixed;/);
  });
});
