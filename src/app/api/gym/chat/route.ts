import { exigirSesion } from '@/lib/auth/sesion';
import {
  crearClienteChat,
  mensajeDeErrorChat,
  responderChat,
  type EventoChat,
} from '@/lib/chat/asistente';
import { CHAT_LIMITE_DIARIO } from '@/lib/config/gym';
import { registrarMensajeChat } from '@/lib/datos/chat';
import { obtenerPerfil } from '@/lib/datos/perfil';
import { conManejoDeErrores, leerCuerpo } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, esCumpleanos, nombreParaMostrar } from '@/lib/reglas/perfil';
import { esquemaChat } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';
// Una respuesta que consulta datos y arma una rutina puede tardar más que una petición normal.
export const maxDuration = 120;

function limiteDiario(): number {
  const valor = Number.parseInt(process.env.CHAT_LIMITE_DIARIO ?? '', 10);
  return Number.isInteger(valor) && valor >= 0 ? valor : CHAT_LIMITE_DIARIO;
}

// Responde con una línea JSON por evento (NDJSON) para que la página muestre el texto a medida que llega.
export const POST = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();
  const { mensajes } = esquemaChat.parse(await leerCuerpo(request));

  const cliente = crearClienteChat();
  if (!cliente) {
    throw new ErrorDeNegocio('CHAT_NO_CONFIGURADO');
  }

  const hoy = hoyBogota();
  if (!(await registrarMensajeChat(usuarioId, hoy, limiteDiario()))) {
    throw new ErrorDeNegocio('LIMITE_CHAT');
  }

  // CHRONO recibe solo el nombre para llamarla, la edad y si hoy cumple años; nunca la fecha ni el correo.
  const perfil = await obtenerPerfil(usuarioId);
  const persona = perfil
    ? {
        nombre: nombreParaMostrar(perfil.nombre, perfil.apodo),
        edad: calcularEdad(perfil.fechaNacimiento, hoy),
        cumpleanosHoy: esCumpleanos(perfil.fechaNacimiento, hoy),
      }
    : null;

  const codificador = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const emitir = (evento: EventoChat) => {
        try {
          controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
        } catch {
          // La persona cerró la página: no hay a quién enviarle el resto.
        }
      };

      try {
        await responderChat({ cliente, usuarioId, historial: mensajes, hoy, persona, emitir, senal: request.signal });
        emitir({ tipo: 'fin' });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error('Error en el chat de Gym Assistant:', error);
          emitir({ tipo: 'error', mensaje: mensajeDeErrorChat(error) });
        }
      } finally {
        try {
          controlador.close();
        } catch {
          // Ya estaba cerrado.
        }
      }
    },
  });

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
