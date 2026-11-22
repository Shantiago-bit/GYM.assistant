// Puerta del panel de administración. Todo /admin y /api/admin pasa por aquí, en el servidor:
//   1. Hay sesión (si no: /login en páginas, 401 en la API).
//   2. La cuenta está en administradores y no está suspendida (si no: 404, para no revelar que /admin existe).
//   3. La sesión está en aal2, es decir, verificada con el código de la app de autenticación (si no:
//      /admin/seguridad en páginas, 403 en la API). El claim aal sale del JWT verificado con getClaims
//      (verificación local, sin consultar al servidor de Auth en cada solicitud).
//   4. Las acciones que modifican datos exigen el rol 'admin' (con 'lectura': 403).
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { obtenerSesion, type SesionUsuario } from '@/lib/auth/sesion';
import { obtenerAdministrador, type RolAdmin } from '@/lib/datos/admin';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SesionAdmin extends SesionUsuario {
  rol: RolAdmin;
}

export type EstadoAdmin =
  | { estado: 'sin_sesion' }
  | { estado: 'no_admin' }
  | { estado: 'sin_verificar'; admin: SesionAdmin }
  | { estado: 'ok'; admin: SesionAdmin };

// cache: el layout y la página de una misma solicitud comparten el resultado (una sola consulta).
export const evaluarAdmin = cache(async (): Promise<EstadoAdmin> => {
  const sesion = await obtenerSesion();
  if (!sesion) return { estado: 'sin_sesion' };

  const administrador = await obtenerAdministrador(sesion.id);
  // Una cuenta suspendida no administra, aunque esté en la tabla.
  if (!administrador || administrador.suspendido) return { estado: 'no_admin' };

  const admin: SesionAdmin = { ...sesion, rol: administrador.rol };
  return sesion.aal === 'aal2' ? { estado: 'ok', admin } : { estado: 'sin_verificar', admin };
});

// Para las páginas de /admin. Con `permitirSinVerificar`, solo /admin/seguridad (donde se verifica).
export async function exigirAdminDePagina(opciones: { permitirSinVerificar?: boolean } = {}): Promise<SesionAdmin> {
  const resultado = await evaluarAdmin();
  if (resultado.estado === 'sin_sesion') redirect('/login');
  if (resultado.estado === 'no_admin') notFound();
  if (resultado.estado === 'sin_verificar' && !opciones.permitirSinVerificar) redirect('/admin/seguridad');
  return resultado.admin;
}

// Para /api/admin. Con `rol: 'admin'`, la ruta modifica datos y el rol 'lectura' recibe 403.
export async function exigirAdmin(opciones: { rol?: 'admin' } = {}): Promise<SesionAdmin> {
  const resultado = await evaluarAdmin();
  if (resultado.estado === 'sin_sesion') throw new ErrorDeNegocio('NO_AUTORIZADO');
  if (resultado.estado === 'no_admin') throw new ErrorDeNegocio('RECURSO_NO_ENCONTRADO');
  if (resultado.estado === 'sin_verificar') throw new ErrorDeNegocio('VERIFICACION_REQUERIDA');
  if (opciones.rol === 'admin' && resultado.admin.rol !== 'admin') throw new ErrorDeNegocio('SOLO_LECTURA');
  return resultado.admin;
}

export function puedeActuar(admin: Pick<SesionAdmin, 'rol'>): boolean {
  return admin.rol === 'admin';
}
