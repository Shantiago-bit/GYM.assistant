'use client';

import { useState } from 'react';
import { LogotipoKairos } from '@/components/marca/LogotipoKairos';

const inputClassName =
  'w-full rounded-2xl border border-borde bg-campo px-4 py-3 text-base text-texto outline-none transition placeholder:text-texto-suave focus:border-primario focus:ring-2 focus:ring-primario-suave';
const buttonClassName =
  'w-full rounded-2xl bg-gradient-to-r from-primario to-primario-fuerte px-4 py-3 text-base font-semibold text-white shadow-elevada transition hover:translate-y-[-1px] hover:shadow-elevada disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none';

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
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <LogotipoKairos variante="apilada" tamano="md" className="mb-2" />
          <h1 className="mt-3 text-titulo-1 font-bold text-texto">
            Recuperar contraseña
          </h1>
        </div>

        <form onSubmit={manejarSubmit} className="w-full space-y-5" noValidate>
          <div>
            <label htmlFor="email-recuperar" className="mb-2 block text-sm font-medium text-texto">
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
            <p className="text-sm font-medium text-primario" role="status">
              {mensaje}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={buttonClassName}>
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>

          <p className="text-center">
            <a href="/login" className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline">
              Volver al login
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
