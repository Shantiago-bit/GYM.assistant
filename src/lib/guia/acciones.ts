import type { EjerciciosGuia } from '@/lib/datos/guia';
import type { ProgresoGuia } from '@/lib/guia/motor';
import { enviarJson } from '@/lib/http/cliente';
import type { AccionGuia } from '@/lib/validacion/esquemas';

export interface DatosGuia {
  ofertaVista: boolean;
  recorridos: ProgresoGuia;
  ejercicios: EjerciciosGuia;
}

// Si la API falla, la guía sigue funcionando en la página; a lo sumo no se recuerda el progreso.
export async function leerGuia(): Promise<DatosGuia | null> {
  try {
    const respuesta = await fetch('/api/gym/guia', { cache: 'no-store' });
    const cuerpo = (await respuesta.json()) as { ok: boolean; datos?: DatosGuia };
    return cuerpo.ok && cuerpo.datos ? cuerpo.datos : null;
  } catch {
    return null;
  }
}

export async function enviarAccionGuia(accion: AccionGuia): Promise<DatosGuia | null> {
  const resultado = await enviarJson<DatosGuia>('/api/gym/guia', accion, 'PATCH');
  return resultado.ok ? resultado.datos : null;
}

// Elementos reales de la pantalla marcados con data-guia="<id>". Solo cuenta uno visible.
const escapar = (id: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');

export function buscarObjetivo(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const candidatos = document.querySelectorAll<HTMLElement>(`[data-guia="${escapar(id)}"]`);
    for (const elemento of candidatos) {
      const rect = elemento.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return elemento;
    }
  }
  return null;
}

export const existeObjetivo = (id: string) => buscarObjetivo([id]) !== null;
