import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/gym/entrenamiento' }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('@/components/guia/ProveedorGuia', () => ({ useGuia: () => ({ abrirPanel: vi.fn() }) }));
vi.mock('@/components/guia/PanelGuia', () => ({ PanelGuia: () => null }));

import { NavegacionGym } from './NavegacionGym';

afterEach(cleanup);

describe('NavegacionGym', () => {
  it('etiquetas descriptivas, la página actual marcada y los data-guia de la guía', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    const menu = screen.getByRole('navigation', { name: 'Principal' });
    const enlaces = within(menu).getAllByRole('link');
    expect(enlaces.map((enlace) => enlace.textContent)).toEqual(['Mis ejercicios', 'Entrenar hoy', 'Mi progreso', 'CHRONO (asistente)']);
    expect(enlaces.map((enlace) => enlace.getAttribute('data-guia'))).toEqual(['nav-ejercicios', 'nav-entrenamiento', 'nav-resumen', 'nav-chrono']);
    expect(within(menu).getByRole('link', { name: 'Entrenar hoy' })).toHaveAttribute('aria-current', 'page');
  });

  it('cada enlace lleva un ícono SVG decorativo (oculto para lectores de pantalla) y un área táctil de 44 px', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    for (const enlace of within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link')) {
      const icono = enlace.querySelector('svg');
      expect(icono).toHaveAttribute('aria-hidden', 'true');
      expect(enlace.className).toContain('min-h-11');
    }
  });
});
