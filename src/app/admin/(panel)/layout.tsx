import type { ReactNode } from 'react';
import { BarraSuperiorAdmin } from '@/components/admin/BarraSuperiorAdmin';
import { MenuAdmin } from '@/components/admin/MenuAdmin';
import { VigilanteInactividad } from '@/components/admin/VigilanteInactividad';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { obtenerContadoresMenu, obtenerPerfil } from '@/lib/dataService';
import { hoyBogota } from '@/lib/reglas/fechas';
import { nombreParaMostrar } from '@/lib/reglas/perfil';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await exigirAdminDePagina();
  const [perfil, contadores] = await Promise.all([obtenerPerfil(admin.id), obtenerContadoresMenu(hoyBogota())]);
  const nombre = perfil ? nombreParaMostrar(perfil.nombre, perfil.apodo) : 'Administración';

  return (
    <div className="lg:pl-72">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-10">
        <MenuAdmin contadores={contadores} />
        <BarraSuperiorAdmin nombre={nombre} rol={admin.rol} />
        <main id="contenido" tabIndex={-1} className="space-y-6 outline-none">
          {children}
        </main>
      </div>
      <VigilanteInactividad />
    </div>
  );
}
