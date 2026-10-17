import { NextResponse } from 'next/server';
import { z } from 'zod';

import { enviarCorreo } from '@/lib/correo';

const esquemaCorreo = z.object({
  para: z.string().trim().email('El correo electrónico no es válido.'),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'La prueba de correo no está disponible en producción.' },
      { status: 404 },
    );
  }

  let cuerpo;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es válido.' },
      { status: 400 },
    );
  }

  const resultado = esquemaCorreo.safeParse(cuerpo);

  if (!resultado.success) {
    return NextResponse.json(
      {
        error: resultado.error.issues[0]?.message || 'El correo electrónico no es válido.',
      },
      { status: 400 },
    );
  }

  const respuesta = await enviarCorreo({
    para: resultado.data.para,
    asunto: 'Prueba de correo',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Prueba de correo</h2>
        <p>Este es un correo de prueba enviado desde Gym Assistant.</p>
        <p>Si recibes este mensaje, la configuración de correo está funcionando correctamente.</p>
      </div>
    `,
  });

  if (!respuesta.ok) {
    return NextResponse.json({ error: respuesta.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: respuesta.id }, { status: 200 });
}
