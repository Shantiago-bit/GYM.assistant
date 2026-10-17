import { NextResponse } from 'next/server';
import { z } from 'zod';

import { enviarCorreo } from '@/lib/correo';
import {
  buscarUsuarioPorEmail,
  contarSolicitudesRecuperacion,
  crearTokenRecuperacion,
  invalidarTokensPendientesPorUsuario,
} from '@/lib/dataService';
import { plantillaRecuperacion } from '@/lib/plantillasCorreo';
import { calcularHashToken, generarToken } from '@/lib/tokenRecuperacion';
import { obtenerUrlBase } from '@/lib/urlBase';

const esquemaRecuperar = z.object({
  email: z.string().trim().email('El correo electrónico no es válido.'),
});

const mensajeGenerico = 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.';

export async function POST(request: Request) {
  let cuerpo;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: mensajeGenerico }, { status: 200 });
  }

  const validacion = esquemaRecuperar.safeParse(cuerpo);

  if (!validacion.success) {
    return NextResponse.json({ mensaje: mensajeGenerico }, { status: 200 });
  }

  const email = validacion.data.email.trim().toLowerCase();

  try {
    const usuario = await buscarUsuarioPorEmail(email);

    if (usuario) {
      const solicitudesRecientes = await contarSolicitudesRecuperacion(usuario.id);

      if (solicitudesRecientes < 3) {
        await invalidarTokensPendientesPorUsuario(usuario.id);

        const token = generarToken();
        const tokenHash = calcularHashToken(token);
        const expiraEn = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        await crearTokenRecuperacion(usuario.id, tokenHash, expiraEn);

        const enlace = `${obtenerUrlBase()}/restablecer-contrasena?token=${token}`;
        const html = plantillaRecuperacion(enlace);

        await enviarCorreo({
          para: usuario.email || email,
          asunto: 'Restablecer contraseña',
          html,
        });
      }
    }
  } catch {
    // Se responde con el mismo mensaje genérico para no revelar si el correo existe o si el envío falló.
  }

  return NextResponse.json({ mensaje: mensajeGenerico }, { status: 200 });
}
