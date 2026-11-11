import { MENSAJES } from '@/lib/reglas/errores';

type RespuestaApi<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: string; mensaje: string; detalles?: unknown };

export async function enviarJson<T>(
  url: string,
  cuerpo?: unknown,
  metodo: 'POST' | 'PATCH' | 'DELETE' = 'POST',
): Promise<RespuestaApi<T>> {
  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    });
    const contenido = await respuesta.json();

    return contenido.ok
      ? { ok: true, datos: contenido.datos as T }
      : { ok: false, codigo: contenido.error.codigo, mensaje: contenido.error.mensaje, detalles: contenido.error.detalles };
  } catch {
    return { ok: false, codigo: 'ERROR_INTERNO', mensaje: MENSAJES.ERROR_INTERNO };
  }
}
