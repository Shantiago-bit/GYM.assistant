import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownChat } from './MarkdownChat';

describe('MarkdownChat', () => {
  it('dibuja el ✅ de las notas de la app como un ícono SVG', () => {
    const { container } = render(<MarkdownChat texto="✅ Listo: se creó el ejercicio «Sentadilla»." />);
    expect(screen.getByText('Listo: se creó el ejercicio «Sentadilla».')).toBeInTheDocument();
    expect(container.textContent).not.toContain('✅');
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('deja igual los párrafos sin la marca', () => {
    const { container } = render(<MarkdownChat texto="Revisa la tarjeta." />);
    expect(screen.getByText('Revisa la tarjeta.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
