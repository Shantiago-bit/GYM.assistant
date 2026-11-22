// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { recomendarSiguiente, type DatosProgresion } from '@/lib/reglas/progresion';

const PESO: DatosProgresion = {
  tipo: 'peso',
  rango: [8, 12],
  pesoActualGramos: 60000,
  metaRepsActual: 12,
  repsPorSerie: [12, 12, 12],
  pesosPorSerie: [60000, 60000, 60000],
};

const porque = (d: Partial<DatosProgresion>) => recomendarSiguiente({ ...PESO, ...d }).porque;

describe('el porqué no cambia la decisión', () => {
  it('la acción y los números son los mismos con o sin porqué', () => {
    const r = recomendarSiguiente(PESO);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(65000);
    expect(r.metaRepsSugerida).toBe(8);
    expect(r.porque.resumen).toContain('65 kg');
  });
});

describe('subir_peso', () => {
  it('normal: resumen con el peso nuevo, una evidencia por serie (todas cumplen), la regla y qué pasa si no cambias', () => {
    const p = porque({});
    expect(p.resumen).toBe('Subes a 65 kg porque hiciste 12 repeticiones en todas las series: llegaste al tope de tu rango (8 a 12).');
    expect(p.evidencias).toEqual([
      { etiqueta: 'Serie 1', valor: '12 de 12 repeticiones con 60 kg', cumple: true },
      { etiqueta: 'Serie 2', valor: '12 de 12 repeticiones con 60 kg', cumple: true },
      { etiqueta: 'Serie 3', valor: '12 de 12 repeticiones con 60 kg', cumple: true },
    ]);
    expect(p.regla).toMatch(/^Doble progresión: .*subes el peso 5 kg y vuelves a 8 repeticiones\.$/);
    expect(p.siNoCambias).toMatch(/Si te quedas en 60 kg/);
  });

  it('con RIR que no alcanza para el salto doble: la evidencia del RIR no se cumple', () => {
    const p = porque({ rirPorSerie: [2, 1, null] });
    expect(p.resumen).toMatch(/^Subes a 65 kg porque/);
    expect(p.evidencias.at(-1)).toEqual({ etiqueta: 'Repeticiones que te quedaron en reserva', valor: '2, 1, sin anotar', cumple: false });
  });

  it('salto doble: lo explica con las repeticiones de reserva y la regla del salto doble', () => {
    const p = porque({ rirPorSerie: [3, 3, 4] });
    expect(p.resumen).toBe(
      'Subes a 70 kg (el doble de lo normal) porque hiciste 12 repeticiones en todas las series y te sobraron 3 o más repeticiones de reserva: te sobró fuerza.',
    );
    expect(p.evidencias.at(-1)).toMatchObject({ valor: '3, 3, 4', cumple: true });
    expect(p.regla).toMatch(/^Salto doble: .*subes el doble \(10 kg\)/);
  });

  it('con peso bajo (2,5 kg de incremento) la regla lo dice', () => {
    expect(porque({ pesoActualGramos: 20000, pesosPorSerie: [20000, 20000, 20000] }).regla).toContain('subes el peso 2,5 kg');
  });
});

describe('subir_reps y mantener', () => {
  it('subir_reps: dentro del rango sin llegar al tope; las series bajo 12 no cumplen', () => {
    const p = porque({ repsPorSerie: [12, 10, 9] });
    expect(p.resumen).toBe('Mantienes 60 kg porque hiciste 12, 10 y 9 repeticiones: estás en tu rango, pero aún no llegas a 12 en todas las series.');
    expect(p.evidencias.map((e) => e.cumple)).toEqual([true, false, false]);
    expect(p.siNoCambias).toBeUndefined();
  });

  it('mantener: bajo el mínimo, con la sesión anterior como evidencia', () => {
    const p = porque({ repsPorSerie: [9, 7, 6], repsSesionAnterior: [10, 9, 8] });
    expect(p.resumen).toBe('Mantienes 60 kg porque no llegaste a 8 repeticiones en todas las series: repite el objetivo antes de subir.');
    expect(p.evidencias.at(-1)).toEqual({ etiqueta: 'Sesión anterior', valor: '10, 9 y 8 repeticiones (mínimo 8)', cumple: true });
  });

  it('llegó al tope pero con menos peso que la referencia: no sube y lo explica', () => {
    const r = recomendarSiguiente({ ...PESO, pesosPorSerie: [57500, 57500, 57500] });
    expect(r.accion).toBe('subir_reps');
    expect(r.porque.resumen).toMatch(/con menos peso que tu referencia/);
    expect(r.porque.evidencias.every((e) => !e.cumple)).toBe(true);
  });

  it('sin series: lo dice sin inventar', () => {
    expect(porque({ repsPorSerie: [], pesosPorSerie: [] }).resumen).toMatch(/^Todavía no hay series/);
  });
});

describe('bajar_peso (descarga)', () => {
  it('dos sesiones seguidas bajo el mínimo: explica la descarga y el 10 %', () => {
    const r = recomendarSiguiente({ ...PESO, repsPorSerie: [7, 6, 6], repsSesionAnterior: [7, 7, 6] });
    expect(r.accion).toBe('bajar_peso');
    expect(r.porque.resumen).toBe(
      'Bajas a 54 kg porque es la segunda sesión seguida por debajo de 8 repeticiones en todas las series: una semana más suave te ayuda a recuperar el rango.',
    );
    expect(r.porque.regla).toMatch(/^Descarga: .*bajas un 10 %/);
    expect(r.porque.evidencias.at(-1)).toMatchObject({ etiqueta: 'Sesión anterior', cumple: false });
    expect(r.porque.siNoCambias).toMatch(/acumules cansancio/);
  });
});

describe('con tu cuerpo', () => {
  const CUERPO: DatosProgresion = { tipo: 'calistenia', rango: [8, 15], pesoActualGramos: null, metaRepsActual: 15, repsPorSerie: [15, 15, 15] };

  it('subir_variante', () => {
    const r = recomendarSiguiente(CUERPO);
    expect(r.accion).toBe('subir_variante');
    expect(r.porque.resumen).toBe('Pasas a una versión más difícil porque hiciste 15 repeticiones en todas las series: llegaste al tope de tu rango (8 a 15).');
    expect(r.porque.evidencias[0]).toEqual({ etiqueta: 'Serie 1', valor: '15 de 15 repeticiones', cumple: true });
    expect(r.porque.regla).toMatch(/^Doble progresión con tu cuerpo/);
  });

  it('dos sesiones bajo el mínimo: sugiere una versión más fácil', () => {
    const r = recomendarSiguiente({ ...CUERPO, repsPorSerie: [6, 5], repsSesionAnterior: [7, 6] });
    expect(r.accion).toBe('mantener');
    expect(r.porque.resumen).toMatch(/segunda sesión seguida .* prueba una versión más fácil/);
  });

  it('subir_reps', () => {
    expect(recomendarSiguiente({ ...CUERPO, repsPorSerie: [12, 11, 10] }).porque.resumen).toMatch(/^Mantienes la misma versión porque/);
  });
});

describe('métodos de series: solo cuentan las series clave', () => {
  it('principal + descarga: una sola evidencia, "Serie principal"', () => {
    const p = porque({ metodo: 'principal_descarga', repsPorSerie: [12, 10, 10], pesosPorSerie: [60000, 54000, 54000] });
    expect(p.evidencias).toEqual([{ etiqueta: 'Serie principal', valor: '12 de 12 repeticiones con 60 kg', cumple: true }]);
    expect(p.resumen).toContain('en la serie principal');
  });

  it('pirámide invertida (la primera) y ascendente (la última): "Serie más pesada"', () => {
    const invertida = porque({ metodo: 'piramide_invertida', repsPorSerie: [12, 14, 16], pesosPorSerie: [60000, 54000, 48500] });
    expect(invertida.evidencias).toEqual([{ etiqueta: 'Serie más pesada', valor: '12 de 12 repeticiones con 60 kg', cumple: true }]);
    const ascendente = porque({ metodo: 'piramide_ascendente', repsPorSerie: [12, 12, 9], pesosPorSerie: [48500, 54000, 60000] });
    expect(ascendente.evidencias).toEqual([{ etiqueta: 'Serie más pesada', valor: '9 de 12 repeticiones con 60 kg', cumple: false }]);
    expect(ascendente.resumen).toContain('en la serie más pesada');
  });

  it('cluster cuenta todas las series, como las rectas', () => {
    expect(porque({ metodo: 'cluster' }).evidencias).toHaveLength(3);
  });
});
