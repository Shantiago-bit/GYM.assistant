'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';
import { esquemaNivel } from '@/lib/validacion/esquemas';

export function EditarNivel({ id, nivelActual }: { id: string; nivelActual: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nivel, setNivel] = useState(nivelActual ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = useCallback(() => setAbierto(false), []);

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const validacion = esquemaNivel.safeParse({ nivel });

    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson(`/api/gym/ejercicios/${id}/nivel`, validacion.data);
    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }

    setAbierto(false);
    router.refresh();
  };

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Cambiar nivel
      </Boton>

      {abierto ? (
        <Modal titulo="Cambiar nivel" onCerrar={cerrar}>
          <form onSubmit={guardar} className="space-y-3" noValidate>
            <Campo
              etiqueta="Nivel o variante"
              value={nivel}
              onChange={(evento) => setNivel(evento.target.value)}
              maxLength={80}
              ayuda="Por ejemplo, dominada con lastre."
            />
            {error ? <Aviso tipo="error">{error}</Aviso> : null}
            <div className="flex justify-end gap-2">
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={guardando}>
                Guardar nivel
              </Boton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
