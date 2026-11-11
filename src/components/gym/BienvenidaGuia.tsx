'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { registrarAccionGuia } from '@/lib/guia/acciones';
import { TEXTOS_BIENVENIDA } from '@/lib/guia/contenido';

// Se muestra en /gym a las cuentas nuevas. Cualquier salida (incluidos Cerrar y Escape) marca la bienvenida
// como vista, para no volver a mostrarla.
export function BienvenidaGuia() {
  const router = useRouter();
  const [abierta, setAbierta] = useState(true);
  const [ocupada, setOcupada] = useState(false);

  const salir = async (destino?: Route) => {
    if (ocupada) {
      return;
    }
    setOcupada(true);
    await registrarAccionGuia('bienvenida_vista');
    setAbierta(false);
    if (destino) {
      router.push(destino);
    }
  };

  if (!abierta) {
    return null;
  }

  return (
    <Modal titulo={TEXTOS_BIENVENIDA.titulo} onCerrar={() => void salir()}>
      <div className="space-y-2 text-sm leading-relaxed text-texto-suave">
        {TEXTOS_BIENVENIDA.parrafos.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Boton disabled={ocupada} onClick={() => void salir('/gym/guia')}>
          {TEXTOS_BIENVENIDA.verGuia}
        </Boton>
        <Boton variante="secundario" disabled={ocupada} onClick={() => void salir('/gym/ejercicios/nuevo')}>
          {TEXTOS_BIENVENIDA.crearEjercicio}
        </Boton>
        <Boton variante="fantasma" disabled={ocupada} onClick={() => void salir()}>
          {TEXTOS_BIENVENIDA.ahoraNo}
        </Boton>
      </div>
    </Modal>
  );
}
