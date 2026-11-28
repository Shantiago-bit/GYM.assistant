// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  agruparCorreos,
  completarDias,
  consultaCorreos,
  enPalabras,
  leerFiltrosCorreos,
  leerPeriodoCorreos,
  MOTIVOS_OMISION,
  PROVEEDORES_CORREO,
  recortarError,
  RESULTADOS_ENVIO,
  tasaEntrega,
  TEXTO_MOTIVO_OMISION,
  TEXTO_RESULTADO_ENVIO,
  TEXTO_TIPO_CORREO,
  textoTasa,
  TIPOS_CORREO,
} from '@/lib/reglas/correosAdmin';

describe('las listas coinciden con los CHECK de registro_correos', () => {
  const migracion = readFileSync(join(process.cwd(), 'supabase/migrations/20261115000000_registro_correos.sql'), 'utf8');
  const valoresDe = (columna: string) => {
    const bloque = new RegExp(`${columna}\\s+TEXT[^,]*?CHECK \\(${columna} IN \\(([^)]*)\\)`, 's').exec(migracion)?.[1] ?? '';
    return [...bloque.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  };

  it('tipo, resultado, motivo y proveedor', () => {
    expect([...TIPOS_CORREO].sort()).toEqual(valoresDe('tipo'));
    expect([...RESULTADOS_ENVIO].sort()).toEqual(valoresDe('resultado'));
    expect([...MOTIVOS_OMISION].sort()).toEqual(valoresDe('motivo_omision'));
    expect([...PROVEEDORES_CORREO].sort()).toEqual(valoresDe('proveedor'));
  });

  it('cada valor tiene su texto en palabras', () => {
    for (const tipo of TIPOS_CORREO) expect(TEXTO_TIPO_CORREO[tipo]).toMatch(/^[A-ZÁÉÍÓÚ]/);
    for (const resultado of RESULTADOS_ENVIO) expect(TEXTO_RESULTADO_ENVIO[resultado]).toBeTruthy();
    for (const motivo of MOTIVOS_OMISION) expect(TEXTO_MOTIVO_OMISION[motivo]).toBeTruthy();
  });
});

describe('enPalabras', () => {
  it('usa el texto conocido, la clave con espacios si no lo hay y una raya si no hay valor', () => {
    expect(enPalabras(TEXTO_TIPO_CORREO, 'recuperacion')).toBe('Recuperación de contraseña');
    expect(enPalabras(TEXTO_TIPO_CORREO, 'tipo_nuevo')).toBe('tipo nuevo');
    expect(enPalabras(TEXTO_MOTIVO_OMISION, null)).toBe('—');
  });
});

describe('tasa de entrega', () => {
  it('aceptados / (aceptados + rechazados + errores), redondeada', () => {
    expect(tasaEntrega({ aceptado: 9, rechazado: 1, error: 0 })).toBe(90);
    expect(tasaEntrega({ aceptado: 2, rechazado: 0, error: 1 })).toBe(67);
    expect(tasaEntrega({ aceptado: 0, rechazado: 1, error: 3 })).toBe(0);
    expect(tasaEntrega({ aceptado: 5, rechazado: 0, error: 0 })).toBe(100);
  });

  it('los omitidos no cuentan: solo omitidos (o nada) → sin tasa', () => {
    expect(tasaEntrega({ aceptado: 0, rechazado: 0, error: 0 })).toBeNull();
    expect(textoTasa(null)).toBe('Sin envíos');
    expect(textoTasa(90)).toBe('90 %');
  });
});

describe('agruparCorreos', () => {
  const FILAS = [
    { tipo: 'confirmacion', resultado: 'aceptado', motivo: null, total: 8 },
    { tipo: 'confirmacion', resultado: 'error', motivo: null, total: 2 },
    { tipo: 'reenvio_confirmacion', resultado: 'omitido', motivo: 'reenvio_reciente', total: 3 },
    { tipo: 'reenvio_confirmacion', resultado: 'omitido', motivo: 'cuenta_confirmada', total: 4 },
    { tipo: 'recuperacion', resultado: 'aceptado', motivo: null, total: 1 },
    { tipo: 'recuperacion', resultado: 'rechazado', motivo: null, total: 1 },
  ];

  it('totales por resultado, tasa global sin omitidos y tipos ordenados de más a menos', () => {
    const resumen = agruparCorreos(FILAS);
    expect(resumen.total).toBe(19);
    expect(resumen.porResultado).toEqual({ aceptado: 9, rechazado: 1, error: 2, omitido: 7 });
    expect(resumen.tasa).toBe(75); // 9 / 12
    expect(resumen.porTipo.map((t) => [t.tipo, t.total, t.tasa])).toEqual([
      ['confirmacion', 10, 80],
      ['reenvio_confirmacion', 7, null],
      ['recuperacion', 2, 50],
    ]);
    expect(resumen.omitidosPorMotivo).toEqual([
      { motivo: 'cuenta_confirmada', total: 4 },
      { motivo: 'reenvio_reciente', total: 3 },
    ]);
  });

  it('sin filas: todo en cero y sin tasa', () => {
    expect(agruparCorreos([])).toEqual({
      total: 0,
      porResultado: { aceptado: 0, rechazado: 0, error: 0, omitido: 0 },
      tasa: null,
      porTipo: [],
      omitidosPorMotivo: [],
    });
  });

  it('ignora resultados desconocidos y totales en cero', () => {
    const resumen = agruparCorreos([
      { tipo: 'prueba', resultado: 'raro', motivo: null, total: 5 },
      { tipo: 'prueba', resultado: 'aceptado', motivo: null, total: 0 },
    ]);
    expect(resumen.total).toBe(0);
    expect(resumen.porTipo).toEqual([]);
  });
});

describe('completarDias', () => {
  it('rellena con ceros los días sin correos, del más viejo a hoy, cruzando el cambio de mes', () => {
    const dias = completarDias([{ dia: '2026-11-30', aceptados: 3, fallidos: 1, omitidos: 0 }], '2026-12-02', 4);
    expect(dias.map((d) => d.dia)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
    expect(dias[1]).toEqual({ dia: '2026-11-30', aceptados: 3, fallidos: 1, omitidos: 0 });
    expect(dias[0]).toEqual({ dia: '2026-11-29', aceptados: 0, fallidos: 0, omitidos: 0 });
  });
});

describe('periodo y filtros de la URL', () => {
  it('periodo: 1, 7 o 30 días; cualquier otra cosa → 7', () => {
    expect(leerPeriodoCorreos('30')).toBe(30);
    expect(leerPeriodoCorreos(['1'])).toBe(1);
    expect(leerPeriodoCorreos('90')).toBe(7);
    expect(leerPeriodoCorreos(undefined)).toBe(7);
  });

  it('acepta solo valores de las listas, fechas AAAA-MM-DD y páginas positivas', () => {
    expect(
      leerFiltrosCorreos({ tipo: 'recuperacion', resultado: 'error', proveedor: 'gmail', desde: '2026-11-01', hasta: '2026-11-30', pagina: '3' }),
    ).toEqual({ periodo: 7, tipo: 'recuperacion', resultado: 'error', proveedor: 'gmail', desde: '2026-11-01', hasta: '2026-11-30', pagina: 3 });
    expect(
      leerFiltrosCorreos({ periodo: '365', tipo: "x'; DROP TABLE", resultado: 'perdido', proveedor: 'smtp', desde: '01/11/2026', pagina: '-2' }),
    ).toEqual({ periodo: 7, tipo: null, resultado: null, proveedor: null, desde: null, hasta: null, pagina: 1 });
    expect(leerFiltrosCorreos({ periodo: '30' }).periodo).toBe(30);
    expect(leerFiltrosCorreos({ pagina: '999999' }).pagina).toBe(10_000);
  });

  it('la consulta de la URL solo lleva lo que tiene valor y omite la página 1', () => {
    const filtros = leerFiltrosCorreos({ resultado: 'error', desde: '2026-11-01' });
    expect(consultaCorreos(filtros)).toBe('?resultado=error&desde=2026-11-01');
    expect(consultaCorreos(filtros, { pagina: 2 })).toBe('?resultado=error&desde=2026-11-01&pagina=2');
    expect(consultaCorreos(leerFiltrosCorreos({}))).toBe('');
    // El periodo por defecto (7) no va en la URL; los demás sí, también al paginar.
    expect(consultaCorreos(leerFiltrosCorreos({ periodo: '30' }), { pagina: 2 })).toBe('?periodo=30&pagina=2');
  });
});

describe('recortarError', () => {
  it('junta espacios y recorta con puntos suspensivos', () => {
    expect(recortarError(null)).toBeNull();
    expect(recortarError('  Timeout\n al   conectar ')).toBe('Timeout al conectar');
    const largo = recortarError('x'.repeat(300));
    expect(largo).toHaveLength(120);
    expect(largo!.endsWith('…')).toBe(true);
  });
});
