import { consultar } from '@/lib/db/conexion';
import type { DatosPrimerosPasos } from '@/lib/reglas/guia';

// Todas las funciones reciben la cuenta de la sesión; nunca un id que llegue del cliente.

export interface EstadoGuia {
  bienvenidaVista: boolean;
  guiaCompletada: boolean;
  primerosPasosOcultos: boolean;
}

interface RegistroGuia {
  bienvenida_vista_en: string | null;
  guia_completada_en: string | null;
  primeros_pasos_ocultos: boolean;
}

function mapear(fila: RegistroGuia | undefined): EstadoGuia {
  return {
    bienvenidaVista: Boolean(fila?.bienvenida_vista_en),
    guiaCompletada: Boolean(fila?.guia_completada_en),
    primerosPasosOcultos: fila?.primeros_pasos_ocultos ?? false,
  };
}

// Sin fila, la cuenta no ha visto la bienvenida ni ha ocultado nada.
export async function obtenerEstadoGuia(usuarioId: string): Promise<EstadoGuia> {
  const filas = await consultar<RegistroGuia>(
    `SELECT bienvenida_vista_en, guia_completada_en, primeros_pasos_ocultos
     FROM guia_usuario WHERE usuario_id = $1`,
    [usuarioId],
  );
  return mapear(filas[0]);
}

// Asegura la fila de la cuenta y aplica el cambio. Las asignaciones son constantes de este archivo,
// nunca texto que llegue del cliente. Repetir cualquiera de las dos sentencias no cambia el resultado.
async function actualizar(usuarioId: string, asignaciones: string): Promise<EstadoGuia> {
  await consultar('INSERT INTO guia_usuario (usuario_id) VALUES ($1) ON CONFLICT (usuario_id) DO NOTHING', [
    usuarioId,
  ]);
  const filas = await consultar<RegistroGuia>(
    `UPDATE guia_usuario SET ${asignaciones} WHERE usuario_id = $1
     RETURNING bienvenida_vista_en, guia_completada_en, primeros_pasos_ocultos`,
    [usuarioId],
  );
  return mapear(filas[0]);
}

export function marcarBienvenidaVista(usuarioId: string): Promise<EstadoGuia> {
  return actualizar(usuarioId, 'bienvenida_vista_en = COALESCE(bienvenida_vista_en, now())');
}

// Terminar la guía también cuenta como haber visto la bienvenida.
export function marcarGuiaCompletada(usuarioId: string): Promise<EstadoGuia> {
  return actualizar(
    usuarioId,
    'guia_completada_en = COALESCE(guia_completada_en, now()), bienvenida_vista_en = COALESCE(bienvenida_vista_en, now())',
  );
}

export function cambiarPrimerosPasosOcultos(usuarioId: string, ocultos: boolean): Promise<EstadoGuia> {
  return actualizar(usuarioId, ocultos ? 'primeros_pasos_ocultos = true' : 'primeros_pasos_ocultos = false');
}

export function reiniciarGuia(usuarioId: string): Promise<EstadoGuia> {
  return actualizar(
    usuarioId,
    'bienvenida_vista_en = NULL, guia_completada_en = NULL, primeros_pasos_ocultos = false',
  );
}

interface RegistroPasos {
  ejercicios: number;
  con_prueba: boolean;
  sesiones: number;
  max_sesiones_ejercicio: number;
  entrenamiento_varios: boolean;
  uso_chat: boolean;
}

export async function obtenerDatosPrimerosPasos(usuarioId: string): Promise<DatosPrimerosPasos> {
  const filas = await consultar<RegistroPasos>(
    `WITH propias AS (
       SELECT s.ejercicio_id, s.fecha, s.es_prueba
       FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id
       WHERE e.usuario_id = $1
     ), regulares AS (
       SELECT ejercicio_id, fecha FROM propias WHERE NOT es_prueba
     )
     SELECT
       (SELECT COUNT(*) FROM ejercicios WHERE usuario_id = $1)::int AS ejercicios,
       EXISTS (SELECT 1 FROM propias WHERE es_prueba) AS con_prueba,
       (SELECT COUNT(*) FROM regulares)::int AS sesiones,
       COALESCE((SELECT MAX(total) FROM (SELECT COUNT(*) AS total FROM regulares GROUP BY ejercicio_id) x), 0)::int
         AS max_sesiones_ejercicio,
       EXISTS (
         SELECT 1 FROM regulares GROUP BY fecha HAVING COUNT(DISTINCT ejercicio_id) >= 2
       ) AS entrenamiento_varios,
       EXISTS (SELECT 1 FROM chat_uso WHERE usuario_id = $1 AND mensajes > 0) AS uso_chat`,
    [usuarioId],
  );
  const fila = filas[0]!;
  return {
    ejercicios: fila.ejercicios,
    conPruebaInicial: fila.con_prueba,
    sesiones: fila.sesiones,
    maxSesionesPorEjercicio: fila.max_sesiones_ejercicio,
    entrenamientoConVarios: fila.entrenamiento_varios,
    usoChat: fila.uso_chat,
  };
}
