import { consultar } from '@/lib/db/conexion';
import type { MotivoOmision, ResultadoEnvio, TipoCorreo } from '@/lib/reglas/correo';

// Registro de envíos de correo: qué se intentó y qué pasó, nunca el contenido.

export interface FilaRegistroCorreo {
  tipo: TipoCorreo;
  destinatarioHash: string;
  destinatarioMascara: string;
  usuarioId?: string | null | undefined;
  resultado: ResultadoEnvio;
  motivoOmision?: MotivoOmision | null | undefined;
  proveedor?: 'gmail' | 'resend' | null | undefined;
  idMensaje?: string | null | undefined;
  error?: string | null | undefined;
  duracionMs?: number | null | undefined;
}

export interface RegistroCorreo {
  creadoEn: string;
  tipo: TipoCorreo;
  mascara: string;
  resultado: ResultadoEnvio;
  motivo: MotivoOmision | null;
  proveedor: string | null;
  idMensaje: string | null;
  error: string | null;
  duracionMs: number | null;
}

export async function insertarRegistroCorreo(fila: FilaRegistroCorreo): Promise<void> {
  await consultar(
    `INSERT INTO registro_correos (tipo, destinatario_hash, destinatario_mascara, usuario_id, resultado,
       motivo_omision, proveedor, id_mensaje, error, duracion_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      fila.tipo,
      fila.destinatarioHash,
      fila.destinatarioMascara,
      fila.usuarioId ?? null,
      fila.resultado,
      fila.motivoOmision ?? null,
      fila.proveedor ?? null,
      fila.idMensaje ?? null,
      fila.error ?? null,
      fila.duracionMs ?? null,
    ],
  );
}

// Últimos registros de un destinatario, con la fecha en hora de Colombia.
export async function historialDeCorreo(destinatarioHash: string, limite = 20): Promise<RegistroCorreo[]> {
  const filas = await consultar<{
    creado_en: string;
    tipo: TipoCorreo;
    destinatario_mascara: string;
    resultado: ResultadoEnvio;
    motivo_omision: MotivoOmision | null;
    proveedor: string | null;
    id_mensaje: string | null;
    error: string | null;
    duracion_ms: number | null;
  }>(
    `SELECT to_char(creado_en AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI:SS') AS creado_en, tipo,
            destinatario_mascara, resultado, motivo_omision, proveedor, id_mensaje, error, duracion_ms
     FROM registro_correos WHERE destinatario_hash = $1 ORDER BY creado_en DESC LIMIT $2`,
    [destinatarioHash, limite],
  );
  return filas.map((fila) => ({
    creadoEn: fila.creado_en,
    tipo: fila.tipo,
    mascara: fila.destinatario_mascara,
    resultado: fila.resultado,
    motivo: fila.motivo_omision,
    proveedor: fila.proveedor,
    idMensaje: fila.id_mensaje,
    error: fila.error,
    duracionMs: fila.duracion_ms,
  }));
}

// Suma un reenvío a la conexión y dice si sigue dentro del cupo (máximo por hora). La ventana se reinicia
// cuando pasó una hora desde que empezó.
export async function consumirCupoReenvio(clave: string, maximoPorHora: number): Promise<boolean> {
  const filas = await consultar<{ cantidad: number }>(
    `INSERT INTO limites_reenvio AS l (clave, ventana_desde, cantidad) VALUES ($1, now(), 1)
     ON CONFLICT (clave) DO UPDATE SET
       cantidad = CASE WHEN l.ventana_desde <= now() - interval '1 hour' THEN 1 ELSE l.cantidad + 1 END,
       ventana_desde = CASE WHEN l.ventana_desde <= now() - interval '1 hour' THEN now() ELSE l.ventana_desde END
     RETURNING cantidad`,
    [clave],
  );
  return (filas[0]?.cantidad ?? 1) <= maximoPorHora;
}

// Limpieza programada: registros viejos de correos y ventanas de reenvío vencidas.
export async function borrarRegistrosDeCorreoAntiguos(dias: number): Promise<number> {
  const filas = await consultar<{ borrados: number }>(
    `WITH borrados AS (
       DELETE FROM registro_correos WHERE creado_en < now() - make_interval(days => $1) RETURNING 1
     )
     SELECT COUNT(*)::int AS borrados FROM borrados`,
    [dias],
  );
  await consultar(`DELETE FROM limites_reenvio WHERE ventana_desde < now() - interval '1 day'`);
  return filas[0]?.borrados ?? 0;
}
