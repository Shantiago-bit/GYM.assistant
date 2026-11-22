'use client';

import { useState } from 'react';

const inputClassName =
  'w-full rounded-2xl border border-borde bg-white px-4 py-3 text-base text-texto outline-none transition placeholder:text-texto-suave focus:border-primario focus:ring-2 focus:ring-primario-suave';
const buttonClassName =
  'w-full rounded-2xl bg-gradient-to-r from-primario to-primario-fuerte px-4 py-3 text-base font-semibold text-white shadow-elevada transition hover:translate-y-[-1px] hover:shadow-elevada disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none';

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
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-borde bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primario-suave text-xl font-bold text-primario">
            G
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primario">
            Gym Assistant
          </p>
          <h1 className="mt-3 text-titulo-1 font-bold text-texto">
            Nueva contraseña
          </h1>
        </div>

        <form onSubmit={manejarSubmit} className="w-full space-y-5" noValidate>
          <div>
            <label htmlFor="nueva-contrasena" className="mb-2 block text-sm font-medium text-texto">
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
            <label htmlFor="confirmar-contrasena" className="mb-2 block text-sm font-medium text-texto">
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
            <p className="text-sm font-medium text-peligro" role="alert">
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
