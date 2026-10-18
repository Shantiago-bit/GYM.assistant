import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistroForm } from './RegistroForm';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signUp: vi.fn(),
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

describe('registro form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabase = { auth: { signUp: mocks.signUp } };
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('registra correo y contraseña mediante Supabase Auth', async () => {
    render(<RegistroForm />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: '  SANTIAGO@example.com ' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secure-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'secure-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'santiago@example.com',
      password: 'secure-password-123',
      options: { data: { full_name: 'SANTIAGO' } },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/enlace para confirmar/i);
  });

  it('no registra contraseñas que no coinciden', () => {
    render(<RegistroForm />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'santiago@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secure-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('requires Supabase configuration before submitting', () => {
    mocks.supabase = null;
    render(<RegistroForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(/requiere configurar Supabase/i);
    expect(screen.getByRole('button', { name: 'Registrarme' })).toBeDisabled();
  });

  it('opens the home page when Supabase creates an active session', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: 'session' } }, error: null });
    render(<RegistroForm />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'santiago@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secure-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'secure-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    expect(mocks.refresh).toHaveBeenCalled();
  });
});