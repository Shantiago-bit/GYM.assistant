import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  listarEjercicios: vi.fn(),
  obtenerEjercicio: vi.fn(),
  obtenerResumen: vi.fn(),
  // Funciones que escriben: CHRONO nunca debe llamarlas.
  crearEjercicio: vi.fn(),
  actualizarEnfoque: vi.fn(),
  actualizarNivel: vi.fn(),
  archivarEjercicio: vi.fn(),
}));

vi.mock('@/lib/dataService', () => mocks);

import { compactar, ejecutarHerramienta, HERRAMIENTAS } from './herramientas';

const press = {
  id: 'e1',
  nombre: 'Press de banca',
  tipo: 'peso',
  enfoque: 'hipertrofia',
  metodo: 'rectas',
  rango: [8, 12],
  nivel: null,
  archivado: false,
  totalSesiones: 3,
};
const dominadas = { ...press, id: 'e2', nombre: 'Dominadas', tipo: 'calistenia', rango: [8, 15], nivel: 'Estricta' };

describe('compactar', () => {
  it('convierte los gramos a kilos y quita los campos vacíos, también en listas anidadas', () => {
    expect(
      compactar({ pesoRefGramos: 52500, nombre: 'Press', series: [{ reps: 8, pesoGramos: 50000 }, { pesoGramos: null }] }),
    ).toEqual({ pesoRefKg: 52.5, nombre: 'Press', series: [{ reps: 8, pesoKg: 50 }, {}] });
  });
});

describe('herramientas de consulta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declara las consultas y las propuestas, sin herramientas que escriban', () => {
    expect(HERRAMIENTAS.map((herramienta) => herramienta.function?.name)).toEqual([
      'listar_ejercicios',
      'ver_ejercicio',
      'resumen_periodo',
      'proponer_crear_ejercicio',
      'proponer_modificar_ejercicio',
      'proponer_archivar_ejercicio',
      'proponer_restaurar_ejercicio',
    ]);
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

  it('rechaza una herramienta desconocida, incluida una que escriba directamente', async () => {
    for (const nombre of ['crear_ejercicio', 'borrar_ejercicio']) {
      expect(await ejecutarHerramienta('cuenta-a', nombre, {})).toEqual({
        contenido: `No existe la herramienta ${nombre}.`,
        esError: true,
      });
    }
  });
});

describe('herramientas de propuesta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarEjercicios.mockResolvedValue([press]);
    mocks.obtenerEjercicio.mockImplementation(async (_cuenta: string, id: string) => ({
      ejercicio: id === 'e2' ? dominadas : press,
    }));
  });

  afterEach(() => {
    // Ninguna propuesta puede escribir en la base: el cambio lo aplica la persona con Confirmar.
    expect(mocks.crearEjercicio).not.toHaveBeenCalled();
    expect(mocks.actualizarEnfoque).not.toHaveBeenCalled();
    expect(mocks.actualizarNivel).not.toHaveBeenCalled();
    expect(mocks.archivarEjercicio).not.toHaveBeenCalled();
  });

  it('propone crear con los valores por defecto de la app, sin crear nada', async () => {
    const { propuesta, esError, contenido } = await ejecutarHerramienta('cuenta-a', 'proponer_crear_ejercicio', {
      nombre: ' Sentadilla ',
      tipo: 'peso',
      peso_ref_kg: 60,
      nivel: null,
    });

    expect(esError).toBe(false);
    expect(propuesta).toMatchObject({
      accion: 'crear',
      titulo: 'Crear «Sentadilla»',
      datos: { nombre: 'Sentadilla', tipo: 'peso', enfoque: 'hipertrofia', metodo: 'rectas', rangoMin: 8, rangoMax: 12, pesoRefKg: 60 },
    });
    expect(propuesta?.detalle).toContain('Rango: 8–12 repeticiones');
    expect(JSON.parse(contenido).estado).toContain('Todavía NO se aplicó');
    expect(mocks.listarEjercicios).toHaveBeenCalledWith('cuenta-a', { incluirArchivados: true });
  });

  it('si el nombre es de un ejercicio archivado, ofrece restaurarlo en lugar de crear otro', async () => {
    mocks.listarEjercicios.mockResolvedValue([{ ...press, nombre: 'Sentadilla', archivado: true }]);

    const resultado = await ejecutarHerramienta('cuenta-a', 'proponer_crear_ejercicio', {
      nombre: 'sentadilla',
      tipo: 'peso',
      peso_ref_kg: 60,
    });

    expect(resultado).toEqual({ contenido: 'Ya tienes «Sentadilla» archivado. ¿Quieres restaurarlo?', esError: true });
  });

  it('propone restaurar solo un ejercicio archivado, sin restaurarlo todavía', async () => {
    mocks.obtenerEjercicio.mockResolvedValue({ ejercicio: { ...press, archivado: true } });

    const { propuesta } = await ejecutarHerramienta('cuenta-a', 'proponer_restaurar_ejercicio', { ejercicio_id: 'e1' });

    expect(propuesta).toMatchObject({
      accion: 'restaurar',
      ejercicioId: 'e1',
      titulo: 'Restaurar «Press de banca»',
      detalle: ['Vuelve a tu lista de ejercicios.', 'Con todo su histórico: 3 sesiones.'],
    });

    mocks.obtenerEjercicio.mockResolvedValue({ ejercicio: press });
    const activo = await ejecutarHerramienta('cuenta-a', 'proponer_restaurar_ejercicio', { ejercicio_id: 'e1' });
    expect(activo).toEqual({ contenido: 'Ese ejercicio no está archivado: ya aparece en la lista.', esError: true });
  });

  it('no propone crear un ejercicio que ya existe', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'proponer_crear_ejercicio', {
      nombre: 'press de banca',
      tipo: 'peso',
      peso_ref_kg: 40,
    });

    expect(resultado).toEqual({ contenido: 'Ya existe un ejercicio con ese nombre.', esError: true });
  });

  it('no propone un método de peso para calistenia', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'proponer_crear_ejercicio', {
      nombre: 'Fondos',
      tipo: 'calistenia',
      metodo: 'piramide_invertida',
    });

    expect(resultado.esError).toBe(true);
    expect(resultado.propuesta).toBeUndefined();
  });

  it('al cambiar el enfoque sin rango, propone el rango típico del nuevo enfoque', async () => {
    const { propuesta } = await ejecutarHerramienta('cuenta-a', 'proponer_modificar_ejercicio', {
      ejercicio_id: 'e1',
      enfoque: 'fuerza',
    });

    expect(propuesta).toMatchObject({
      accion: 'modificar',
      ejercicioId: 'e1',
      enfoque: { enfoque: 'fuerza', metodo: 'rectas', rangoMin: 3, rangoMax: 5 },
      detalle: ['Enfoque: Hipertrofia → Fuerza', 'Rango: 8–12 → 3–5 repeticiones'],
    });
    expect(propuesta).not.toHaveProperty('nivel');
  });

  it('propone cambiar el nivel solo en calistenia', async () => {
    const { propuesta } = await ejecutarHerramienta('cuenta-a', 'proponer_modificar_ejercicio', {
      ejercicio_id: 'e2',
      nivel: 'Con lastre',
    });
    expect(propuesta).toMatchObject({ nivel: 'Con lastre', detalle: ['Nivel: Estricta → Con lastre'] });
    expect(propuesta).not.toHaveProperty('enfoque');

    const enPeso = await ejecutarHerramienta('cuenta-a', 'proponer_modificar_ejercicio', { ejercicio_id: 'e1', nivel: 'X' });
    expect(enPeso).toEqual({ contenido: 'Solo los ejercicios de calistenia tienen nivel.', esError: true });
  });

  it('no propone una modificación sin cambios', async () => {
    const resultado = await ejecutarHerramienta('cuenta-a', 'proponer_modificar_ejercicio', {
      ejercicio_id: 'e1',
      enfoque: 'hipertrofia',
    });

    expect(resultado.esError).toBe(true);
    expect(resultado.contenido).toContain('No hay cambios');
  });

  it('propone eliminar archivando y avisa que se conserva el historial', async () => {
    const { propuesta } = await ejecutarHerramienta('cuenta-a', 'proponer_archivar_ejercicio', { ejercicio_id: 'e1' });

    expect(propuesta).toMatchObject({
      accion: 'archivar',
      ejercicioId: 'e1',
      titulo: 'Archivar «Press de banca»',
      detalle: ['Deja de aparecer en tu lista de ejercicios; puedes restaurarlo cuando quieras.', 'Se conservan sus 3 sesiones y su historial.'],
    });
    expect(mocks.obtenerEjercicio).toHaveBeenCalledWith('cuenta-a', 'e1');
  });

  it('al eliminar un ejercicio sin sesiones lo dice tal cual', async () => {
    mocks.obtenerEjercicio.mockResolvedValue({ ejercicio: { ...press, totalSesiones: 0 } });

    const { propuesta } = await ejecutarHerramienta('cuenta-a', 'proponer_archivar_ejercicio', { ejercicio_id: 'e1' });

    expect(propuesta?.detalle).toContain('Todavía no tiene sesiones registradas.');
  });

  it('no propone cambios sobre un ejercicio de otra cuenta', async () => {
    mocks.obtenerEjercicio.mockRejectedValue(new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO'));

    const resultado = await ejecutarHerramienta('cuenta-a', 'proponer_archivar_ejercicio', { ejercicio_id: 'ajeno' });

    expect(resultado).toEqual({ contenido: 'El ejercicio no existe.', esError: true });
  });
});
