'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';

export function BotonArchivar({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = useCallback(() => setAbierto(false), []);

  const archivar = async () => {
    setError('');
    setGuardando(true);
    const respuesta = await enviarJson(`/api/gym/ejercicios/${id}/archivar`);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setGuardando(false);
      return;
    }

    router.push('/gym');
    router.refresh();
  };

  return (
    <>
      <Boton variante="fantasma" onClick={() => setAbierto(true)}>
        Archivar
      </Boton>

      {abierto ? (
        <Modal titulo="Archivar ejercicio" onCerrar={cerrar}>
          <p className="text-sm text-texto-suave">
            {nombre} saldrá de tu lista de ejercicios. Su histórico se conserva.
          </p>
          {error ? (
            <div className="mt-3">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Boton variante="secundario" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton variante="peligro" cargando={guardando} onClick={archivar}>
              Archivar
            </Boton>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
