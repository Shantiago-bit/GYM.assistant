import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const ruta = vi.hoisted(() => ({ actual: '/gym/entrenamiento' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => ruta.actual }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('@/components/guia/ProveedorGuia', () => ({ useGuia: () => ({ abrirPanel: vi.fn() }) }));
vi.mock('@/components/guia/PanelGuia', () => ({ PanelGuia: () => null }));

import { DESTINOS, NavegacionGym, tituloDeRuta } from './NavegacionGym';

beforeEach(() => {
  ruta.actual = '/gym/entrenamiento';
  instalarAlmacenamiento();
});
afterEach(cleanup);

const secciones = () => screen.getByRole('navigation', { name: 'Secciones' });
// La navegación tiene dos listas: la de escritorio (píldoras) y la barra inferior móvil.
const listas = () => within(secciones()).getAllByRole('list', { hidden: true });

describe('el Pórtico', () => {
  it('una sola navegación "Secciones" con los cuatro destinos, su descripción y los data-guia', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    expect(screen.getAllByRole('navigation', { name: 'Secciones' })).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    const escritorio = within(listas()[0]!).getAllByRole('link');
    expect(escritorio.map((enlace) => enlace.getAttribute('data-guia'))).toEqual(['nav-inicio', 'nav-entrenamiento', 'nav-museo', 'nav-chrono']);
    expect(escritorio.map((enlace) => enlace.getAttribute('href'))).toEqual(['/gym', '/gym/entrenamiento', '/gym/museo', '/gym/chat']);
    expect(DESTINOS.map((destino) => destino.descripcion)).toEqual([
      'Tu día y tus ejercicios',
      'Registra tu sesión',
      'Tus récords y registros',
      'Tu asistente',
    ]);
    // El nombre accesible es el nombre del destino; la descripción llega como descripción (tooltip).
    const museo = within(listas()[0]!).getByRole('link', { name: /^Museo/ });
    expect(museo).toHaveAccessibleDescription('Tus récords y registros');
    for (const lista of listas()) expect(lista).toHaveAttribute('data-guia', 'portico');
  });

  it('aria-current="page" en la sección actual (Entrenar hoy) y el botón "Entrenar hoy" no aparece en esa página', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    const actuales = within(secciones()).getAllByRole('link', { current: 'page' });
    expect(actuales.map((enlace) => enlace.getAttribute('href'))).toEqual(['/gym/entrenamiento', '/gym/entrenamiento']);
    expect(screen.getAllByRole('link', { name: 'Entrenar hoy' })).toHaveLength(1); // solo el destino, no el botón
  });

  it('en otra página aparece el botón principal "Entrenar hoy" y el Museo se marca al estar en él', () => {
    ruta.actual = '/gym/museo';
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    expect(screen.getAllByRole('link', { name: 'Entrenar hoy' })).toHaveLength(2);
    expect(within(listas()[0]!).getByRole('link', { name: /^Museo/ })).toHaveAttribute('aria-current', 'page');
  });

  it('teclado: los destinos son enlaces enfocables en orden y el tooltip aparece con el foco (group-focus-within)', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    const enlaces = within(listas()[0]!).getAllByRole('link');
    for (const enlace of enlaces) {
      enlace.focus();
      expect(document.activeElement).toBe(enlace);
      const tooltip = document.getElementById(enlace.getAttribute('aria-describedby')!)!;
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip.className).toContain('group-focus-within:visible');
      expect(tooltip.className).toContain('group-hover:visible');
      expect(enlace.className).toContain('min-h-11');
    }
  });

  it('móvil: barra inferior con 5 destinos (Inicio · Museo · Entrenar · CHRONO · Perfil), nombre visible y el central con la baldosa de Agón', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    const barra = listas()[1]!;
    expect(barra.className).toContain('fixed');
    expect(barra.className).toContain('bottom-0');
    const items = within(barra).getAllByRole('link');
    expect(items.map((enlace) => enlace.textContent?.replace(/^A(?=Perfil)/, '').trim())).toEqual(['Inicio', 'Museo, nuevo', 'Entrenar', 'CHRONO', 'Perfil']);
    for (const enlace of items) {
      expect(enlace.className).toMatch(/min-h-1[14]/);
      expect(enlace.querySelector('svg, img, span[aria-hidden="true"]')).not.toBeNull();
    }
    const central = items[2]!;
    expect(central.querySelector('.portico-central .baldosa-marca')).not.toBeNull();
    expect(central.className).toContain('-mt-7');
  });

  it('insignia "Nuevo" en Museo hasta que la persona lo visita', () => {
    const { unmount } = render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    expect(within(listas()[0]!).getByText('Nuevo')).toBeInTheDocument();
    unmount();
    window.localStorage.setItem('agon_museo_visto', '1');
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    expect(within(listas()[0]!).queryByText('Nuevo')).toBeNull();
    act(() => {
      window.localStorage.removeItem('agon_museo_visto');
      window.dispatchEvent(new Event('agon:museo-visto'));
    });
    expect(within(listas()[0]!).getByText('Nuevo')).toBeInTheDocument();
  });

  it('se compacta al bajar', () => {
    render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    const cabecera = screen.getByRole('banner');
    expect(cabecera).not.toHaveAttribute('data-compacto');
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
      fireEvent.scroll(window);
    });
    expect(cabecera).toHaveAttribute('data-compacto', 'si');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('el contenido no queda tapado: espacio inferior con el área segura de iOS y la barra la respeta', () => {
    const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
    expect(css).toMatch(/\.espacio-portico \{ padding-bottom: calc\(6\.5rem \+ env\(safe-area-inset-bottom\)\)/);
    expect(css).toMatch(/\.portico-movil \{ padding-bottom: env\(safe-area-inset-bottom\)/);
    const layout = readFileSync(path.resolve(__dirname, '../../app/gym/layout.tsx'), 'utf8');
    expect(layout).toContain('espacio-portico');
  });

  it('el título del encabezado móvil sale de la ruta', () => {
    expect(tituloDeRuta('/gym')).toBe('Inicio');
    expect(tituloDeRuta('/gym/museo')).toBe('Museo');
    expect(tituloDeRuta('/gym/chat')).toBe('CHRONO');
  });

  it('pasa axe y la revisión básica', async () => {
    const { container } = render(<NavegacionGym nombre="Ana" avatarUrl={null} />);
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
