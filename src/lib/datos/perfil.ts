import { consultar } from '@/lib/db/conexion';
import type { EjercicioConHistorial, SerieRegistro } from '@/lib/reglas/perfil';

// Todas las funciones reciben la cuenta de la sesión; nunca un id que llegue del cliente.

export type Genero = 'hombre' | 'mujer' | 'otro' | 'prefiero_no_decir';
export type EstadoAutorizacion = 'no_requerida' | 'pendiente' | 'aprobada' | 'rechazada';

export interface Perfil {
  usuarioId: string;
  nombre: string;
  apodo: string | null;
  fechaNacimiento: string;
  genero: Genero;
  avatarRuta: string | null;
  autorizacion: EstadoAutorizacion;
  cumpleVistoAnio: number | null;
  miembroDesde: string;
}

export interface DatosPerfil {
  nombre: string;
  apodo?: string | undefined;
  fechaNacimiento: string;
  genero: Genero;
}

interface RegistroPerfil {
  usuario_id: string;
  nombre: string;
  apodo: string | null;
  fecha_nacimiento: string;
  genero: Genero;
  avatar_ruta: string | null;
  autorizacion: EstadoAutorizacion;
  cumple_visto_anio: number | null;
  miembro_desde: string;
}

const mapear = (fila: RegistroPerfil): Perfil => ({
  usuarioId: fila.usuario_id,
  nombre: fila.nombre,
  apodo: fila.apodo,
  fechaNacimiento: fila.fecha_nacimiento,
  genero: fila.genero,
  avatarRuta: fila.avatar_ruta,
  autorizacion: fila.autorizacion,
  cumpleVistoAnio: fila.cumple_visto_anio,
  miembroDesde: fila.miembro_desde,
});

// "Miembro desde" es la fecha de creación de la cuenta, no la del perfil.
const COLUMNAS = `p.usuario_id, p.nombre, p.apodo, p.fecha_nacimiento::text AS fecha_nacimiento, p.genero,
  p.avatar_ruta, p.autorizacion, p.cumple_visto_anio, u.created_at AS miembro_desde`;

export async function obtenerPerfil(usuarioId: string): Promise<Perfil | null> {
  const filas = await consultar<RegistroPerfil>(
    `SELECT ${COLUMNAS} FROM perfiles p JOIN auth.users u ON u.id = p.usuario_id WHERE p.usuario_id = $1`,
    [usuarioId],
  );
  return filas[0] ? mapear(filas[0]) : null;
}

export async function crearPerfil(
  usuarioId: string,
  datos: DatosPerfil,
  autorizacion: EstadoAutorizacion = 'no_requerida',
): Promise<void> {
  await consultar(
    `INSERT INTO perfiles (usuario_id, nombre, apodo, fecha_nacimiento, genero, autorizacion)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId, datos.nombre.trim(), datos.apodo?.trim() || null, datos.fechaNacimiento, datos.genero, autorizacion],
  );
}

// La fecha de nacimiento no se edita desde la app: así un menor no puede saltarse la autorización.
export async function actualizarPerfil(
  usuarioId: string,
  datos: { nombre: string; apodo?: string | undefined; genero: Genero },
): Promise<Perfil | null> {
  await consultar(
    `UPDATE perfiles SET nombre = $2, apodo = $3, genero = $4, actualizado_en = now() WHERE usuario_id = $1`,
    [usuarioId, datos.nombre.trim(), datos.apodo?.trim() || null, datos.genero],
  );
  return obtenerPerfil(usuarioId);
}

// Deshace un perfil recién creado (si no se pudo pedir la autorización del tutor).
export async function borrarPerfil(usuarioId: string): Promise<void> {
  await consultar('DELETE FROM autorizaciones_tutor WHERE usuario_id = $1', [usuarioId]);
  await consultar('DELETE FROM perfiles WHERE usuario_id = $1', [usuarioId]);
}

export async function guardarRutaAvatar(usuarioId: string, ruta: string | null): Promise<void> {
  await consultar('UPDATE perfiles SET avatar_ruta = $2, actualizado_en = now() WHERE usuario_id = $1', [usuarioId, ruta]);
}

export async function marcarCumpleVisto(usuarioId: string, anio: number): Promise<void> {
  await consultar('UPDATE perfiles SET cumple_visto_anio = $2 WHERE usuario_id = $1', [usuarioId, anio]);
}

interface FilaHistorial {
  ejercicio_id: string;
  nombre: string;
  tipo: 'peso' | 'calistenia';
  nivel: string | null;
  archivado: boolean;
  sesion_id: string | null;
  fecha: string | null;
  series: SerieRegistro[] | null;
}

// Todos los ejercicios de la cuenta (incluidos los archivados) con sus sesiones y series, en una consulta.
export async function obtenerHistorialCompleto(usuarioId: string): Promise<EjercicioConHistorial[]> {
  const filas = await consultar<FilaHistorial>(
    `SELECT e.id AS ejercicio_id, e.nombre, e.tipo, e.nivel, e.archivado, s.id AS sesion_id, s.fecha::text AS fecha,
       (SELECT json_agg(json_build_object(
                 'reps', x.reps, 'pesoGramos', x.peso_gramos, 'rir', x.rir,
                 'tipoSerie', x.tipo_serie, 'extras', x.extras) ORDER BY x.numero)
        FROM series x WHERE x.sesion_id = s.id) AS series
     FROM ejercicios e
     LEFT JOIN sesiones s ON s.ejercicio_id = e.id
     WHERE e.usuario_id = $1
     ORDER BY lower(e.nombre), s.fecha, s.created_at`,
    [usuarioId],
  );

  const porEjercicio = new Map<string, EjercicioConHistorial>();
  for (const fila of filas) {
    const ejercicio =
      porEjercicio.get(fila.ejercicio_id) ??
      porEjercicio
        .set(fila.ejercicio_id, {
          id: fila.ejercicio_id,
          nombre: fila.nombre,
          tipo: fila.tipo,
          nivel: fila.nivel,
          archivado: fila.archivado,
          sesiones: [],
        })
        .get(fila.ejercicio_id)!;
    if (fila.sesion_id && fila.fecha) {
      ejercicio.sesiones.push({ fecha: fila.fecha, series: fila.series ?? [] });
    }
  }
  return [...porEjercicio.values()];
}
