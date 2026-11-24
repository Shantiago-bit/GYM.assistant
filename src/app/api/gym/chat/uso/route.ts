import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/auth/sesion';
import { limiteDiarioChat } from '@/lib/chat/limite';
import { obtenerMensajesChatDia } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';

export const dynamic = 'force-dynamic';

// Cuántos mensajes de CHRONO lleva hoy la cuenta de la sesión (el contador del encabezado del chat). Solo lee.
export const GET = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  const usados = await obtenerMensajesChatDia(usuarioId, hoyBogota());
  return NextResponse.json({ usados, limite: limiteDiarioChat() }, { headers: { 'Cache-Control': 'no-store' } });
});
