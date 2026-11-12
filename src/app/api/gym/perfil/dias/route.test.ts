// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaDatosPersonales, esquemaDias } from '@/lib/validacion/esquemas';

const mocks = vi.hoisted(() => ({ exigirSesion: vi.fn(), guardarDias: vi.fn(), marcarAvisoDiasVisto: vi.fn() }));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({ guardarDias: mocks.guardarDias, marcarAvisoDiasVisto: mocks.marcarAvisoDiasVisto }));

import { POST as guardar } from './route';
import { POST as avisoVisto } from './aviso/route';

const pedido = (cuerpo: unknown) =>
  guardar(
    new Request('http://localhost/api/gym/perfil/dias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    undefined,
  );

describe('validación de los días', () => {
  it('0 días, repetidos o fuera de 1–7 son inválidos; 7 días es válido', () => {
    expect(esquemaDias.safeParse([]).error?.issues[0]?.message).toBe('Elige al menos un día');
    expect(esquemaDias.safeParse([1, 1]).success).toBe(false);
    expect(esquemaDias.safeParse([0]).success).toBe(false);
    expect(esquemaDias.safeParse([8]).success).toBe(false);
    expect(esquemaDias.safeParse([1.5]).success).toBe(false);
    expect(esquemaDias.safeParse([1, 2, 3, 4, 5, 6, 7]).success).toBe(true);
  });

  it('el paso 1 del registro exige los días', () => {
    const datos = { nombre: 'Ana', fechaNacimiento: '1998-04-02', genero: 'mujer' };
    expect(esquemaDatosPersonales.safeParse(datos).success).toBe(false);
    expect(esquemaDatosPersonales.safeParse({ ...datos, dias: [1, 3, 5] }).success).toBe(true);
  });
});

describe('POST /api/gym/perfil/dias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.guardarDias.mockImplementation(async (_id: string, dias: number[]) => [...dias].sort());
  });

  it('sin sesión responde 401 y no guarda', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    expect((await pedido({ dias: [1, 3, 5] })).status).toBe(401);
    expect((await avisoVisto(new Request('http://localhost/api/gym/perfil/dias/aviso', { method: 'POST' }), undefined)).status).toBe(401);
    expect(mocks.guardarDias).not.toHaveBeenCalled();
  });

  it('un cuerpo inválido responde 400', async () => {
    expect((await pedido({ dias: [] })).status).toBe(400);
    expect((await pedido({ dias: [2, 2] })).status).toBe(400);
    expect((await pedido({ dias: [9] })).status).toBe(400);
    expect((await pedido({})).status).toBe(400);
    expect(mocks.guardarDias).not.toHaveBeenCalled();
  });

  it('guarda los días de la cuenta de la sesión', async () => {
    const respuesta = await pedido({ dias: [5, 1, 3] });
    expect(respuesta.status).toBe(200);
    expect(mocks.guardarDias).toHaveBeenCalledWith('cuenta-a', [5, 1, 3]);
    expect((await respuesta.json()).datos).toEqual({ dias: [1, 3, 5] });
  });

  it('el aviso de los días se marca como visto para la cuenta de la sesión', async () => {
    const respuesta = await avisoVisto(new Request('http://localhost/api/gym/perfil/dias/aviso', { method: 'POST' }), undefined);
    expect(respuesta.status).toBe(200);
    expect(mocks.marcarAvisoDiasVisto).toHaveBeenCalledWith('cuenta-a');
  });
});
