'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const inputClassName =
  'w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const buttonClassName =
  'w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70';

export function ChangePasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session?.user));
      setEmail(session?.user?.email ?? '');
      setIsCheckingSession(false);
    });

    void supabase.auth
      .getUser()
      .then(({ data: { user }, error: userError }) => {
        if (!active) return;
        if (userError) {
          console.error('No se pudo verificar la sesión:', userError);
          setError('No se pudo verificar tu sesión. Inicia sesión de nuevo.');
        }
        setIsAuthenticated(Boolean(user && !userError));
        setEmail(userError ? '' : (user?.email ?? ''));
        setIsCheckingSession(false);
      })
      .catch((userError: unknown) => {
        if (!active) return;
        console.error('No se pudo verificar la sesión:', userError);
        setError('No se pudo verificar tu sesión. Inicia sesión de nuevo.');
        setIsCheckingSession(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isAuthenticated || !email) {
      router.replace('/login');
      return;
    }
    if (!currentPassword) {
      setError('Introduce tu contraseña actual.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente de la actual.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: authenticationError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (authenticationError) {
        setError(
          authenticationError.status === 400 || authenticationError.status === 401
            ? 'La contraseña actual es incorrecta.'
            : 'No se pudo verificar tu contraseña actual. Inténtalo de nuevo.',
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        console.error('No se pudo actualizar la contraseña:', updateError);
        setError('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Tu contraseña se cambió correctamente.');
    } catch (updateError) {
      console.error('Error al cambiar la contraseña:', updateError);
      setError('No se pudo conectar con el servicio de autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <p className="text-center text-sm text-slate-600" role="status">
        Verificando tu sesión...
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm leading-6 text-slate-600">
          Inicia sesión para cambiar la contraseña de tu cuenta.
        </p>
        <Link
          href="/login?next=%2Faccount%2Fpassword"
          className="inline-block text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline"
        >
          Iniciar sesión para cambiarla
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      <div>
        <label htmlFor="account-email" className="mb-2 block text-sm font-medium text-slate-700">
          Cuenta
        </label>
        <input
          id="account-email"
          type="email"
          value={email}
          readOnly
          className={`${inputClassName} bg-slate-50`}
        />
      </div>
      <div>
        <label htmlFor="current-password" className="mb-2 block text-sm font-medium text-slate-700">
          Contraseña actual
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClassName}
          aria-describedby="password-requirement"
        />
        <p id="password-requirement" className="mt-2 text-xs text-slate-500">
          Debe tener al menos 8 caracteres.
        </p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {success}
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className={buttonClassName}>
        {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
      <p className="text-center">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
        >
          Volver al inicio
        </Link>
      </p>
    </form>
  );
}
