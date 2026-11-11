import { describe, expect, it } from 'vitest';
import { ASUNTO_CONFIRMACION, ASUNTO_RECUPERACION, plantillaConfirmacion, plantillaRecuperacion } from './plantillasCorreo';

describe('plantillaRecuperacion', () => {
  it('incluye un botón y el enlace visible de respaldo', () => {
    const html = plantillaRecuperacion('https://gym.example/reset?token=abc&source=email');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Crear nueva contraseña');
    expect(html.match(/href="https:\/\/gym\.example\/reset\?token=abc&amp;source=email"/g)).toHaveLength(2);
    expect(html).toContain('https://gym.example/reset?token=abc&amp;source=email');
    expect(html).toContain('vence en 30 minutos');
  });

  it('explica los pasos y qué hacer si no se pidió el cambio', () => {
    const html = plantillaRecuperacion('https://gym.example/reset?token=abc');

    expect(html).toContain('mínimo 8 caracteres');
    expect(html).toContain('¿No fuiste tú?');
    expect(html).toContain(`<title>${ASUNTO_RECUPERACION}</title>`);
  });

  it('escapa un enlace con caracteres peligrosos', () => {
    const html = plantillaRecuperacion('https://gym.example/"><script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('plantillaConfirmacion', () => {
  it('usa el mismo diseño con el botón de confirmar y el enlace de respaldo', () => {
    const html = plantillaConfirmacion('https://gym.example/auth/confirmar?token_hash=abc&type=signup');

    expect(html).toContain(`<title>${ASUNTO_CONFIRMACION}</title>`);
    expect(html).toContain('¡Bienvenido a Gym Assistant!');
    expect(html).toContain('Confirmar mi cuenta');
    expect(html.match(/href="https:\/\/gym\.example\/auth\/confirmar\?token_hash=abc&amp;type=signup"/g)).toHaveLength(2);
    expect(html).toContain('¿No creaste esta cuenta?');
  });
});
