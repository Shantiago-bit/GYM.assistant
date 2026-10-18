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

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  });
});
