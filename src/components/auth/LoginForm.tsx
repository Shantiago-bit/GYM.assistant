'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReenviarConfirmacion } from '@/components/auth/ReenviarConfirmacion';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  // Si el correo no está confirmado, se ofrece reenviar el enlace a esa dirección.
  const [sinConfirmar, setSinConfirmar] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const mensaje = new URLSearchParams(window.location.search).get('mensaje');
    if (mensaje) {
      setSuccessMessage(mensaje);
    }
  }, []);

  const validateForm = () => {
    const nextErrors = {
      email: '',
      password: '',
    };

    if (!email.trim()) {
      nextErrors.email = 'El correo es obligatorio.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Introduce un correo válido.';
    }

    if (!password.trim()) {
      nextErrors.password = 'La contraseña es obligatoria.';
    }

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setSinConfirmar('');

    if (!validateForm()) {
      return;
    }

    if (!supabase) {
      setAuthError(
        'El inicio de sesión no está configurado. Añade la URL y la clave pública de Supabase en .env.local.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.code === 'email_not_confirmed') setSinConfirmar(email.trim().toLowerCase());
        // Supabase solo dice "sin confirmar" cuando la contraseña es correcta.
        setAuthError(
          error.code === 'email_not_confirmed'
            ? 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada (y el spam). Si tienes menos de 12 años, primero tu mamá, papá o tutor debe autorizar la cuenta.'
            : error.status === 400 || error.status === 401
              ? 'Correo o contraseña incorrectos'
              : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
        return;
      }

      const requestedDestination = new URLSearchParams(window.location.search).get('next');
      const destination = requestedDestination === '/account/password' ? requestedDestination : '/gym';

      router.push(destination);
      router.refresh();
    } catch (error) {
      console.error('Error al conectar con Supabase Auth:', error);
      setAuthError('No se pudo conectar con el servicio de autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-texto">
          Correo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@ejemplo.com"
          className="w-full rounded-2xl border border-borde bg-white px-4 py-3 text-base text-texto outline-none transition placeholder:text-texto-suave focus:border-primario focus:ring-2 focus:ring-primario-suave"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="mt-2 text-sm text-peligro">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-texto">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-borde bg-white px-4 py-3 text-base text-texto outline-none transition placeholder:text-texto-suave focus:border-primario focus:ring-2 focus:ring-primario-suave"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password ? (
          <p id="password-error" className="mt-2 text-sm text-peligro">
            {errors.password}
          </p>
        ) : null}
      </div>

      {!supabase ? (
        <p className="text-sm font-medium text-aviso" role="alert">
          El acceso requiere la URL y la clave pública de Supabase en .env.local.
        </p>
      ) : null}
      {authError ? <p className="text-sm font-medium text-peligro">{authError}</p> : null}
      {sinConfirmar ? (
        <ReenviarConfirmacion
          key={sinConfirmar}
          correo={sinConfirmar}
          esperarAlInicio={false}
          textoBoton="Reenviar enlace de confirmación"
        />
      ) : null}
      {successMessage ? (
        <p className="text-sm font-medium text-primario">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !supabase}
        className="w-full rounded-2xl bg-gradient-to-r from-primario to-primario-fuerte px-4 py-3 text-base font-semibold text-white shadow-elevada transition hover:translate-y-[-1px] hover:shadow-elevada disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none"
      >
        {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
      </button>

      <div className="space-y-2 text-center">
        <p>
          <Link
            href="/registro"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline"
          >
            Crear una cuenta
          </Link>
        </p>
        <p>
          <Link
            href="/recuperar-contrasena"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p>
          <Link
            href="/account/password"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline"
          >
            Cambiar contraseña
          </Link>
        </p>
      </div>
    </form>
  );
}
