import { describe, expect, it } from 'vitest';
import {
  confirmacionValida,
  consultaAuditoria,
  consultaPersonas,
  csvPersonas,
  edadDesde,
  escaparComodines,
  esIdValido,
  fechaHoraBogota,
  leerFiltrosAuditoria,
  leerFiltrosPersonas,
  leerMarcaDeTiempo,
  motivoRechazo,
  resumirDetalle,
  sesionesPorSemana,
} from './personasAdmin';

const A = '00000000-0000-4000-8000-0000000000aa';
const B = '00000000-0000-4000-8000-0000000000bb';

describe('filtros de Personas en la URL', () => {
  it('lee lo válido y descarta lo demás', () => {
    expect(leerFiltrosPersonas({ estado: 'suspendida', desde: '2026-11-01', hasta: 'ayer', orden: 'sesiones', dir: 'asc', pagina: '3', q: ' ana ' })).toEqual({
      estado: 'suspendida',
      desde: '2026-11-01',
      hasta: null,
      q: 'ana',
      orden: 'sesiones',
      dir: 'asc',
      pagina: 3,
    });
    expect(leerFiltrosPersonas({ estado: 'borrada', orden: 'correo', pagina: '-2' })).toMatchObject({ estado: null, orden: 'registro', dir: 'desc', pagina: 1 });
  });

  it('arma la consulta sin los valores por defecto (ida y vuelta)', () => {
    const filtros = leerFiltrosPersonas({ estado: 'confirmada', q: 'a b', orden: 'apodo' });
    expect(consultaPersonas(filtros)).toBe('?estado=confirmada&q=a+b&orden=apodo');
    expect(consultaPersonas(filtros, { pagina: 2, dir: 'asc' })).toBe('?estado=confirmada&q=a+b&orden=apodo&dir=asc&pagina=2');
    expect(consultaPersonas(leerFiltrosPersonas({}))).toBe('');
    expect(leerFiltrosPersonas(Object.fromEntries(new URLSearchParams(consultaPersonas(filtros, { pagina: 4 }).slice(1))))).toEqual({ ...filtros, pagina: 4 });
  });

  it('los comodines de ILIKE se buscan tal cual', () => {
    expect(escaparComodines('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});

describe('CSV de Personas', () => {
  it('solo columnas no personales', () => {
    const csv = csvPersonas([{ estado: 'confirmada', registro: '2026-11-01', ultimaActividad: null, ejercicios: 2, sesiones: 5, racha: 1, modoAvanzado: true }]);
    expect(csv).toBe('estado,fecha_registro,ultima_actividad,ejercicios,sesiones,racha_actual,modo\nconfirmada,2026-11-01,,2,5,1,avanzado\n');
    expect(csv).not.toMatch(/\b(correo|nombre|apodo|id)\b/);
  });
});

describe('acciones sobre una persona', () => {
  it('nunca sobre la propia cuenta ni sobre otra de administración', () => {
    expect(motivoRechazo({ adminId: A, objetivoId: A, objetivoEsAdmin: true })).toMatch(/propia cuenta/);
    expect(motivoRechazo({ adminId: A, objetivoId: B, objetivoEsAdmin: true })).toMatch(/administración/);
    expect(motivoRechazo({ adminId: A, objetivoId: B, objetivoEsAdmin: false })).toBeNull();
  });

  it('para eliminar hay que escribir el correo completo', () => {
    expect(confirmacionValida(' Persona@Example.com ', 'persona@example.com')).toBe(true);
    expect(confirmacionValida('persona@example', 'persona@example.com')).toBe(false);
    expect(confirmacionValida(undefined, 'persona@example.com')).toBe(false);
    expect(confirmacionValida('', '')).toBe(false);
  });

  it('el id de la URL tiene que ser un UUID', () => {
    expect(esIdValido(A)).toBe(true);
    expect(esIdValido("1' OR 1=1")).toBe(false);
  });
});

describe('auditoría', () => {
  it('filtros: admin con UUID y acción conocida', () => {
    expect(leerFiltrosAuditoria({ admin: A, accion: 'suspender', desde: '2026-11-01', pagina: '2' })).toEqual({
      adminId: A,
      accion: 'suspender',
      desde: '2026-11-01',
      hasta: null,
      pagina: 2,
    });
    expect(leerFiltrosAuditoria({ admin: 'x', accion: 'drop table' })).toMatchObject({ adminId: null, accion: null });
    expect(consultaAuditoria(leerFiltrosAuditoria({ accion: 'ver_usuario' }), { pagina: 3 })).toBe('?accion=ver_usuario&pagina=3');
  });

  it('el detalle se resume en una línea sin los vacíos', () => {
    expect(resumirDetalle({ reporte: 'personas', filas: 25, estado: null, origen_vista: 'panel' })).toBe('reporte: personas · filas: 25 · origen vista: panel');
    expect(resumirDetalle(null)).toBe('');
  });

  it('fechas de Postgres en hora de Bogotá', () => {
    expect(leerMarcaDeTiempo('2026-11-24 15:04:05.123+00').toISOString()).toBe('2026-11-24T15:04:05.123Z');
    expect(fechaHoraBogota('2026-11-24 15:04:05+00')).toMatch(/24\/11\/2026.*10:04/);
    expect(fechaHoraBogota(null)).toBe('—');
    expect(fechaHoraBogota('no es fecha')).toBe('—');
  });
});

describe('actividad', () => {
  it('sesiones por semana, de lunes a domingo, de la más antigua a la actual', () => {
    // 2026-11-24 es martes: la semana actual empieza el lunes 23.
    const semanas = sesionesPorSemana(['2026-11-23', '2026-11-24', '2026-11-22', '2026-09-01'], '2026-11-24', 3);
    expect(semanas).toEqual([
      { lunes: '2026-11-09', sesiones: 0 },
      { lunes: '2026-11-16', sesiones: 1 },
      { lunes: '2026-11-23', sesiones: 2 },
    ]);
  });

  it('la edad, no la fecha de nacimiento', () => {
    expect(edadDesde('2010-11-25', '2026-11-24')).toBe(15);
    expect(edadDesde('2010-11-24', '2026-11-24')).toBe(16);
  });
});
