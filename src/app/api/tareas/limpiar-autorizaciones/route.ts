import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eliminarCuentaConDatos, listarCuentasParaLimpiar } from '@/lib/dataService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const huella = (texto: string) => createHash('sha256').update(texto).digest();

// Vercel Cron llama con "Authorization: Bearer <CRON_SECRET>". Se comparan huellas de igual largo en tiempo
// constante.
function autorizado(request: Request, secreto: string): boolean {
  const recibido = request.headers.get('authorization') ?? '';
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

// Tarea programada (vercel.json): elimina las cuentas de menores cuyo tutor rechazó la solicitud o no respondió
// a tiempo, con su perfil, sus solicitudes y su foto. En los logs solo quedan los conteos.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET?.trim();
  if (!secreto) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET no está configurado.' }, { status: 503 });
  }
  if (!autorizado(request, secreto)) {
    return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }

  const cuentas = await listarCuentasParaLimpiar();
  let eliminadas = 0;
  for (const cuenta of cuentas) {
    try {
      await eliminarCuentaConDatos(cuenta);
      eliminadas += 1;
    } catch {
      // Se reintenta en la próxima ejecución.
    }
  }
  const fallidas = cuentas.length - eliminadas;
  console.log(`Limpieza de autorizaciones: ${eliminadas} cuentas eliminadas, ${fallidas} pendientes de reintento.`);
  return NextResponse.json({ ok: true, datos: { eliminadas, fallidas } }, { headers: { 'Cache-Control': 'no-store' } });
}
