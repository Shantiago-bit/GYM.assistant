// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { construirCohortes, construirEmbudo, conversion, retencionPromedio } from '@/lib/reglas/analiticaAdmin';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  estadisticasAnalitica: vi.fn(),
  registrarAuditoria: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/dataService', () => ({
  estadisticasAnalitica: mocks.estadisticasAnalitica,
  registrarAuditoria: mocks.registrarAuditoria,
}));

import { GET } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';
const pedir = (consulta = '') => GET(new Request(`http://localhost/api/admin/analitica/csv${consulta}`), undefined);

const comoAdmin = (rol: 'admin' | 'lectura' = 'admin') => {
  mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal: 'aal2' });
  mocks.obtenerAdministrador.mockResolvedValue({ rol, suspendido: false });
};

describe('GET /api/admin/analitica/csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.estadisticasAnalitica.mockImplementation(async (hoy: string, semanas: number) => {
      const datos = { registradas: 4, confirmadas: 3, conPerfil: 3, primeraSesion: 2, dosSemanas: 1 };
      const cohortes = construirCohortes([{ cohorte: '2026-11-09', registradas: 4, semana: 1, activas: 2 }], hoy, semanas);
      return { semanas, desde: cohortes[0]!.cohorte, embudo: construirEmbudo(datos), conversion: conversion(4, 2), cohortes, retencionPromedio: retencionPromedio(cohortes) };
    });
  });

  it('una persona que no administra → 404, sin datos ni auditoría', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'x@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect((await pedir()).status).toBe(404);
    expect(mocks.estadisticasAnalitica).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('sin verificación en dos pasos → 403', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal: 'aal1' });
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: false });
    expect((await pedir()).status).toBe(403);
  });

  it('el rol de lectura también exporta (ver no modifica datos); queda auditado con la sección y las semanas', async () => {
    comoAdmin('lectura');
    const respuesta = await pedir('?semanas=12');
    expect(respuesta.status).toBe(200);
    expect(mocks.estadisticasAnalitica).toHaveBeenCalledWith(expect.any(String), 12);
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({
      adminId: ADMIN,
      accion: 'exportar_csv',
      detalle: { seccion: 'analitica', semanas: 12 },
    });
  });

  it('CSV descargable solo con cifras y lunes; semanas inválidas → 8', async () => {
    comoAdmin();
    const respuesta = await pedir('?semanas=52');
    expect(mocks.estadisticasAnalitica).toHaveBeenCalledWith(expect.any(String), 8);
    expect(respuesta.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(respuesta.headers.get('Content-Disposition')).toMatch(/^attachment; filename="analitica-kairos-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
    const csv = await respuesta.text();
    expect(csv.split('\r\n')[0]).toBe('seccion,paso_o_cohorte,semana,personas,porcentaje,estado');
    expect(csv).toContain('embudo,primeraSesion,,2,50,');
    expect(csv).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});
