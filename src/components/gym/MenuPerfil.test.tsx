import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ abrirPanel: vi.fn(), push: vi.fn(), refresh: vi.fn(), signOut: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/components/guia/ProveedorGuia', () => ({ useGuia: () => ({ abrirPanel: mocks.abrirPanel }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));

import { MenuPerfil } from './MenuPerfil';

const abrirConTeclado = () => {
  const boton = screen.getByRole('button', { name: /Santi/ });
  boton.focus();
  fireEvent.keyDown(boton, { key: 'ArrowDown' });
  return boton;
};

describe('MenuPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<MenuPerfil nombre="Santi" avatarUrl={null} claseBoton="" />);
  });

  afterEach(cleanup);

  it('muestra el apodo y las iniciales en lugar del correo', () => {
    const boton = screen.getByRole('button', { name: /Santi/ });
    expect(boton).toHaveAttribute('aria-haspopup', 'menu');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveTextContent('S');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('se abre con la flecha abajo, enfoca la primera opción y recorre con flechas, Inicio y Fin', async () => {
    const boton = abrirConTeclado();

    expect(boton).toHaveAttribute('aria-expanded', 'true');
    const [perfil, guia, salir] = screen.getAllByRole('menuitem');
    expect(perfil).toHaveAttribute('href', '/gym/perfil');
    await waitFor(() => expect(perfil).toHaveFocus());

    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(guia).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(salir).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(perfil).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(salir).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(perfil).toHaveFocus();
  });

  it('Esc cierra el menú y devuelve el foco al botón', async () => {
    const boton = abrirConTeclado();
    await waitFor(() => expect(screen.getAllByRole('menuitem')[0]).toHaveFocus());

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('"Guía" abre el panel de recorridos y "Cerrar sesión" cierra la sesión', async () => {
    fireEvent.click(screen.getByRole('button', { name: /Santi/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Guía' }));
    expect(mocks.abrirPanel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Santi/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
