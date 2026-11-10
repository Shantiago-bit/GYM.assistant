import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  listarEjercicios: vi.fn(),
  obtenerEjercicio: vi.fn(),
  obtenerResumen: vi.fn(),
  crearEjercicio: vi.fn(),
}));

vi.mock('@/lib/dataService', () => mocks);

import { compactar, ejecutarHerramienta, HERRAMIENTAS } from './herramientas';

describe('compactar', () => {
  it('convierte los gramos a kilos y quita los campos vacíos, también en listas anidadas', () => {
    expect(
      compactar({ pesoRefGramos: 52500, nombre: 'Press', series: [{ reps: 8, pesoGramos: 50000 }, { pesoGramos: null }] }),
    ).toEqual({ pesoRefKg: 52.5, nombre: 'Press', series: [{ reps: 8, pesoKg: 50 }, {}] });
  });
});

describe('ejecutarHerramienta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declara las herramientas de consulta y la de crear ejercicios', () => {
    expect(HERRAMIENTAS.map((herramienta) => herramienta.function?.name)).toEqual([
      'listar_ejercicios',
      'ver_ejercicio',
      'resumen_periodo',
      'crear_ejercicio',
    ]);
  });

  it('crea el ejercicio en la cuenta de la sesión, con los datos traducidos al formato de la app', async () => {
    mocks.crearEjercicio.mockResolvedValue({ id: 'nuevo' });

    const resultado = await ejecutarHerramienta('cuenta-a', 'crear_ejercicio', {
      nombre: '  Press banca ',
      tipo: 'peso',
      enfoque: 'fuerza',
      peso_ref_kg: 60,
      rango_min: 3,
      rango_max: 5,
      usuario_id: 'cuenta-b',
    });

    expect(mocks.crearEjercicio).toHaveBeenCalledWith('cuenta-a', {
      nombre: 'Press banca',
      tipo: 'peso',
      enfoque: 'fuerza',
      pesoRefKg: 60,
      rangoMin: 3,
      rangoMax: 5,
    });
    expect(resultado).toEqual({
      contenido: '{"creado":true,"id":"nuevo","nombre":"Press banca"}',
      esError: false,
    });
  });

  it('no crea un ejercicio con datos inválidos', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'crear_ejercicio', { nombre: 'Dominadas', tipo: 'cardio' });

    expect(resultado.esError).toBe(true);
    expect(mocks.crearEjercicio).not.toHaveBeenCalled();
  });

  it('devuelve como error una regla de negocio al crear', async () => {
    mocks.crearEjercicio.mockRejectedValue(
      new ErrorDeNegocio('DATOS_INVALIDOS', 'Ese método de series solo está disponible para ejercicios de peso.'),
    );

    const resultado = await ejecutarHerramienta('cuenta-a', 'crear_ejercicio', {
      nombre: 'Dominadas',
      tipo: 'calistenia',
      metodo: 'cluster',
    });

    expect(resultado).toEqual({
      contenido: 'Ese método de series solo está disponible para ejercicios de peso.',
      esError: true,
    });
  });

  it('consulta siempre con la cuenta de la sesión', async () => {
    mocks.listarEjercicios.mockResolvedValue([{ id: 'e1', pesoRefGramos: 60000 }]);

    const resultado = await ejecutarHerramienta('cuenta-a', 'listar_ejercicios', { usuario_id: 'cuenta-b' });

    expect(mocks.listarEjercicios).toHaveBeenCalledWith('cuenta-a', { incluirArchivados: false });
    expect(resultado).toEqual({ contenido: '[{"id":"e1","pesoRefKg":60}]', esError: false });
  });

  it('limita las sesiones del detalle de un ejercicio', async () => {
    const sesiones = Array.from({ length: 15 }, (_, indice) => ({ id: `s${indice}` }));
    mocks.obtenerEjercicio.mockResolvedValue({ ejercicio: { id: 'e1' }, sesiones });

    const { contenido } = await ejecutarHerramienta('cuenta-a', 'ver_ejercicio', { ejercicio_id: 'e1' });

    expect(mocks.obtenerEjercicio).toHaveBeenCalledWith('cuenta-a', 'e1');
    expect(JSON.parse(contenido).sesiones).toHaveLength(5);
  });

  it('devuelve como error una entrada inválida sin consultar la base', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'resumen_periodo', { desde: '2026-11-10', hasta: 'ayer' });

    expect(resultado.esError).toBe(true);
    expect(mocks.obtenerResumen).not.toHaveBeenCalled();
  });

  it('devuelve como error un ejercicio de otra cuenta', async () => {
    mocks.obtenerEjercicio.mockRejectedValue(new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO'));

    expect(await ejecutarHerramienta('cuenta-a', 'ver_ejercicio', { ejercicio_id: 'ajeno' })).toEqual({
      contenido: 'El ejercicio no existe.',
      esError: true,
    });
  });

  it('rechaza una herramienta desconocida', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'borrar_ejercicio', {});

    expect(resultado).toEqual({ contenido: 'No existe la herramienta borrar_ejercicio.', esError: true });
  });
});
