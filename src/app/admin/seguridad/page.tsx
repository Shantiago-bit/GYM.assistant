import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioDosPasos } from '@/components/admin/FormularioDosPasos';
import { VigilanteInactividad } from '@/components/admin/VigilanteInactividad';
import { exigirAdminDePagina } from '@/lib/auth/admin';

export const metadata: Metadata = { title: 'Verificación en dos pasos · Administración · Gym Assistant' };

// Única página de /admin que se abre sin la verificación en dos pasos: aquí se registra el factor (QR) o se
// escribe el código para pasar la sesión a aal2.
export default async function SeguridadAdminPage() {
  const admin = await exigirAdminDePagina({ permitirSinVerificar: true });
  if (admin.aal === 'aal2') redirect('/admin');

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4 py-10 outline-none">
      <div className="vidrio w-full max-w-lg space-y-4 p-6 sm:p-8">
        <h1 className="text-titulo-1 font-bold text-texto">Verificación en dos pasos</h1>
        <p className="text-sm text-texto-suave">
          Para administrar Gym Assistant hace falta, además de la contraseña, un código de una app de autenticación.
          Así, aunque alguien conociera tu contraseña, no podría entrar al panel.
        </p>
        <FormularioDosPasos />
        <p className="border-t border-borde pt-4 text-sm">
          <Link href="/gym" className="font-semibold text-primario underline-offset-4 hover:underline">
            Volver a la app
          </Link>
        </p>
      </div>
      <VigilanteInactividad />
    </main>
  );
}
