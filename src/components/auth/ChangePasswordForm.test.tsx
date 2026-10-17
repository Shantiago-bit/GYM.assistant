import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from './ChangePasswordForm';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: vi.fn() }),
}));

describe('change password form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { email: 'user@example.com' } },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('requires a valid logged-in session before showing the password form', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    render(<ChangePasswordForm />);

    expect(
      await screen.findByText(/inicia sesión para cambiar la contraseña/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión para cambiarla' })).toHaveAttribute(
      'href',
      '/login?next=%2Faccount%2Fpassword',
    );
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
  });

  it('checks the current password before updating the signed-in user', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { status: 400, message: 'Invalid login credentials' },
    });
    render(<ChangePasswordForm />);

    fireEvent.change(await screen.findByLabelText('Contraseña actual'), {
      target: { value: 'wrong-current-password' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'new-password-2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: 'new-password-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña actual es incorrecta.',
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrong-current-password',
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password only after reauthenticating the account', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    render(<ChangePasswordForm />);

    fireEvent.change(await screen.findByLabelText('Contraseña actual'), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'new-password-2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: 'new-password-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-password-2026' }),
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'current-password',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu contraseña se cambió correctamente.',
    );
  });
});
