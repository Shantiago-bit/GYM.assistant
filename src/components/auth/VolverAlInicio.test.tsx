import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VolverAlInicio } from './VolverAlInicio';

describe('VolverAlInicio', () => {
  it('enlaza al home', () => {
    render(<VolverAlInicio />);

    expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute('href', '/');
  });
});
