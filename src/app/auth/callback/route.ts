import { NextResponse } from 'next/server';
import { canjearCodigoDeConfirmacion } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Inicia sesión o regístrate de nuevo.';
const CORREO_CONFIRMADO = 'Tu correo está confirmado. Inicia sesión para continuar.';

function aLogin(origen: string, mensaje: string): NextResponse {
  const destino = new URL('/login', origen);
  destino.searchParams.set('mensaje', mensaje);
  return NextResponse.redirect(destino);
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const codigo = searchParams.get('code');

  if (!codigo || searchParams.has('error')) {
    return aLogin(origin, ENLACE_INVALIDO);
  }

  // Supabase solo entrega el código tras verificar el correo. Si el canje falla, por ejemplo al abrir
  // el enlace en otro navegador, el correo ya quedó confirmado y basta con iniciar sesión.
  if (await canjearCodigoDeConfirmacion(codigo)) {
    return NextResponse.redirect(new URL('/gym', origin));
  }

  return aLogin(origin, CORREO_CONFIRMADO);
}
