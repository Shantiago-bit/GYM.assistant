import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';
import { CLASES_OPCION_MENU, MenuMasOpciones } from './MenuMasOpciones';

// Opción que abre un modal, como EditarEnfoque o BotonArchivar.
function OpcionConModal({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" role="menuitem" tabIndex={-1} className={CLASES_OPCION_MENU} onClick={() => setAbierto(true)}>
        {texto}
      </button>
      {abierto ? (
        <Modal titulo={texto} onCerrar={() => setAbierto(false)}>
          <p>Contenido de {texto}</p>
        </Modal>
      ) : null}
    </>
  );
}

function Menu() {
  return (
    <MenuMasOpciones>
      <OpcionConModal texto="Cambiar objetivo" />
      <OpcionConModal texto="Cambiar la versión" />
      <OpcionConModal texto="Archivar ejercicio" />
    </MenuMasOpciones>
  );
}

afterEach(cleanup);

describe('MenuMasOpciones', () => {
  // requestAnimationFrame se ejecuta al instante para que el foco llegue a la opción sin esperar.
  vi.stubGlobal('requestAnimationFrame', (llamada: FrameRequestCallback) => {
    llamada(0);
    return 0;
  });

  it('es un botón con aria-haspopup="menu" que empieza cerrado', () => {
    render(<Menu />);
    const boton = screen.getByRole('button', { name: 'Más opciones' });
    expect(boton).toHaveAttribute('aria-haspopup', 'menu');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('al abrirlo enfoca la primera opción; las flechas, Inicio y Fin se mueven en círculo', () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    expect(screen.getByRole('menu', { name: 'Más opciones' })).toBeVisible();
    const opciones = screen.getAllByRole('menuitem');
    expect(opciones).toHaveLength(3);
    expect(opciones[0]).toHaveFocus();
    fireEvent.keyDown(opciones[0]!, { key: 'ArrowDown' });
    expect(opciones[1]).toHaveFocus();
    fireEvent.keyDown(opciones[1]!, { key: 'End' });
    expect(opciones[2]).toHaveFocus();
    fireEvent.keyDown(opciones[2]!, { key: 'ArrowDown' });
    expect(opciones[0]).toHaveFocus();
    fireEvent.keyDown(opciones[0]!, { key: 'ArrowUp' });
    expect(opciones[2]).toHaveFocus();
    fireEvent.keyDown(opciones[2]!, { key: 'Home' });
    expect(opciones[0]).toHaveFocus();
  });

  it('la flecha abajo sobre el botón abre el menú', () => {
    render(<Menu />);
    const boton = screen.getByRole('button', { name: 'Más opciones' });
    fireEvent.keyDown(boton, { key: 'ArrowDown' });
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
  });

  it('Esc cierra el menú y devuelve el foco al botón', () => {
    render(<Menu />);
    const boton = screen.getByRole('button', { name: 'Más opciones' });
    fireEvent.click(boton);
    fireEvent.keyDown(screen.getAllByRole('menuitem')[1]!, { key: 'Escape' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('elegir una opción cierra el menú y su modal sigue visible; al cerrarlo el foco vuelve a "Más opciones"', () => {
    render(<Menu />);
    const boton = screen.getByRole('button', { name: 'Más opciones' });
    fireEvent.click(boton);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archivar ejercicio' }));
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    const modal = screen.getByRole('dialog', { name: 'Archivar ejercicio' });
    expect(modal).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });
});
