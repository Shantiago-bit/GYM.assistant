'use client';

import { useState } from 'react';

export function PruebaCorreoFormulario() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const manejarEnviar = async () => {
    setMensaje('');
    setIsSubmitting(true);

    try {
      const respuesta = await fetch('/api/correo/prueba', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ para: email }),
      });

      const contenido = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(contenido.error || 'No se pudo enviar el correo.');
      }

      setMensaje('Correo enviado');
      setEmail('');
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'No se pudo enviar el correo.';
      setMensaje(mensajeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Gym Assistant
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Prueba de correo</h1>
        </div>

        <label htmlFor="correo-prueba" className="mb-2 block text-sm font-medium text-slate-700">
          Correo destinatario
        </label>
        <input
          id="correo-prueba"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@ejemplo.com"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <button
          type="button"
          onClick={manejarEnviar}
          disabled={isSubmitting}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar prueba'}
        </button>

        {mensaje ? (
          <p className="mt-4 text-sm font-medium text-emerald-700">{mensaje}</p>
        ) : null}
      </div>
    </main>
  );
}
