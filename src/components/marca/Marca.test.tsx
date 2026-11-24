import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { LEMA, LOGOTIPO, NOMBRE_APP, SLUG_APP } from '@/lib/config/marca';
import { BaldosaKairos, TAMANOS_BALDOSA } from './BaldosaKairos';
import { LogotipoKairos } from './LogotipoKairos';
import { SimboloKairos } from './SimboloKairos';
import { BaldosaChrono } from './BaldosaChrono';
import { SimboloChrono } from './SimboloChrono';

afterEach(cleanup);

describe('constantes de marca', () => {
  it('nombre, logotipo, lema y slug', () => {
    expect(NOMBRE_APP).toBe('Kairós');
    expect(LOGOTIPO).toBe('KAIRÓS');
    expect(LEMA).toBe('Tu momento es hoy');
    expect(SLUG_APP).toBe('kairos');
  });
});

describe('SimboloKairos', () => {
  it('cada símbolo tiene su propio id de degradado y lo usa', () => {
    const { container } = render(
      <>
        <SimboloKairos />
        <SimboloKairos />
      </>,
    );
    const degradados = [...container.querySelectorAll('linearGradient')];
    expect(degradados).toHaveLength(2);
    const [a, b] = degradados.map((g) => g.id);
    expect(a).not.toBe(b);
    // Ids sin los caracteres de useId que romperían url(#…).
    for (const id of [a!, b!]) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]!.querySelector('circle')).toHaveAttribute('stroke', `url(#${a})`);
    expect(svgs[1]!.querySelector('circle')).toHaveAttribute('stroke', `url(#${b})`);
  });

  it('la variante mono usa currentColor y no define degradado', () => {
    const { container } = render(<SimboloKairos variante="mono" />);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelector('circle')).toHaveAttribute('stroke', 'currentColor');
    expect(container.querySelector('rect')).toHaveAttribute('fill', 'currentColor');
  });

  it('respeta el tamaño y tiene la geometría del escudo: dos aros, la barra y cuatro discos', () => {
    const { container } = render(<SimboloKairos tamano={40} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
    expect(svg.querySelectorAll('path')).toHaveLength(1);
    expect(svg.querySelectorAll('rect')).toHaveLength(4);
  });

  it('con título es una imagen con nombre; sin título, decorativo', () => {
    const { container } = render(
      <>
        <SimboloKairos titulo="Kairós" />
        <SimboloKairos />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Kairós' })).toBeInTheDocument();
    const [conTitulo, sinTitulo] = container.querySelectorAll('svg');
    expect(conTitulo).not.toHaveAttribute('aria-hidden');
    expect(sinTitulo).toHaveAttribute('aria-hidden', 'true');
    expect(sinTitulo).not.toHaveAttribute('role');
  });
});

describe('BaldosaKairos', () => {
  it.each(Object.entries(TAMANOS_BALDOSA))('tamaño %s: %i px, radio del 24 % y símbolo del 70 %', (tamano, lado) => {
    const { container } = render(<BaldosaKairos tamano={tamano as keyof typeof TAMANOS_BALDOSA} />);
    const baldosa = container.firstElementChild as HTMLElement;
    expect(baldosa).toHaveClass('baldosa-marca');
    expect(baldosa.style.width).toBe(`${lado}px`);
    expect(baldosa.style.borderRadius).toBe(`${Math.round(lado * 0.24)}px`);
    expect(container.querySelector('svg')).toHaveAttribute('width', String(Math.round(lado * 0.7)));
  });

  it('los tamaños son sm 32, md 44, lg 72 y xl 320', () => {
    expect(TAMANOS_BALDOSA).toEqual({ sm: 32, md: 44, lg: 72, xl: 320 });
  });
});

describe('SimboloChrono', () => {
  it('dos instancias no comparten ids (degradado ni hoja) y cada <use> apunta a su propia hoja', () => {
    const { container } = render(
      <>
        <SimboloChrono />
        <SimboloChrono />
      </>,
    );
    const [a, b] = [...container.querySelectorAll('svg')];
    const ids = (svg: Element) => [...svg.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids(a!)).toHaveLength(2);
    expect(ids(a!).some((id) => ids(b!).includes(id))).toBe(false);
    for (const svg of [a!, b!]) {
      const hoja = svg.querySelector('defs path')!.id;
      const usos = [...svg.querySelectorAll('use')];
      expect(usos).toHaveLength(18);
      for (const uso of usos) expect(uso.getAttribute('href')).toBe(`#${hoja}`);
      const degradado = svg.querySelector('linearGradient')!.id;
      expect(svg.querySelector('.chi-grueso')).toHaveAttribute('fill', `url(#${degradado})`);
      expect(degradado).toMatch(/^[a-zA-Z0-9_-]+$/);
    }
  });

  it('conserva las partes como clases para animarlas: laureles y los dos trazos de la Χ', () => {
    const { container } = render(<SimboloChrono />);
    for (const clase of ['laurel-izquierdo', 'laurel-derecho', 'chi-grueso', 'chi-fino']) {
      expect(container.querySelector(`.${clase}`), clase).not.toBeNull();
    }
    expect(container.querySelectorAll('.chi-grueso rect, .chi-fino rect')).toHaveLength(4);
  });

  it('la variante mono usa currentColor, sin degradado (la hoja sí se reutiliza)', () => {
    const { container } = render(<SimboloChrono variante="mono" />);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelector('.chi-fino')).toHaveAttribute('fill', 'currentColor');
    expect(container.querySelector('.laurel-izquierdo path')).toHaveAttribute('stroke', 'currentColor');
    expect(container.querySelector('defs path')).not.toBeNull();
  });

  it('con título es una imagen con nombre; sin título, decorativo', () => {
    const { container } = render(
      <>
        <SimboloChrono titulo="CHRONO" />
        <SimboloChrono />
      </>,
    );
    expect(screen.getByRole('img', { name: 'CHRONO' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg')[1]).toHaveAttribute('aria-hidden', 'true');
  });

  it('BaldosaChrono usa la baldosa compartida, con los mismos tamaños que la de Kairós', () => {
    for (const [tamano, lado] of Object.entries(TAMANOS_BALDOSA)) {
      const { container, unmount } = render(<BaldosaChrono tamano={tamano as keyof typeof TAMANOS_BALDOSA} />);
      const baldosa = container.firstElementChild as HTMLElement;
      expect(baldosa).toHaveClass('baldosa-marca');
      expect(baldosa.style.width).toBe(`${lado}px`);
      expect(container.querySelector('.chi-grueso')).not.toBeNull();
      unmount();
    }
  });
});

describe('LogotipoKairos', () => {
  it('muestra KAIRÓS en la fuente de marca y se anuncia como «Kairós»', () => {
    const { container } = render(<LogotipoKairos />);
    expect(container).toHaveTextContent(LOGOTIPO);
    expect(container.querySelector('.font-marca')).not.toBeNull();
    expect(screen.getByText(LOGOTIPO)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(NOMBRE_APP)).toHaveClass('sr-only');
  });

  it('variantes horizontal y apilada, con el lema opcional', () => {
    const { container, rerender } = render(<LogotipoKairos />);
    expect(container.firstElementChild).toHaveAttribute('data-variante', 'horizontal');
    expect(screen.queryByText(LEMA)).toBeNull();
    rerender(<LogotipoKairos variante="apilada" conLema />);
    expect(container.firstElementChild).toHaveAttribute('data-variante', 'apilada');
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(screen.getByText(LEMA)).toBeInTheDocument();
  });

  it('dentro de un enlace, el enlace se llama «Kairós» y pasa axe', async () => {
    const { container } = render(
      <a href="/gym">
        <LogotipoKairos />
      </a>,
    );
    expect(screen.getByRole('link', { name: 'Kairós' })).toBeInTheDocument();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
