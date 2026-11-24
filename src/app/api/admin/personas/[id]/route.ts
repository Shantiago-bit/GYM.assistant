import { exigirAdmin } from '@/lib/auth/admin';
import { obtenerDetallePersona, registrarAuditoria } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { edadDesde, esIdValido } from '@/lib/reglas/personasAdmin';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

// Detalle de una persona (con el correo completo): cada apertura queda en la auditoría. Se entrega la EDAD, no la
// fecha de nacimiento.
export const GET = conManejoDeErrores(async (_request: Request, { params }: Contexto) => {
  const admin = await exigirAdmin();
  const { id } = await params;
  if (!esIdValido(id)) throw new ErrorDeNegocio('RECURSO_NO_ENCONTRADO');
  const detalle = await obtenerDetallePersona(id, hoyBogota());
  if (!detalle) throw new ErrorDeNegocio('RECURSO_NO_ENCONTRADO');
  await registrarAuditoria({ adminId: admin.id, accion: 'ver_usuario', objetivoUsuarioId: id, detalle: { origen: 'api' } });
  const { fechaNacimiento, ...resto } = detalle;
  return responderOk({ ...resto, edad: fechaNacimiento ? edadDesde(fechaNacimiento, hoyBogota()) : null });
});
