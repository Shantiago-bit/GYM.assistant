// Opciones del menú del panel. `disponible: false` se muestra como "Próximamente" (se construye en las partes 2
// y 3); así la estructura queda completa desde el principio sin enlaces que lleven a un 404.
import type { ContadoresMenu } from '@/lib/datos/admin';

export interface OpcionMenu {
  texto: string;
  href: string;
  disponible: boolean;
  contador?: { clave: keyof Pick<ContadoresMenu, 'personasPendientes' | 'correosConError24h'>; descripcion: string };
}

export interface SeccionMenu {
  titulo: string;
  opciones: OpcionMenu[];
}

export const SECCIONES_MENU: SeccionMenu[] = [
  {
    titulo: 'Plataforma',
    opciones: [
      { texto: 'Resumen', href: '/admin', disponible: true },
      {
        texto: 'Personas',
        href: '/admin/personas',
        disponible: true,
        contador: { clave: 'personasPendientes', descripcion: 'cuentas pendientes (sin confirmar o esperando al tutor)' },
      },
      { texto: 'Entrenamiento', href: '/admin/entrenamiento', disponible: false },
    ],
  },
  {
    titulo: 'Crecimiento',
    opciones: [
      { texto: 'Analítica', href: '/admin/analitica', disponible: false },
      { texto: 'CHRONO', href: '/admin/chrono', disponible: false },
      { texto: 'Metas', href: '/admin/metas', disponible: true },
    ],
  },
  {
    titulo: 'Operación',
    opciones: [
      {
        texto: 'Correos',
        href: '/admin/correos',
        disponible: false,
        contador: { clave: 'correosConError24h', descripcion: 'correos con error en las últimas 24 horas' },
      },
      { texto: 'Auditoría', href: '/admin/auditoria', disponible: true },
      { texto: 'Sistema', href: '/admin/sistema', disponible: false },
    ],
  },
];
