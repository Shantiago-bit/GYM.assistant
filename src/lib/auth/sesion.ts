import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SesionUsuario {
  email: string;
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const url = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
  const clave =
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

  if (!url || !clave) {
    return null;
  }

  const almacen = await cookies();
  const supabase = createServerClient(url, clave, {
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
