import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SesionUsuario {
  email: string;
}

function credencialesPublicas(): { url: string; clave: string } | null {
  const url = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
  const clave =
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

  return url && clave ? { url, clave } : null;
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
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

  return user ? { email: user.email ?? '' } : null;
}

export async function exigirSesion(): Promise<SesionUsuario> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    throw new ErrorDeNegocio('NO_AUTORIZADO');
  }

  return sesion;
}

// Canjea el código del enlace de confirmación por una sesión. Solo puede llamarse desde una ruta,
// porque escribe cookies. Devuelve false si el canje falla.
export async function canjearCodigoDeConfirmacion(codigo: string): Promise<boolean> {
  const credenciales = credencialesPublicas();

  if (!credenciales) {
    return false;
  }

  const almacen = await cookies();
  const supabase = createServerClient(credenciales.url, credenciales.clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (nuevas) => {
        nuevas.forEach(({ name, value, options }) => almacen.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  return !error;
}
