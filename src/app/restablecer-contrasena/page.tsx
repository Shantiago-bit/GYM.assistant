import { redirect } from 'next/navigation';

import { RestablecerContrasenaFormulario } from './restablecer-contrasena-form';

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  const parametros = (await Promise.resolve(searchParams ?? {})) as Record<string, string | string[] | undefined>;
  const token = Array.isArray(parametros.token) ? parametros.token[0] : parametros.token ?? '';

  if (!token || !/^[a-fA-F0-9]{64}$/.test(token)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(135deg,#f7fbf7_0%,#eefaf1_45%,#f5faf5_100%)] px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] backdrop-blur-xl sm:p-8 text-center">
          <h1 className="text-3xl font-black tracking-[-0.06em] text-slate-900">Enlace inválido</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            El enlace para restablecer la contraseña no es válido o ya venció.
          </p>
          <a
            href="/recuperar-contrasena"
            className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25"
          >
            Solicitar un nuevo enlace
          </a>
        </div>
      </main>
    );
  }

  return <RestablecerContrasenaFormulario token={token} />;
}

export async function generateMetadata() {
  return {
    title: 'Restablecer contraseña',
  };
}
