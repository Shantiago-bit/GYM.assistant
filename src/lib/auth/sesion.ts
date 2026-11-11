import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { estaSinAutorizar } from '@/lib/datos/autorizaciones';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SesionUsuario {
  id: string;
  email: string;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { id: user.id, email: user.email ?? '' } : null;
});

// Sesión para /api/gym. Una cuenta de menor que aún no autoriza su tutor no puede usar la API (403).
export async function exigirSesion(): Promise<SesionUsuario> {
  const sesion = await exigirSesionAunSinAutorizar();

  if (await estaSinAutorizar(sesion.id)) {
    throw new ErrorDeNegocio('AUTORIZACION_PENDIENTE');
  }

  return sesion;
}

// Solo para lo que una cuenta pendiente sí puede hacer: reenviar la solicitud a su tutor.
export async function exigirSesionAunSinAutorizar(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    throw new ErrorDeNegocio('NO_AUTORIZADO');
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
