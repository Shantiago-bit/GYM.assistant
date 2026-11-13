import { DIAS_ENTRENAMIENTO_POR_DEFECTO } from '@/lib/config/gym';
import { guardarDias } from '@/lib/datos/diasEntrenamiento';
import { conTransaccion, consultar } from '@/lib/db/conexion';
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
  avisoDiasVisto: boolean;
  // Modo avanzado: métodos de series, RIR y técnicas a la vista. Las cuentas nuevas empiezan en el sencillo.
  modoAvanzado: boolean;
  miembroDesde: string;
}

export interface DatosPerfil {
  nombre: string;
  apodo?: string | undefined;
  fechaNacimiento: string;
  genero: Genero;
  // Días de entrenamiento elegidos al registrarse (ISO, 1 = lunes). Sin ellos, lunes a sábado.
  dias?: number[] | undefined;
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
  aviso_dias_visto: boolean;
  modo_avanzado: boolean;
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
  avisoDiasVisto: fila.aviso_dias_visto,
  modoAvanzado: fila.modo_avanzado,
  miembroDesde: fila.miembro_desde,
});

// "Miembro desde" es la fecha de creación de la cuenta, no la del perfil.
const COLUMNAS = `p.usuario_id, p.nombre, p.apodo, p.fecha_nacimiento::text AS fecha_nacimiento, p.genero,
  p.avatar_ruta, p.autorizacion, p.cumple_visto_anio, p.aviso_dias_visto, p.modo_avanzado,
  u.created_at AS miembro_desde`;

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
  // El perfil y sus días de entrenamiento se guardan juntos.
  await conTransaccion(async (tx) => {
    await tx.query(
      `INSERT INTO perfiles (usuario_id, nombre, apodo, fecha_nacimiento, genero, autorizacion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, datos.nombre.trim(), datos.apodo?.trim() || null, datos.fechaNacimiento, datos.genero, autorizacion],
    );
    await guardarDias(usuarioId, datos.dias?.length ? datos.dias : DIAS_ENTRENAMIENTO_POR_DEFECTO, tx);
  });
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
  await consultar('DELETE FROM dias_entrenamiento WHERE usuario_id = $1', [usuarioId]);
  await consultar('DELETE FROM perfiles WHERE usuario_id = $1', [usuarioId]);
}

export async function guardarModoAvanzado(usuarioId: string, avanzado: boolean): Promise<void> {
  await consultar('UPDATE perfiles SET modo_avanzado = $2, actualizado_en = now() WHERE usuario_id = $1', [usuarioId, avanzado]);
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
