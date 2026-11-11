import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verificarEnlaceDeCorreo } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

// Tipos que puede traer el enlace del correo de confirmación que envía la app.
const TIPOS: EmailOtpType[] = ['signup', 'magiclink'];
const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Inicia sesión o regístrate de nuevo.';

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const tipo = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && tipo && TIPOS.includes(tipo) && (await verificarEnlaceDeCorreo(tokenHash, tipo))) {
    return NextResponse.redirect(new URL('/gym', origin));
  }

  const destino = new URL('/login', origin);
  destino.searchParams.set('mensaje', ENLACE_INVALIDO);
  return NextResponse.redirect(destino);
}
