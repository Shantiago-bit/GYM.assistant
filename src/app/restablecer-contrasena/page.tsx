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
      <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada backdrop-blur-xl sm:p-8 text-center">
          <h1 className="text-titulo-1 font-bold text-texto">Enlace inválido</h1>
          <p className="mt-4 text-sm leading-6 text-texto-suave">
            El enlace para restablecer la contraseña no es válido o ya venció.
          </p>
          <a
            href="/recuperar-contrasena"
            className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-primario to-primario-fuerte px-4 py-3 text-base font-semibold text-white shadow-elevada transition hover:translate-y-[-1px] hover:shadow-elevada"
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
