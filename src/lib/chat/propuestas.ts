import type { Enfoque, TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo } from '@/lib/reglas/metodos';

// CHRONO no cambia datos por su cuenta: propone el cambio y la persona lo aplica con el botón Confirmar,
// que llama a las mismas rutas de la API que usa el resto de la app.

export interface DatosNuevoEjercicio {
  nombre: string;
  tipo: TipoEjercicio;
  enfoque: Enfoque;
  metodo: Metodo;
  rangoMin: number;
  rangoMax: number;
  pesoRefKg?: number;
  nivel?: string;
}

export interface CambioEnfoque {
  enfoque: Enfoque;
  metodo: Metodo;
  rangoMin: number;
  rangoMax: number;
}

interface Base {
  id: string;
  titulo: string;
  detalle: string[];
}

export type Propuesta =
  | (Base & { accion: 'crear'; datos: DatosNuevoEjercicio })
  | (Base & { accion: 'modificar'; ejercicioId: string; nombre: string; enfoque?: CambioEnfoque; nivel?: string })
  | (Base & { accion: 'archivar'; ejercicioId: string; nombre: string })
  | (Base & { accion: 'restaurar'; ejercicioId: string; nombre: string });

export type EstadoPropuesta = 'pendiente' | 'aplicando' | 'confirmada' | 'cancelada' | 'error';

export type PropuestaVista = Propuesta & { estado: EstadoPropuesta; error?: string };

export interface Paso {
  url: string;
  cuerpo: unknown;
}

// Llamadas a la API que aplican la propuesta, en orden.
export function pasosDePropuesta(propuesta: Propuesta): Paso[] {
  if (propuesta.accion === 'crear') {
    return [{ url: '/api/gym/ejercicios', cuerpo: propuesta.datos }];
  }
  const base = `/api/gym/ejercicios/${encodeURIComponent(propuesta.ejercicioId)}`;
  if (propuesta.accion === 'archivar') {
    return [{ url: `${base}/archivar`, cuerpo: {} }];
  }
  if (propuesta.accion === 'restaurar') {
    return [{ url: `${base}/restaurar`, cuerpo: {} }];
  }
  const pasos: Paso[] = [];
  if (propuesta.enfoque) {
    pasos.push({ url: `${base}/enfoque`, cuerpo: propuesta.enfoque });
  }
  if (propuesta.nivel !== undefined) {
    pasos.push({ url: `${base}/nivel`, cuerpo: { nivel: propuesta.nivel } });
  }
  return pasos;
}

function nombreDe(propuesta: Propuesta): string {
  return propuesta.accion === 'crear' ? propuesta.datos.nombre : propuesta.nombre;
}

// Nota que queda en la conversación para que CHRONO sepa qué decidió la persona.
export function notaDeConfirmacion(propuesta: Propuesta): string {
  const nombre = nombreDe(propuesta);
  switch (propuesta.accion) {
    case 'crear':
      return `✅ Listo: se creó el ejercicio «${nombre}». Ya aparece en Mis ejercicios; el siguiente paso es hacer su primera medición.`;
    case 'modificar':
      return `✅ Listo: se actualizó «${nombre}».`;
    case 'archivar':
      return `✅ Listo: se archivó «${nombre}». Ya no aparece en tu lista y su historial se conserva.`;
    case 'restaurar':
      return `✅ Listo: se restauró «${nombre}». Vuelve a tu lista con todo su histórico.`;
  }
}

export function notaDeCancelacion(propuesta: Propuesta): string {
  return `Cancelaste la propuesta: no se hizo ningún cambio en «${nombreDe(propuesta)}».`;
}
