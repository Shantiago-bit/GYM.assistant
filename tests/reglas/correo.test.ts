// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { htmlATexto, limpiarError, mascaraCorreo, normalizarCorreo } from '@/lib/reglas/correo';

describe('máscara del destinatario', () => {
  it('deja el primer y el último carácter del usuario y el dominio completo', () => {
    expect(mascaraCorreo('daniel7@gmail.com')).toBe('d•••••7@gmail.com');
  });

  it('normaliza mayúsculas y espacios', () => {
    expect(normalizarCorreo('  Ana.Perez@Gmail.COM ')).toBe('ana.perez@gmail.com');
    expect(mascaraCorreo('  Ana.Perez@Gmail.COM ')).toBe('a•••••z@gmail.com');
  });

  it('con usuarios cortos no revela el usuario completo', () => {
    expect(mascaraCorreo('a@b.co')).toBe('a•••@b.co');
    expect(mascaraCorreo('ab@b.co')).toBe('a•••@b.co');
    expect(mascaraCorreo('sin-arroba')).toBe('•••');
  });
});

describe('limpiarError', () => {
  it('oculta los secretos (con y sin espacios) y recorta a 500 caracteres', () => {
    expect(limpiarError('auth abcdefgh falló', ['abcd efgh'])).toBe('auth [oculto] falló');
    expect(limpiarError('x'.repeat(800), [])).toHaveLength(500);
  });
});

describe('htmlATexto', () => {
  it('quita las etiquetas, decodifica entidades y deja los enlaces visibles', () => {
    const texto = htmlATexto(
      '<head><title>t</title></head><h1>Hola</h1><p>Uno &amp; dos &#9201;</p><a href="https://x.co/a">Ir &rarr;</a><br><a href="mailto:s@x.co">s@x.co</a>',
    );
    expect(texto).toBe('Hola\nUno & dos ⏱\nIr →: https://x.co/a\nmailto:s@x.co');
  });
});
