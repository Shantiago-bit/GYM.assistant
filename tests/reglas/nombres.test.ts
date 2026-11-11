// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { esNombreOfensivo, normalizarNombre } from '@/lib/reglas/nombres';

describe('normalizarNombre', () => {
  it('pasa a minúsculas, quita tildes, traduce leetspeak y deja solo letras', () => {
    expect(normalizarNombre('Concepción')).toBe('concepcion');
    expect(normalizarNombre('P3nd3j0')).toBe('pendejo');
    expect(normalizarNombre('$@lud')).toBe('salud');
    expect(normalizarNombre('p.u-t_a')).toBe('puta');
    expect(normalizarNombre('m1erda')).toBe('mierda');
    expect(normalizarNombre('1ola', 'l')).toBe('lola');
  });
});

describe('esNombreOfensivo', () => {
  it.each([
    'puta',
    'Pendejo',
    'Juan Gonorrea',
    'malparido',
    'hijueputa',
    'Fuck',
    'marica',
    'maricón',
    'sudaca',
    'retrasado',
    'Hitler',
    'nigger',
    'faggot',
    'polla',
    'verga',
    'mierda',
  ])('bloquea "%s"', (nombre) => {
    expect(esNombreOfensivo(nombre)).toBe(true);
  });

  it.each([
    'PUUUUTA',
    'p.u.t.a',
    'p u t a',
    'p-e-n-d-e-j-o',
    'P3ND3J0',
    'm1erda',
    'h1jueputa',
    'f.u.c.k',
    'fuuuck',
    '$ud4c4',
    'malpa rido',
    'superhijueputa',
    'Maricón_',
  ])('bloquea la variante "%s"', (nombre) => {
    expect(esNombreOfensivo(nombre)).toBe(true);
  });

  it.each([
    'Santiago',
    'María José',
    'Concepción',
    'Concha',
    'Dick',
    'Dick Cumming',
    'Maricela',
    'Maricarmen',
    'Cassandra',
    'Ana L',
    'Pola',
    'Pera',
    'Sebastián',
    'Hancock',
    'Nazih',
    'Analía',
    'Shakespeare',
    'José De La Cruz',
    'Dani 2',
  ])('permite el nombre real "%s"', (nombre) => {
    expect(esNombreOfensivo(nombre)).toBe(false);
  });
});
