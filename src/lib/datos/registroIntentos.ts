import { BLOQUEO_REGISTRO_MINUTOS, MAX_INTENTOS_NOMBRE_OFENSIVO } from '@/lib/config/gym';
import { consultar } from '@/lib/db/conexion';

// Intentos de registro con nombres ofensivos por conexión. La clave es un hash de la IP, nunca la IP.

export async function estaBloqueado(clave: string): Promise<boolean> {
  const filas = await consultar<{ bloqueado: boolean }>(
    'SELECT bloqueado_hasta > now() AS bloqueado FROM registro_intentos WHERE clave = $1',
    [clave],
  );
  return filas[0]?.bloqueado === true;
}

// Suma un intento y devuelve cuántos lleva. Al llegar al máximo, bloquea la clave. Si un bloqueo anterior
// ya venció, el conteo vuelve a empezar.
export async function registrarIntentoOfensivo(clave: string): Promise<number> {
  const filas = await consultar<{ intentos_ofensivos: number }>(
    `INSERT INTO registro_intentos AS r (clave, intentos_ofensivos) VALUES ($1, 1)
     ON CONFLICT (clave) DO UPDATE SET
       intentos_ofensivos = CASE WHEN r.bloqueado_hasta IS NOT NULL AND r.bloqueado_hasta <= now()
                                 THEN 1 ELSE r.intentos_ofensivos + 1 END,
       bloqueado_hasta = CASE WHEN r.bloqueado_hasta IS NOT NULL AND r.bloqueado_hasta <= now()
                              THEN NULL ELSE r.bloqueado_hasta END,
       actualizado_en = now()
     RETURNING intentos_ofensivos`,
    [clave],
  );
  const intentos = filas[0]?.intentos_ofensivos ?? 1;
  if (intentos >= MAX_INTENTOS_NOMBRE_OFENSIVO) {
    await consultar(
      `UPDATE registro_intentos SET bloqueado_hasta = now() + make_interval(mins => $2), actualizado_en = now()
       WHERE clave = $1`,
      [clave, BLOQUEO_REGISTRO_MINUTOS],
    );
  }
  return intentos;
}

// Un registro exitoso reinicia el contador.
export async function reiniciarIntentos(clave: string): Promise<void> {
  await consultar('DELETE FROM registro_intentos WHERE clave = $1', [clave]);
}
