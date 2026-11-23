import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { LEMA, LOGOTIPO, NOMBRE_APP, SLUG_APP } from '@/lib/config/marca';
import { BaldosaAgon, TAMANOS_BALDOSA } from './BaldosaAgon';
import { LogotipoAgon } from './LogotipoAgon';
import { SimboloAgon } from './SimboloAgon';

afterEach(cleanup);

describe('constantes de marca', () => {
  it('nombre, logotipo, lema y slug', () => {
    expect(NOMBRE_APP).toBe('Agón');
    expect(LOGOTIPO).toBe('AGÓN');
    expect(LEMA).toBe('Tu lucha, tu progreso');
    expect(SLUG_APP).toBe('agon');
  });
});

describe('SimboloAgon', () => {
  it('cada símbolo tiene su propio id de degradado y lo usa', () => {
    const { container } = render(
      <>
        <SimboloAgon />
        <SimboloAgon />
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
    const { container } = render(<SimboloAgon variante="mono" />);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelector('circle')).toHaveAttribute('stroke', 'currentColor');
    expect(container.querySelector('rect')).toHaveAttribute('fill', 'currentColor');
  });

  it('respeta el tamaño y tiene la geometría del escudo: dos aros, la barra y cuatro discos', () => {
    const { container } = render(<SimboloAgon tamano={40} />);
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
        <SimboloAgon titulo="Agón" />
        <SimboloAgon />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Agón' })).toBeInTheDocument();
    const [conTitulo, sinTitulo] = container.querySelectorAll('svg');
    expect(conTitulo).not.toHaveAttribute('aria-hidden');
    expect(sinTitulo).toHaveAttribute('aria-hidden', 'true');
    expect(sinTitulo).not.toHaveAttribute('role');
  });
});

describe('BaldosaAgon', () => {
  it.each(Object.entries(TAMANOS_BALDOSA))('tamaño %s: %i px, radio del 24 % y símbolo del 70 %', (tamano, lado) => {
    const { container } = render(<BaldosaAgon tamano={tamano as keyof typeof TAMANOS_BALDOSA} />);
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

describe('LogotipoAgon', () => {
  it('muestra AGÓN en la fuente de marca y se anuncia como «Agón»', () => {
    const { container } = render(<LogotipoAgon />);
    expect(container).toHaveTextContent(LOGOTIPO);
    expect(container.querySelector('.font-marca')).not.toBeNull();
    expect(screen.getByText(LOGOTIPO)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(NOMBRE_APP)).toHaveClass('sr-only');
  });

  it('variantes horizontal y apilada, con el lema opcional', () => {
    const { container, rerender } = render(<LogotipoAgon />);
    expect(container.firstElementChild).toHaveAttribute('data-variante', 'horizontal');
    expect(screen.queryByText(LEMA)).toBeNull();
    rerender(<LogotipoAgon variante="apilada" conLema />);
    expect(container.firstElementChild).toHaveAttribute('data-variante', 'apilada');
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(screen.getByText(LEMA)).toBeInTheDocument();
  });

  it('dentro de un enlace, el enlace se llama «Agón» y pasa axe', async () => {
    const { container } = render(
      <a href="/gym">
        <LogotipoAgon />
      </a>,
    );
    expect(screen.getByRole('link', { name: 'Agón' })).toBeInTheDocument();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
