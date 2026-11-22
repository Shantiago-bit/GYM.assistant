import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export const metadata = { title: 'Cambiar contraseña · Gym Assistant' };

export default function ChangePasswordPage() {
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-borde bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primario-suave text-xl font-bold text-primario">
            G
          </div>
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
