import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { MENSAJES } from '@/lib/reglas/errores';

function responderSinSesion(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        ok: false,
        error: { codigo: 'NO_AUTORIZADO', mensaje: MENSAJES.NO_AUTORIZADO, detalles: null },
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
  const clave =
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

  if (!url || !clave) {
    return responderSinSesion(request);
  }

  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? respuesta : responderSinSesion(request);
}

export const config = {
  matcher: ['/gym/:path*', '/api/gym/:path*'],
};
