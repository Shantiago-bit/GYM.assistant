import { exigirSesion } from '@/lib/auth/sesion';
import { CHAT_LIMITE_DIARIO } from '@/lib/config/gym';
import { crearClienteChat } from '@/lib/chat/asistente';
import { interpretarConChrono } from '@/lib/chat/interpretar';
import { registrarMensajeChat } from '@/lib/datos/chat';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { esquemaInterpretar } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function limiteDiario(): number {
  const valor = Number.parseInt(process.env.CHAT_LIMITE_DIARIO ?? '', 10);
  return Number.isInteger(valor) && valor >= 0 ? valor : CHAT_LIMITE_DIARIO;
}

// "Que CHRONO lo interprete": envía solo la frase (sin otros datos de la cuenta) y cuenta como un mensaje del
// límite diario de CHRONO. Devuelve las series para la vista previa; no guarda nada.
export const POST = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();
  const { texto, tipo, pesoActualKg } = esquemaInterpretar.parse(await leerCuerpo(request));

  const cliente = crearClienteChat();
  if (!cliente) {
    throw new ErrorDeNegocio('CHAT_NO_CONFIGURADO');
  }
  if (!(await registrarMensajeChat(usuarioId, hoyBogota(), limiteDiario()))) {
    throw new ErrorDeNegocio('LIMITE_CHAT');
  }

  const resultado = await interpretarConChrono(cliente, texto, {
    tipo,
    pesoActualGramos: pesoActualKg === undefined ? null : Math.round(pesoActualKg * 1000),
  });
  if (!resultado.ok) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', resultado.error);
  }
  return responderOk({ series: resultado.series, avisos: resultado.avisos });
});
