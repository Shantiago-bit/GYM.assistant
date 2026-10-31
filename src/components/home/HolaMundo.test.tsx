import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HolaMundo } from './HolaMundo';

describe('home', () => {
  it('lleva al registro y al inicio de sesión', () => {
    render(<HolaMundo />);

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });
});
