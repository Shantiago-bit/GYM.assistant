import { z } from 'zod';
import { consultar } from '@/lib/db/conexion';
import type { ProgresoGuia, ProgresoRecorrido } from '@/lib/guia/motor';
import { ESTADOS_RECORRIDO, IDS_RECORRIDO, type IdRecorrido } from '@/lib/guia/recorridos';

// Todas las funciones reciben la cuenta de la sesión; nunca un id que llegue del cliente.

export interface EstadoGuia {
  ofertaVista: boolean;
  recorridos: ProgresoGuia;
}

// Ejercicios con los que se pueden repetir los recorridos de un ejercicio (prueba, detalle y sesión).
export interface EjerciciosGuia {
  sinPrueba: string | null;
  conPrueba: string | null;
}

const esquemaProgreso = z.object({ estado: z.enum(ESTADOS_RECORRIDO), paso: z.number().int().min(0) });

// Lo guardado se valida al leerlo: un recorrido desconocido o mal formado se ignora.
function leerRecorridos(valor: unknown): ProgresoGuia {
  const recorridos: ProgresoGuia = {};
  if (typeof valor !== 'object' || valor === null) return recorridos;
  for (const id of IDS_RECORRIDO) {
    const progreso = esquemaProgreso.safeParse((valor as Record<string, unknown>)[id]);
    if (progreso.success) recorridos[id] = progreso.data;
  }
  return recorridos;
}

interface RegistroGuia {
  oferta_vista_en: string | null;
  recorridos: unknown;
}

const mapear = (fila: RegistroGuia | undefined): EstadoGuia => ({
  ofertaVista: Boolean(fila?.oferta_vista_en),
  recorridos: leerRecorridos(fila?.recorridos),
});

// Sin fila, la cuenta no ha visto la oferta ni empezado ningún recorrido.
export async function obtenerEstadoGuia(usuarioId: string): Promise<EstadoGuia> {
  const filas = await consultar<RegistroGuia>(
    'SELECT oferta_vista_en, recorridos FROM guia_usuario WHERE usuario_id = $1',
    [usuarioId],
  );
  return mapear(filas[0]);
}

const DEVOLVER = 'RETURNING oferta_vista_en, recorridos';

export async function marcarOfertaVista(usuarioId: string): Promise<EstadoGuia> {
  const filas = await consultar<RegistroGuia>(
    `INSERT INTO guia_usuario AS g (usuario_id, oferta_vista_en) VALUES ($1, now())
     ON CONFLICT (usuario_id) DO UPDATE
       SET oferta_vista_en = COALESCE(g.oferta_vista_en, now()), actualizado_en = now()
     ${DEVOLVER}`,
    [usuarioId],
  );
  return mapear(filas[0]);
}

// Reemplaza el progreso de un recorrido y deja intactos los demás.
export async function guardarRecorrido(
  usuarioId: string,
  id: IdRecorrido,
  progreso: ProgresoRecorrido,
): Promise<EstadoGuia> {
  const valor = JSON.stringify({ [id]: { estado: progreso.estado, paso: progreso.paso } });
  const filas = await consultar<RegistroGuia>(
    `INSERT INTO guia_usuario AS g (usuario_id, recorridos) VALUES ($1, $2::jsonb)
     ON CONFLICT (usuario_id) DO UPDATE
       SET recorridos = g.recorridos || EXCLUDED.recorridos, actualizado_en = now()
     ${DEVOLVER}`,
    [usuarioId, valor],
  );
  return mapear(filas[0]);
}

export async function reiniciarGuia(usuarioId: string): Promise<EstadoGuia> {
  const filas = await consultar<RegistroGuia>(
    `INSERT INTO guia_usuario AS g (usuario_id) VALUES ($1)
     ON CONFLICT (usuario_id) DO UPDATE
       SET oferta_vista_en = NULL, recorridos = '{}'::jsonb, actualizado_en = now()
     ${DEVOLVER}`,
    [usuarioId],
  );
  return mapear(filas[0]);
}

export async function obtenerEjerciciosGuia(usuarioId: string): Promise<EjerciciosGuia> {
  const filas = await consultar<{ sin_prueba: string | null; con_prueba: string | null }>(
    `WITH activos AS (
       SELECT e.id, e.created_at,
              EXISTS (SELECT 1 FROM sesiones s WHERE s.ejercicio_id = e.id AND s.es_prueba) AS con_prueba
       FROM ejercicios e
       WHERE e.usuario_id = $1 AND NOT e.archivado
     )
     SELECT
       (SELECT id FROM activos WHERE NOT con_prueba ORDER BY created_at DESC LIMIT 1) AS sin_prueba,
       (SELECT id FROM activos WHERE con_prueba ORDER BY created_at DESC LIMIT 1) AS con_prueba`,
    [usuarioId],
  );
  return { sinPrueba: filas[0]?.sin_prueba ?? null, conPrueba: filas[0]?.con_prueba ?? null };
}
