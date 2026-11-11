import { describe, expect, it } from 'vitest';
import {
  ASUNTO_CONFIRMACION,
  ASUNTO_RECUPERACION,
  plantillaAutorizacionTutor,
  plantillaConfirmacion,
  plantillaRecuperacion,
} from './plantillasCorreo';

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

describe('plantillaAutorizacionTutor', () => {
  const datos = {
    nombre: 'Lucía Pérez',
    apodo: 'Lu',
    edad: 10,
    correoMenor: 'lu@ejemplo.com',
    enlace: 'https://gym.example/autorizar/abc123',
    venceEl: '18 de noviembre de 2026',
    dias: 7,
    urlPrivacidad: 'https://gym.example/privacidad',
    contacto: 'soporte@ejemplo.com',
  };

  it('lleva el asunto con el apodo, el plazo, los datos, Groq, los derechos y el enlace', () => {
    const { asunto, html } = plantillaAutorizacionTutor(datos);

    expect(asunto).toBe('Lu quiere crear una cuenta en Gym Assistant: necesitamos tu autorización');
    expect(html).toContain('Lu (10 años) quiere usar Gym Assistant.');
    expect(html).toContain('lu@ejemplo.com');
    expect(html).toContain('El enlace vence el 18 de noviembre de 2026</strong> (7 días)');
    expect(html).toContain('Qué datos guardamos');
    expect(html).toContain('se envían a Groq');
    expect(html).toContain('Ley 1581 de 2012');
    expect(html).toContain('mailto:soporte@ejemplo.com');
    expect(html).toContain('href="https://gym.example/privacidad"');
    expect(html.match(/href="https:\/\/gym\.example\/autorizar\/abc123"/g)).toHaveLength(2);
    expect(html).toContain('No autorizo');
  });

  it('sin correo de contacto, pide responder al correo', () => {
    expect(plantillaAutorizacionTutor({ ...datos, contacto: null }).html).toContain('respondiendo a este correo');
  });

  it('escapa el nombre, el apodo y el correo que escribió la persona', () => {
    const { html } = plantillaAutorizacionTutor({
      ...datos,
      nombre: '<img src=x onerror=alert(1)>',
      apodo: '<b>Lu</b>',
      correoMenor: '"x"@ejemplo.com',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>Lu</b>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;b&gt;Lu&lt;/b&gt; quiere crear una cuenta');
    expect(html).toContain('&quot;x&quot;@ejemplo.com');
  });
});
