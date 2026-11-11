import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const ESTADO = { ofertaVista: false, recorridos: {} };
const EJERCICIOS = { sinPrueba: 'e1', conPrueba: null };

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerEstadoGuia: vi.fn(),
  obtenerEjerciciosGuia: vi.fn(),
  marcarOfertaVista: vi.fn(),
  guardarRecorrido: vi.fn(),
  reiniciarGuia: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerEstadoGuia: mocks.obtenerEstadoGuia,
  obtenerEjerciciosGuia: mocks.obtenerEjerciciosGuia,
  marcarOfertaVista: mocks.marcarOfertaVista,
  guardarRecorrido: mocks.guardarRecorrido,
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
    mocks.obtenerEjerciciosGuia.mockResolvedValue(EJERCICIOS);
    for (const accion of [mocks.marcarOfertaVista, mocks.guardarRecorrido, mocks.reiniciarGuia]) {
      accion.mockResolvedValue({ ofertaVista: true, recorridos: { inicio: { estado: 'en_curso', paso: 2 } } });
    }
  });

  it('sin sesión responde 401 y no toca nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await GET(new Request('http://localhost/api/gym/guia'), undefined)).status).toBe(401);
    expect((await PATCH(patch({ accion: 'oferta_vista' }), undefined)).status).toBe(401);
    expect(mocks.marcarOfertaVista).not.toHaveBeenCalled();
  });

  it('GET devuelve el estado y los ejercicios de la cuenta de la sesión', async () => {
    const respuesta = await GET(new Request('http://localhost/api/gym/guia'), undefined);

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toEqual({ ...ESTADO, ejercicios: EJERCICIOS });
    expect(mocks.obtenerEstadoGuia).toHaveBeenCalledWith('cuenta-a');
    expect(mocks.obtenerEjerciciosGuia).toHaveBeenCalledWith('cuenta-a');
  });

  it('rechaza una acción inválida con 400', async () => {
    for (const cuerpo of [
      {},
      { accion: 'borrar_todo' },
      { accion: 'recorrido', recorrido: 'otro', estado: 'en_curso', paso: 0 },
      { accion: 'recorrido', recorrido: 'inicio', estado: 'terminado', paso: 0 },
      { accion: 'recorrido', recorrido: 'inicio', estado: 'en_curso', paso: -1 },
      { accion: 'recorrido', recorrido: 'inicio', estado: 'en_curso', paso: 1.5 },
    ]) {
      expect((await PATCH(patch(cuerpo), undefined)).status).toBe(400);
    }
    expect(mocks.guardarRecorrido).not.toHaveBeenCalled();
  });

  it('guarda el progreso de un recorrido en la cuenta de la sesión, aunque el cuerpo traiga otra', async () => {
    const respuesta = await PATCH(
      patch({ accion: 'recorrido', recorrido: 'inicio', estado: 'en_curso', paso: 2, usuarioId: 'cuenta-b' }),
      undefined,
    );

    expect(respuesta.status).toBe(200);
    expect(mocks.guardarRecorrido).toHaveBeenCalledWith('cuenta-a', 'inicio', { estado: 'en_curso', paso: 2 });
    expect((await respuesta.json()).datos.recorridos.inicio).toEqual({ estado: 'en_curso', paso: 2 });
  });

  it.each([
    ['oferta_vista', mocks.marcarOfertaVista],
    ['reiniciar', mocks.reiniciarGuia],
  ])('PATCH %s se aplica a la cuenta de la sesión', async (accion, funcion) => {
    expect((await PATCH(patch({ accion }), undefined)).status).toBe(200);
    expect(funcion).toHaveBeenCalledWith('cuenta-a');
  });
});
