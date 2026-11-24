import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { LogotipoKairos } from '@/components/marca/LogotipoKairos';

export const metadata = { title: 'Cambiar contraseña' };

export default function ChangePasswordPage() {
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <LogotipoKairos variante="apilada" tamano="md" className="mb-2" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primario">
            Mi cuenta
          </p>
          <h1 className="mt-3 text-titulo-1 font-bold text-texto">
            Cambiar contraseña
          </h1>
        </div>

        <ChangePasswordForm />
      </div>
    </main>
  );
}
