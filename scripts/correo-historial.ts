// npm run correo:historial -- <correo>
// Muestra los últimos 20 intentos de envío a ese correo (registro_correos), con la hora de Colombia.
// Busca por el hash del correo: para ver los registros de producción, .env.local debe tener el mismo
// REGISTRO_SECRETO_IP que Vercel (si en Vercel no está, ninguno de los dos lo necesita).
import { hashDestinatario } from '@/lib/correo';
import { cerrarConexiones, historialDeCorreo } from '@/lib/dataService';
import { mascaraCorreo } from '@/lib/reglas/correo';

const correo = process.argv[2];
if (!correo || !correo.includes('@')) {
  console.error('Uso: npm run correo:historial -- <correo>');
  process.exit(1);
}

try {
  const registros = await historialDeCorreo(hashDestinatario(correo), 20);
  console.log(`Historial de ${mascaraCorreo(correo)} (más reciente primero, hora de Colombia):`);
  if (registros.length === 0) {
    console.log('  Sin registros en los últimos 30 días. Si esperabas alguno, revisa que REGISTRO_SECRETO_IP coincida con Vercel.');
  }
  for (const r of registros) {
    const detalle = [
      r.motivo ? `motivo=${r.motivo}` : null,
      r.proveedor ? `proveedor=${r.proveedor}` : null,
      r.duracionMs !== null ? `${r.duracionMs} ms` : null,
      r.idMensaje ? `id=${r.idMensaje}` : null,
      r.error ? `error="${r.error}"` : null,
    ]
      .filter(Boolean)
      .join('  ');
    console.log(`  ${r.creadoEn}  ${r.tipo.padEnd(31)} ${r.resultado.padEnd(9)} ${detalle}`);
  }
} catch (error) {
  console.error('No se pudo leer el historial:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await cerrarConexiones();
}
