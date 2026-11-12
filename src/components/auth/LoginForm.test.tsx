import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInWithPassword: vi.fn(),
  supabase: null as unknown,
}));

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mocks.supabase;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

describe('login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabase = {
      auth: {
        signInWithPassword: mocks.signInWithPassword,
      },
    };
    window.history.replaceState(null, '', '/login');
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('provides access to the change-password option from the login screen', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: 'Cambiar contraseña' })).toHaveAttribute(
      'href',
      '/account/password',
    );
  });

  it('provides access to account registration', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute(
      'href',
      '/registro',
    );
  });

  it('explains when Supabase is not configured', () => {
    mocks.supabase = null;
    render(<LoginForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(/requiere la URL y la clave pública de Supabase/i);
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
  });

  it('returns to the change-password screen after login when requested', async () => {
    window.history.replaceState(null, '', '/login?next=%2Faccount%2Fpassword');
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'current-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/account/password'));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('ignores untrusted redirect destinations after login', async () => {
    window.history.replaceState(null, '', '/login?next=https%3A%2F%2Fattacker.example');
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'current-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym'));
  });
});

describe('login con el correo sin confirmar', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('explica la situación y ofrece reenviar el enlace de confirmación a ese correo', async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, datos: { mensaje: 'Si hay una cuenta pendiente de confirmar con ese correo, te enviamos un nuevo enlace.' } }),
    });
    vi.stubGlobal('fetch', fetchFalso);
    mocks.supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: { code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' } }),
      },
    };
    render(<LoginForm />);
    fireEvent.change(document.querySelector('#email')!, { target: { value: ' Ana@Ejemplo.com ' } });
    fireEvent.change(document.querySelector('#password')!, { target: { value: 'secreta-123' } });
    fireEvent.click(document.querySelector('button[type=submit]')!);

    expect(await screen.findByText(/Tu correo aún no está confirmado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace de confirmación' }));
    await waitFor(() => expect(fetchFalso).toHaveBeenCalled());
    expect(JSON.parse(fetchFalso.mock.calls[0]![1].body)).toEqual({ email: 'ana@ejemplo.com' });
    expect(await screen.findByText(/te enviamos un nuevo enlace/)).toBeInTheDocument();
  });
});
