import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

// axe en la portada (con la intro encima) y en el login. /gym se revisa en src/components/inicio/Inicio.test.tsx,
// que también monta la intro.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  instalarAlmacenamiento();
  window.history.replaceState(null, '', '/');
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe('accesibilidad de las páginas con la marca', () => {
  it('portada: logotipo, baldosa del héroe e intro pasan axe', async () => {
    const { HolaMundo } = await import('@/components/home/HolaMundo');
    const { IntroKairos } = await import('./IntroKairos');
    render(
      <main>
        <HolaMundo />
        <IntroKairos />
      </main>,
    );
    expect(document.querySelector('[data-testid="intro-kairos"]')).not.toBeNull();
    expect(screen.getAllByText('KAIRÓS').length).toBeGreaterThan(0);
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });

  it('login: el logotipo apilado pasa axe', async () => {
    const { default: LoginPage } = await import('@/app/login/page');
    const { container } = render(<LoginPage />);
    expect(container.querySelector('[data-variante="apilada"]')).not.toBeNull();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
