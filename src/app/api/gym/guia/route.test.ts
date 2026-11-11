import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const ESTADO = { bienvenidaVista: false, guiaCompletada: false, primerosPasosOcultos: false };
const DATOS = {
  ejercicios: 1,
  conPruebaInicial: true,
  sesiones: 0,
  maxSesionesPorEjercicio: 0,
  entrenamientoConVarios: false,
  usoChat: false,
};

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerEstadoGuia: vi.fn(),
  obtenerDatosPrimerosPasos: vi.fn(),
  marcarBienvenidaVista: vi.fn(),
  marcarGuiaCompletada: vi.fn(),
  cambiarPrimerosPasosOcultos: vi.fn(),
  reiniciarGuia: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerEstadoGuia: mocks.obtenerEstadoGuia,
  obtenerDatosPrimerosPasos: mocks.obtenerDatosPrimerosPasos,
  marcarBienvenidaVista: mocks.marcarBienvenidaVista,
  marcarGuiaCompletada: mocks.marcarGuiaCompletada,
  cambiarPrimerosPasosOcultos: mocks.cambiarPrimerosPasosOcultos,
  reiniciarGuia: mocks.reiniciarGuia,
}));

import { GET, PATCH } from './route';

function patch(cuerpo: unknown) {
  return new Request('http://localhost/api/gym/guia', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

describe('/api/gym/guia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.obtenerEstadoGuia.mockResolvedValue(ESTADO);
    mocks.obtenerDatosPrimerosPasos.mockResolvedValue(DATOS);
    for (const accion of [
      mocks.marcarBienvenidaVista,
      mocks.marcarGuiaCompletada,
      mocks.cambiarPrimerosPasosOcultos,
      mocks.reiniciarGuia,
    ]) {
      accion.mockResolvedValue({ ...ESTADO, bienvenidaVista: true });
    }
  });

  it('sin sesión responde 401', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await GET(new Request('http://localhost/api/gym/guia'), undefined)).status).toBe(401);
    expect((await PATCH(patch({ accion: 'completar' }), undefined)).status).toBe(401);
    expect(mocks.marcarGuiaCompletada).not.toHaveBeenCalled();
  });

  it('GET devuelve el estado y los primeros pasos de la cuenta de la sesión', async () => {
    const respuesta = await GET(new Request('http://localhost/api/gym/guia'), undefined);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(mocks.obtenerEstadoGuia).toHaveBeenCalledWith('cuenta-a');
    expect(mocks.obtenerDatosPrimerosPasos).toHaveBeenCalledWith('cuenta-a');
    expect(cuerpo.datos.estado).toEqual(ESTADO);
    expect(cuerpo.datos.primerosPasos).toMatchObject({ completados: 2, total: 6 });
  });

  it('rechaza una acción inválida con 400', async () => {
    for (const cuerpo of [{ accion: 'borrar_todo' }, {}, { accion: 3 }]) {
      expect((await PATCH(patch(cuerpo), undefined)).status).toBe(400);
    }
  });

  it.each([
    ['bienvenida_vista', mocks.marcarBienvenidaVista, ['cuenta-a']],
    ['completar', mocks.marcarGuiaCompletada, ['cuenta-a']],
    ['ocultar_pasos', mocks.cambiarPrimerosPasosOcultos, ['cuenta-a', true]],
    ['mostrar_pasos', mocks.cambiarPrimerosPasosOcultos, ['cuenta-a', false]],
    ['reiniciar', mocks.reiniciarGuia, ['cuenta-a']],
  ])('PATCH %s aplica la acción a la cuenta de la sesión', async (accion, funcion, argumentos) => {
    const respuesta = await PATCH(patch({ accion, usuarioId: 'cuenta-b' }), undefined);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(funcion).toHaveBeenCalledWith(...argumentos);
    expect(cuerpo.datos.estado.bienvenidaVista).toBe(true);
  });
});
