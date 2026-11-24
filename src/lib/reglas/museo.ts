import { mesDeFecha } from '@/lib/reglas/resumenMes';

// El Museo (/gym/museo) exhibe los récords y registros que la app ya calcula; aquí solo se ordenan para mostrarlos.

export const MESES_GALERIA = 12;

export interface CuadroMes {
  mes: string; // AAAA-MM
  dias: number; // días con al menos una sesión
  actual: boolean;
}

// "Galería de meses": el mes en curso siempre (aunque aún no tenga sesiones) y los anteriores con sesiones, del
// más reciente al más antiguo, como mucho `maximo`.
export function galeriaDeMeses(fechas: string[], hoy: string, maximo = MESES_GALERIA): CuadroMes[] {
  const actual = mesDeFecha(hoy);
  const dias = new Map<string, Set<string>>([[actual, new Set()]]);
  for (const fecha of fechas) {
    if (fecha > hoy) continue;
    const mes = mesDeFecha(fecha);
    if (!dias.has(mes)) dias.set(mes, new Set());
    dias.get(mes)!.add(fecha);
  }
  return [...dias.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, maximo)
    .map(([mes, conjunto]) => ({ mes, dias: conjunto.size, actual: mes === actual }));
}

export const SALAS_MUSEO = [
  { id: 'sala-records', titulo: 'Sala de récords', corto: 'Récords', icono: 'trofeo' },
  { id: 'sala-meses', titulo: 'Galería de meses', corto: 'Meses', icono: 'cuadro' },
  { id: 'sala-archivo', titulo: 'Archivo', corto: 'Archivo', icono: 'archivo' },
] as const;

export const CLAVE_MUSEO_VISTO = 'kairos_museo_visto';
