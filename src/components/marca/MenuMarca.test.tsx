import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { revisarConAxe } from '@/test/accesibilidad';
import { CHI_GRUESO } from './geometriaChrono';

vi.mock('next/navigation', () => ({
  usePathname: () => '/gym/chat',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/guia/PanelGuia', () => ({ PanelGuia: () => null }));
vi.mock('@/components/gym/MenuPerfil', () => ({ MenuPerfil: () => null }));

afterEach(cleanup);

describe('menú: cada marca en su lugar', () => {
  it('el destino CHRONO del Pórtico muestra su símbolo (mono) y conserva su nombre accesible', async () => {
    const { container } = render(<NavegacionGym nombre="Vale" avatarUrl={null} />);
    const enlace = screen.getAllByRole('link', { name: 'CHRONO' })[0]!;
    expect(enlace).toHaveAttribute('aria-current', 'page');
    const simbolo = enlace.querySelector('svg')!;
    expect(simbolo).toHaveAttribute('data-variante', 'mono');
    expect(simbolo).toHaveAttribute('aria-hidden', 'true');
    expect(simbolo.querySelector('.chi-grueso')).not.toBeNull();
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('nunca intercambiados: el logotipo de la app es el escudo de Kairós, sin la Χ de CHRONO', () => {
    render(<NavegacionGym nombre="Vale" avatarUrl={null} />);
    const logo = screen.getByRole('link', { name: 'Kairós' });
    expect(logo.querySelector('.chi-grueso, .laurel-izquierdo')).toBeNull();
    expect(logo.querySelectorAll('svg rect')).toHaveLength(4); // los cuatro discos de la barra
    const chrono = screen.getAllByRole('link', { name: 'CHRONO' })[0]!;
    expect(chrono.querySelector('.baldosa-marca')).toBeNull();
  });

  it('el favicon y el ícono de la app son de Kairós: no llevan el laurel ni la Χ', () => {
    const raiz = path.resolve(__dirname, '../../..');
    const favicon = readFileSync(path.join(raiz, 'src/app/icon.svg'), 'utf8');
    const apple = readFileSync(path.join(raiz, 'src/app/apple-icon.tsx'), 'utf8');
    expect(favicon).not.toContain(CHI_GRUESO.trazo.slice(0, 10));
    expect(apple).toContain('kairos-simbolo.svg');
    expect(apple.toLowerCase()).not.toContain('chrono');
  });
});
