'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
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
        setAuthError(
          error.status === 400 || error.status === 401
            ? 'Correo o contraseña incorrectos'
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
        return;
      }

      const requestedDestination = new URLSearchParams(window.location.search).get('next');
      const destination = requestedDestination === '/account/password' ? requestedDestination : '/';

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
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Correo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@ejemplo.com"
          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="mt-2 text-sm text-red-600">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password ? (
          <p id="password-error" className="mt-2 text-sm text-red-600">
            {errors.password}
          </p>
        ) : null}
      </div>

      {!supabase ? (
        <p className="text-sm font-medium text-amber-700" role="alert">
          El acceso requiere la URL y la clave pública de Supabase en .env.local.
        </p>
      ) : null}
      {authError ? <p className="text-sm font-medium text-red-600">{authError}</p> : null}
      {successMessage ? (
        <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !supabase}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
      </button>

      <div className="space-y-2 text-center">
        <p>
          <Link
            href="/registro"
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            Crear una cuenta
          </Link>
        </p>
        <p>
          <Link
            href="/recuperar-contrasena"
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p>
          <Link
            href="/account/password"
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            Cambiar contraseña
          </Link>
        </p>
      </div>
    </form>
  );
}
