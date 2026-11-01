import { notFound } from 'next/navigation';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerEjercicio, type DetalleEjercicio } from '@/lib/dataService';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export async function cargarEjercicio(id: string): Promise<DetalleEjercicio> {
  const { id: usuarioId } = await exigirSesionDePagina();

  try {
    return await obtenerEjercicio(usuarioId, id);
  } catch (error) {
    if (error instanceof ErrorDeNegocio && error.codigo === 'EJERCICIO_NO_ENCONTRADO') {
      notFound();
    }
    throw error;
  }
}
