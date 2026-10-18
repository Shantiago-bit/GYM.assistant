'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegistroForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsSuccess(false);

    if (!EMAIL_REGEX.test(email.trim())) {
      setMessage('Introduce un correo válido.');
      return;
    }
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!supabase) {
      setMessage('El registro requiere configurar Supabase en .env.local.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: email.trim().split('@')[0] },
        },
      });

      if (error) {
        setMessage('No se pudo crear la cuenta. Revisa el correo y vuelve a intentarlo.');
        return;
      }

      setPassword('');
      setConfirmation('');
      if (data.session) {
        router.push('/');
        router.refresh();
        return;
      }

      setIsSuccess(true);
      setMessage('Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.');
    } catch {
      setMessage('No se pudo conectar con el servicio de registro. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      <div>
        <label htmlFor="registro-email" className="mb-2 block text-sm font-medium text-slate-700">
          Correo electrónico
        </label>
        <input
          id="registro-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@ejemplo.com"
          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label htmlFor="registro-password" className="mb-2 block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="registro-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          aria-describedby="registro-password-hint"
        />
        <p id="registro-password-hint" className="mt-2 text-xs text-slate-500">
          Mínimo 8 caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="registro-confirmacion" className="mb-2 block text-sm font-medium text-slate-700">
          Confirmar contraseña
        </label>
        <input
          id="registro-confirmacion"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {message ? (
        <p className={`text-sm font-medium ${isSuccess ? 'text-emerald-700' : 'text-red-600'}`} role={isSuccess ? 'status' : 'alert'}>
          {message}
        </p>
      ) : null}

      {!supabase ? (
        <p className="text-sm font-medium text-amber-700" role="alert">
          El registro requiere configurar Supabase en .env.local.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !supabase}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Registrarme'}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}