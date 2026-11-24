import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { estadoDeAcceso } from '@/lib/datos/autorizaciones';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SesionUsuario {
  id: string;
  email: string;
  // Nivel de verificación del token (claim aal): 'aal2' tras el código de la app de autenticación (MFA).
  aal?: 'aal1' | 'aal2';
}

function credencialesPublicas(): { url: string; clave: string } | null {
  const url = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
  const clave =
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

  return url && clave ? { url, clave } : null;
}

// cache evita repetir la consulta a Supabase entre el layout y la página de una misma solicitud.
export const obtenerSesion = cache(async (): Promise<SesionUsuario | null> => {
  const credenciales = credencialesPublicas();

  if (!credenciales) {
    return null;
  }

  const almacen = await cookies();
  const supabase = createServerClient(credenciales.url, credenciales.clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      // El middleware renueva las cookies: aquí solo se leen.
      setAll: () => {},
    },
  });

  // getClaims verifica la firma del token con la clave pública del proyecto (ES256, cacheada), sin ir al
  // servidor de Auth en cada solicitud. Si el proyecto usara claves simétricas, consultaría al servidor.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    aal: claims.aal === 'aal2' ? 'aal2' : 'aal1',
  };
});

// Sesión para /api/gym. Una cuenta suspendida (desde el panel) o de un menor que aún no autoriza su tutor no
// puede usar la API (403). Una sola consulta para las dos cosas.
export async function exigirSesion(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new ErrorDeNegocio('NO_AUTORIZADO');
  }
  const acceso = await estadoDeAcceso(sesion.id);
  if (acceso.suspendida) {
    throw new ErrorDeNegocio('CUENTA_SUSPENDIDA');
  }
  if (acceso.sinAutorizar) {
    throw new ErrorDeNegocio('AUTORIZACION_PENDIENTE');
  }

  return sesion;
}

// Solo para lo que una cuenta pendiente sí puede hacer: reenviar la solicitud a su tutor. Suspendida, tampoco.
export async function exigirSesionAunSinAutorizar(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    throw new ErrorDeNegocio('NO_AUTORIZADO');
  }
  if ((await estadoDeAcceso(sesion.id)).suspendida) {
    throw new ErrorDeNegocio('CUENTA_SUSPENDIDA');
  }

  return sesion;
}

export async function exigirSesionDePagina(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect('/login');
  }

  return sesion;
}

// Cliente con cookies escribibles: solo puede usarse desde una ruta.
async function clienteConCookies() {
  const credenciales = credencialesPublicas();

  if (!credenciales) {
    return null;
  }

  const almacen = await cookies();
  return createServerClient(credenciales.url, credenciales.clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (nuevas) => {
        nuevas.forEach(({ name, value, options }) => almacen.set(name, value, options));
      },
    },
  });
}

// Canjea el código del enlace de confirmación por una sesión. Devuelve false si el canje falla.
export async function canjearCodigoDeConfirmacion(codigo: string): Promise<boolean> {
  const supabase = await clienteConCookies();
  if (!supabase) return false;

  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  return !error;
}

// Verifica el token del correo de confirmación que envía la app, confirma la cuenta e inicia la sesión.
export async function verificarEnlaceDeCorreo(tokenHash: string, tipo: EmailOtpType): Promise<boolean> {
  const supabase = await clienteConCookies();
  if (!supabase) return false;

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });

  return !error;
}
