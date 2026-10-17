'use client';

import { useState } from 'react';

const inputClassName =
  'w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const buttonClassName =
  'w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const manejarSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensaje('');
    setIsSubmitting(true);

    try {
      const respuesta = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const contenido = await respuesta.json();
      setMensaje(
        contenido.mensaje || 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.',
      );
    } catch {
      setMensaje('No se pudo enviar la solicitud en este momento. Inténtalo de nuevo.');
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
            Recuperar contraseña
          </h1>
        </div>

        <form onSubmit={manejarSubmit} className="w-full space-y-5" noValidate>
          <div>
            <label htmlFor="email-recuperar" className="mb-2 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="email-recuperar"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className={inputClassName}
            />
          </div>

          {mensaje ? (
            <p className="text-sm font-medium text-emerald-700" role="status">
              {mensaje}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={buttonClassName}>
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>

          <p className="text-center">
            <a href="/login" className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline">
              Volver al login
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
