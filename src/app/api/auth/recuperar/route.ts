import { NextResponse } from 'next/server';
import { z } from 'zod';

import { enviarCorreo } from '@/lib/correo';
import {
  buscarUsuarioPorEmail,
  contarSolicitudesRecuperacion,
  crearTokenRecuperacion,
  invalidarTokensPendientesPorUsuario,
  marcarTokenComoUsado,
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
  let etapa = 'buscar usuario';

  try {
    const usuario = await buscarUsuarioPorEmail(email);

    if (usuario) {
      etapa = 'contar solicitudes';
      const solicitudesRecientes = await contarSolicitudesRecuperacion(usuario.id);

      if (solicitudesRecientes < 3) {
        etapa = 'crear token';
        const token = generarToken();
        const tokenHash = calcularHashToken(token);
        const expiraEn = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const registro = await crearTokenRecuperacion(usuario.id, tokenHash, expiraEn);

        const enlace = `${obtenerUrlBase()}/restablecer-contrasena?token=${token}`;
        const html = plantillaRecuperacion(enlace);

        etapa = 'enviar correo';
        const resultadoCorreo = await enviarCorreo({
          para: usuario.email || email,
          asunto: 'Restablecer contraseña',
          html,
        });

        if (!resultadoCorreo.ok) {
          etapa = 'invalidar token no enviado';
          await marcarTokenComoUsado(registro.id);
          console.error('No se pudo enviar el correo de recuperación.');
        } else {
          etapa = 'invalidar tokens anteriores';
          await invalidarTokensPendientesPorUsuario(usuario.id, registro.id);
        }
      }
    }
  } catch (error) {
    const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    console.error('Error procesando solicitud de recuperación de contraseña:', { etapa, codigo });
  }

  return NextResponse.json({ mensaje: mensajeGenerico }, { status: 200 });
}
