import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  actualizarContrasena,
  buscarTokenVigentePorHash,
  invalidarTokensPendientesPorUsuario,
  marcarTokenComoUsado,
} from '@/lib/dataService';
import { calcularHashToken } from '@/lib/tokenRecuperacion';

const esquemaRestablecer = z
  .object({
    token: z.string().regex(/^[a-fA-F0-9]{64}$/, 'El enlace no es válido o ya venció.'),
    contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden.',
  });

export async function POST(request: Request) {
  let cuerpo;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: 'El enlace no es válido o ya venció.' }, { status: 400 });
  }

  const validacion = esquemaRestablecer.safeParse(cuerpo);

  if (!validacion.success) {
    const error = validacion.error.issues[0]?.message || 'El enlace no es válido o ya venció.';
    return NextResponse.json({ mensaje: error }, { status: 400 });
  }

  const { token, contrasena } = validacion.data;
  const hashToken = calcularHashToken(token);

  try {
    const registro = await buscarTokenVigentePorHash(hashToken);

    if (!registro) {
      return NextResponse.json(
        { mensaje: 'El enlace no es válido o ya venció.' },
        { status: 400 },
      );
    }

    await actualizarContrasena(registro.usuario_id, contrasena);
    await marcarTokenComoUsado(registro.id);
    await invalidarTokensPendientesPorUsuario(registro.usuario_id);

    return NextResponse.json({ mensaje: 'Contraseña actualizada correctamente.' }, { status: 200 });
  } catch {
    return NextResponse.json({ mensaje: 'No se pudo restablecer la contraseña.' }, { status: 500 });
  }
}
