import { notFound } from 'next/navigation';
import { obtenerEjercicio, type DetalleEjercicio } from '@/lib/dataService';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export async function cargarEjercicio(id: string): Promise<DetalleEjercicio> {
  try {
    return await obtenerEjercicio(id);
  } catch (error) {
    if (error instanceof ErrorDeNegocio && error.codigo === 'EJERCICIO_NO_ENCONTRADO') {
      notFound();
    }
    throw error;
  }
}
