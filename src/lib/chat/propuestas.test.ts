import { describe, expect, it } from 'vitest';
import { notaDeCancelacion, notaDeConfirmacion, pasosDePropuesta, type Propuesta } from './propuestas';

const base = { id: 'p1', titulo: 't', detalle: [] };

describe('pasosDePropuesta', () => {
  it('crea con la misma ruta y los mismos datos que el formulario de la app', () => {
    const datos = { nombre: 'Sentadilla', tipo: 'peso', enfoque: 'fuerza', metodo: 'rectas', rangoMin: 3, rangoMax: 5 } as const;
    expect(pasosDePropuesta({ ...base, accion: 'crear', datos })).toEqual([{ url: '/api/gym/ejercicios', cuerpo: datos }]);
  });

  it('modifica enfoque y nivel con sus rutas, en ese orden', () => {
    const propuesta: Propuesta = {
      ...base,
      accion: 'modificar',
      ejercicioId: 'e/1',
      nombre: 'Dominadas',
      enfoque: { enfoque: 'fuerza', metodo: 'rectas', rangoMin: 3, rangoMax: 6 },
      nivel: 'Con lastre',
    };
    expect(pasosDePropuesta(propuesta)).toEqual([
      { url: '/api/gym/ejercicios/e%2F1/enfoque', cuerpo: { enfoque: 'fuerza', metodo: 'rectas', rangoMin: 3, rangoMax: 6 } },
      { url: '/api/gym/ejercicios/e%2F1/nivel', cuerpo: { nivel: 'Con lastre' } },
    ]);
  });

  it('elimina archivando', () => {
    expect(pasosDePropuesta({ ...base, accion: 'archivar', ejercicioId: 'e1', nombre: 'Press' })).toEqual([
      { url: '/api/gym/ejercicios/e1/archivar', cuerpo: {} },
    ]);
  });
});

describe('notas de la decisión', () => {
  const archivar: Propuesta = { ...base, accion: 'archivar', ejercicioId: 'e1', nombre: 'Press' };

  it('dejan claro el resultado para la persona y para CHRONO', () => {
    expect(notaDeConfirmacion(archivar)).toMatch(/^✅ Listo: se archivó «Press»/);
    expect(notaDeCancelacion(archivar)).toBe('Cancelaste la propuesta: no se hizo ningún cambio en «Press».');
  });
});
