// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// asistente.ts trae la conexión a Supabase; aquí solo se prueba la validación de la respuesta.
vi.mock('@/lib/chat/asistente', () => ({ modeloChat: () => 'modelo', opcionesDeRazonamiento: () => ({}) }));

import { seriesDesdeRespuesta } from '@/lib/chat/interpretar';

const PESO = { tipo: 'peso' as const, pesoActualGramos: 40000 };

describe('respuesta de CHRONO (interpretar_series), validada con zod', () => {
  it('convierte kilos a gramos y marca el calentamiento sin RIR', () => {
    const r = seriesDesdeRespuesta(
      JSON.stringify({ series: [{ reps: 10, peso_kg: 20, calentamiento: true, rir: 3 }, { reps: 8, peso_kg: 62.5, rir: 2 }] }),
      PESO,
    );
    expect(r).toEqual({
      ok: true,
      series: [
        { reps: 10, pesoGramos: 20000, rir: null, tecnica: 'aproximacion' },
        { reps: 8, pesoGramos: 62500, rir: 2, tecnica: 'normal' },
      ],
      avisos: [],
    });
  });

  it('sin peso usa el actual y lo avisa una sola vez', () => {
    const r = seriesDesdeRespuesta(JSON.stringify({ series: [{ reps: 10 }, { reps: 9, peso_kg: null }] }), PESO);
    expect(r.ok && r.series.map((s) => s.pesoGramos)).toEqual([40000, 40000]);
    expect(r.ok && r.avisos).toEqual(['Usé tu peso actual (40 kg) porque no escribiste el peso.']);
  });

  it('con tu cuerpo ignora el peso', () => {
    const r = seriesDesdeRespuesta(JSON.stringify({ series: [{ reps: 12, peso_kg: 10 }] }), { tipo: 'calistenia', pesoActualGramos: null });
    expect(r.ok && r.series[0]).toEqual({ reps: 12, pesoGramos: null, rir: null, tecnica: 'normal' });
  });

  it('rechaza lo que no cumple los límites o no es JSON, y una lista vacía', () => {
    for (const malo of [
      '{"series":[{"reps":0}]}',
      '{"series":[{"reps":10,"peso_kg":5000}]}',
      '{"series":[{"reps":10,"rir":99}]}',
      '{"series":[]}',
      'no es json',
    ]) {
      expect(seriesDesdeRespuesta(malo, PESO).ok, malo).toBe(false);
    }
  });

  it('sin peso actual ni peso en la respuesta, pide el peso; solo calentamiento, pide series de trabajo', () => {
    expect(seriesDesdeRespuesta('{"series":[{"reps":10}]}', { tipo: 'peso', pesoActualGramos: null })).toMatchObject({ ok: false });
    expect(seriesDesdeRespuesta('{"series":[{"reps":10,"peso_kg":20,"calentamiento":true}]}', PESO)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/calentamiento/),
    });
  });
});
