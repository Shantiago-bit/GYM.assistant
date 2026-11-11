'use client';

import { useState } from 'react';
import { useGuia } from '@/components/guia/ProveedorGuia';
import { Boton } from '@/components/ui/Boton';

// Oferta para cuentas nuevas en /gym. Es una tarjeta, no un modal: no bloquea la pantalla.
export function TarjetaOfertaGuia() {
  const { iniciar, marcarOfertaVista } = useGuia();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const responder = (empezar: boolean) => {
    setVisible(false);
    marcarOfertaVista();
    if (empezar) iniciar('inicio');
  };

  return (
    <section
      aria-labelledby="titulo-oferta-guia"
      className="mb-5 flex flex-col gap-3 rounded-gym border border-primario bg-primario-suave p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="titulo-oferta-guia" className="font-semibold text-texto">
          ¿Es tu primera vez?
        </h2>
        <p className="text-sm text-texto-suave">Te mostramos cómo funciona en 1 minuto.</p>
      </div>
      <div className="flex gap-2">
        <Boton onClick={() => responder(true)}>Empezar guía</Boton>
        <Boton variante="fantasma" onClick={() => responder(false)}>
          Ahora no
        </Boton>
      </div>
    </section>
  );
}
