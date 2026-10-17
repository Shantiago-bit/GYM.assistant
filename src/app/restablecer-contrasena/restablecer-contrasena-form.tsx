'use client';

import { useState } from 'react';

const inputClassName =
  'w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const buttonClassName =
  'w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70';

export function RestablecerContrasenaFormulario({ token }: { token: string }) {
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const manejarSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensaje('');
    setIsSubmitting(true);

    try {
      const respuesta = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          contrasena,
          confirmacion,
        }),
      });

      const contenido = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(contenido.mensaje || 'El enlace no es válido o ya venció.');
      }

      window.location.assign(
        '/login?mensaje=' + encodeURIComponent('Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.'),
      );
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(135deg,#f7fbf7_0%,#eefaf1_45%,#f5faf5_100%)] px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700">
            G
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Gym Assistant
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-900">
            Nueva contraseña
          </h1>
        </div>

        <form onSubmit={manejarSubmit} className="w-full space-y-5" noValidate>
          <div>
            <label htmlFor="nueva-contrasena" className="mb-2 block text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <input
              id="nueva-contrasena"
              type="password"
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="confirmar-contrasena" className="mb-2 block text-sm font-medium text-slate-700">
              Confirmar contraseña
            </label>
            <input
              id="confirmar-contrasena"
              type="password"
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          {mensaje ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {mensaje}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={buttonClassName}>
            {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
