import { consultar } from '@/lib/db/conexion';

// Suma un mensaje al día solo si no se alcanzó el límite. Es una sola sentencia, así que dos
// pedidos simultáneos no pueden pasarse del límite. Devuelve false si ya no quedan mensajes.
export async function registrarMensajeChat(usuarioId: string, fecha: string, limite: number): Promise<boolean> {
  const filas = await consultar<{ mensajes: number }>(
    `INSERT INTO chat_uso (usuario_id, fecha, mensajes)
     SELECT $1, $2, 1 WHERE $3 > 0
     ON CONFLICT (usuario_id, fecha)
       DO UPDATE SET mensajes = chat_uso.mensajes + 1
       WHERE chat_uso.mensajes < $3
     RETURNING mensajes`,
    [usuarioId, fecha, limite],
  );
  return filas.length > 0;
}
