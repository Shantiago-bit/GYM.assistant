import { describe, expect, it } from 'vitest';
import { plantillaRecuperacion } from './plantillasCorreo';

describe('plantillaRecuperacion', () => {
  it('incluye un botón y el enlace visible de respaldo', () => {
    const html = plantillaRecuperacion('https://gym.example/reset?token=abc&source=email');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Crear nueva contraseña');
    expect(html.match(/href="https:\/\/gym\.example\/reset\?token=abc&amp;source=email"/g)).toHaveLength(2);
    expect(html).toContain('https://gym.example/reset?token=abc&amp;source=email');
    expect(html).toContain('vence en 30 minutos');
  });
});