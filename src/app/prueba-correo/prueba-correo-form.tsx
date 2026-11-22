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
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-borde bg-white p-6 shadow-suave">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primario">
            Gym Assistant
          </p>
          <h1 className="mt-3 text-titulo-1 font-bold text-texto">Prueba de correo</h1>
        </div>

        <label htmlFor="correo-prueba" className="mb-2 block text-sm font-medium text-texto">
          Correo destinatario
        </label>
        <input
          id="correo-prueba"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@ejemplo.com"
          className="w-full rounded-2xl border border-borde bg-fondo px-4 py-3 text-base text-texto outline-none transition focus:border-primario focus:ring-2 focus:ring-primario-suave"
        />

        <button
          type="button"
          onClick={manejarEnviar}
          disabled={isSubmitting}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-primario to-primario-fuerte px-4 py-3 text-base font-semibold text-white shadow-elevada transition hover:translate-y-[-1px] hover:shadow-elevada disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar prueba'}
        </button>

        {mensaje ? (
          <p className="mt-4 text-sm font-medium text-primario">{mensaje}</p>
        ) : null}
      </div>
    </main>
  );
}
