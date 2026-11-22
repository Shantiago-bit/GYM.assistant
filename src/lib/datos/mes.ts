import { obtenerHistorialDias } from '@/lib/datos/diasEntrenamiento';
import { obtenerDatosInicio } from '@/lib/datos/inicio';
import { mesAnterior, primerDia, resumenMes, type ResumenMes } from '@/lib/reglas/resumenMes';

// "Tu mes en el gym" de una cuenta: las sesiones desde el primer día del mes anterior (para comparar) y las marcas de
// todo el historial (para los récords), con la misma consulta agregada del inicio.
export async function obtenerResumenMes(usuarioId: string, mes: string): Promise<ResumenMes> {
  const [datos, historialDias] = await Promise.all([
    obtenerDatosInicio(usuarioId, primerDia(mesAnterior(mes))),
    obtenerHistorialDias(usuarioId),
  ]);
  return resumenMes({ mes, sesiones: datos.sesiones, marcas: datos.marcas, historialDias });
}
