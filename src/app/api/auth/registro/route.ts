import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorEnvioConfirmacion, registrarCuenta } from '@/lib/auth/registro';

export const dynamic = 'force-dynamic';

const esquemaRegistro = z.object({
  email: z.string().trim().email('Introduce un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72, 'La contraseña admite hasta 72 caracteres.'),
});

// La misma respuesta para correos nuevos y ya registrados: no revela qué cuentas existen.
const MENSAJE = 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.';

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la solicitud no es válido.' }, { status: 400 });
  }

  const datos = esquemaRegistro.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Revisa los datos.' }, { status: 400 });
  }

  try {
    await registrarCuenta(datos.data.email, datos.data.password);
    return NextResponse.json({ mensaje: MENSAJE });
  } catch (error) {
    console.error('Error al registrar una cuenta:', error instanceof Error ? error.message : error);
    const mensaje =
      error instanceof ErrorEnvioConfirmacion
        ? 'No se pudo enviar el correo de confirmación. Intenta de nuevo en unos minutos.'
        : 'No se pudo crear la cuenta. Intenta de nuevo.';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
