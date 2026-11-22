import { isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import type { ResumenMes } from '@/lib/reglas/resumenMes';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerResumenMes: vi.fn(),
  obtenerPerfil: vi.fn(),
  dibujado: [] as unknown[],
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({ obtenerResumenMes: mocks.obtenerResumenMes, obtenerPerfil: mocks.obtenerPerfil }));
// En la prueba no se dibuja el PNG: se guarda lo que se iba a dibujar.
vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(elemento: unknown) {
      mocks.dibujado.push(elemento);
      super('png', { headers: { 'Content-Type': 'image/png' } });
    }
  },
}));

import { GET } from './route';

// Todo el texto de lo que se iba a dibujar.
function texto(nodo: unknown): string {
  if (nodo === null || nodo === undefined || typeof nodo === 'boolean') return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(texto).join(' ');
  if (isValidElement(nodo)) return texto((nodo.props as { children?: ReactNode }).children);
  return '';
}

const RESUMEN: ResumenMes = {
  mes: '2026-10',
  sesiones: 12,
  dias: 9,
  mejorRacha: 4,
  records: [{ ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-10-04', pesoGramos: 62500, reps: 9 }],
  totalRecords: 1,
  estrella: { ejercicioId: 'e1', nombre: 'Press de banca', sesiones: 6 },
  volumenKg: 5400,
  anterior: { sesiones: 9, dias: 7, volumenKg: 4000 },
};

const pedir = (consulta: string) => GET(new Request(`http://localhost/api/gym/mi-mes/imagen${consulta}`), undefined);

describe('GET /api/gym/mi-mes/imagen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dibujado.length = 0;
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@example.com' });
    mocks.obtenerResumenMes.mockResolvedValue(RESUMEN);
    mocks.obtenerPerfil.mockResolvedValue({ nombre: 'Ana Prueba', apodo: 'Ani' });
  });

  it('sin sesión responde 401 y no consulta nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    expect((await pedir('?mes=2026-10')).status).toBe(401);
    expect(mocks.obtenerResumenMes).not.toHaveBeenCalled();
  });

  it('siempre usa la cuenta de la sesión: no hay forma de pedir la de otra', async () => {
    const respuesta = await pedir('?mes=2026-10&usuario=cuenta-b&id=cuenta-b&usuarioId=cuenta-b');
    expect(respuesta.status).toBe(200);
    expect(mocks.obtenerResumenMes).toHaveBeenCalledWith('cuenta-a', '2026-10');
  });

  it('por defecto: sin pesos, sin nombre ni correo; con días, racha, récords y ejercicio estrella', async () => {
    await pedir('?mes=2026-10');
    const dibujo = texto(mocks.dibujado[0]);
    expect(dibujo).toContain('Mi mes en el gym');
    expect(dibujo).toContain('9 días entrenados');
    expect(dibujo).toContain('4 días de racha');
    expect(dibujo).toContain('1 récord personal');
    expect(dibujo).toContain('Press de banca');
    expect(dibujo).not.toMatch(/kg/);
    expect(dibujo).not.toMatch(/Ani|Ana|example\.com/);
    expect(mocks.obtenerPerfil).not.toHaveBeenCalled();
  });

  it('con los interruptores: el apodo y los pesos de los récords', async () => {
    await pedir('?mes=2026-10&apodo=1&pesos=1');
    const dibujo = texto(mocks.dibujado[0]);
    expect(dibujo).toContain('El mes de Ani en el gym');
    expect(dibujo).toContain('Press de banca: 62,5 kg × 9');
    expect(dibujo).not.toMatch(/Ana Prueba|example\.com/);
  });

  it('un mes inválido o futuro responde 400', async () => {
    expect((await pedir('?mes=2026-13')).status).toBe(400);
    expect((await pedir('?mes=2999-01')).status).toBe(400);
  });
});
