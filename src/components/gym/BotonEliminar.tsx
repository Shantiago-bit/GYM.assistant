'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useId, useRef, useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';

const plural = (cantidad: number, singular: string, varios: string) => `${cantidad} ${cantidad === 1 ? singular : varios}`;
const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('es');

interface PropiedadesEliminar {
  id: string;
  nombre: string;
  archivado: boolean;
  sesiones: number;
  series: number;
}

// "Zona de peligro" al final del detalle: borra el ejercicio para siempre tras escribir su nombre.
export function BotonEliminar({ id, nombre, archivado, sesiones, series }: PropiedadesEliminar) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const idCampo = useId();
  const idEstado = useId();
  const coincide = normalizar(confirmacion) === normalizar(nombre);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setConfirmacion('');
    setError('');
  }, []);

  const ejecutar = async (url: string, cuerpo: unknown, metodo: 'POST' | 'DELETE', destino: string) => {
    setError('');
    setOcupado(true);
    const respuesta = await enviarJson(url, cuerpo, metodo);
    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setOcupado(false);
      return;
    }
    router.push(destino as Route);
    router.refresh();
  };

  const detalle =
    sesiones === 0
      ? `Se borrará ${nombre}. Todavía no tiene sesiones registradas.`
      : `Se borrarán ${nombre}, sus ${plural(sesiones, 'sesión', 'sesiones')} y ${plural(series, 'serie', 'series')}, incluida la prueba inicial.`;

  return (
    <section
      aria-labelledby="titulo-zona-peligro"
      data-guia="detalle-eliminar"
      className="rounded-gym border border-dashed border-red-300 p-4"
    >
      <h2 id="titulo-zona-peligro" className="text-sm font-semibold text-red-800">
        Zona de peligro
      </h2>
      <p className="mt-1 text-sm text-texto-suave">
        Eliminar borra el ejercicio y todo su histórico para siempre.
        {archivado ? '' : ' Si solo quieres sacarlo de tu lista, archívalo.'}
      </p>
      <Boton variante="fantasma" className="mt-2 !text-red-700" onClick={() => setAbierto(true)}>
        Eliminar ejercicio…
      </Boton>

      {abierto ? (
        <Modal titulo="Eliminar ejercicio para siempre" onCerrar={cerrar} focoInicial={campo}>
          <p className="text-sm text-texto">
            {detalle} <strong>Esta acción no se puede deshacer.</strong>
          </p>

          {archivado ? null : (
            <div className="mt-3 rounded-gym bg-primario-suave p-3 text-sm text-texto">
              <p>Si solo quieres sacarlo de tu lista, archívalo: conservas el histórico.</p>
              <Boton
                variante="secundario"
                className="mt-2"
                disabled={ocupado}
                onClick={() => void ejecutar(`/api/gym/ejercicios/${id}/archivar`, {}, 'POST', '/gym')}
              >
                Archivar en su lugar
              </Boton>
            </div>
          )}

          <label htmlFor={idCampo} className="mt-4 block text-sm font-medium text-texto">
            Escribe <strong>{nombre}</strong> para confirmar
          </label>
          <input
            ref={campo}
            id={idCampo}
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            autoComplete="off"
            aria-describedby={idEstado}
            className="mt-1 min-h-11 w-full rounded-gym border border-borde bg-superficie px-3 py-2 text-sm text-texto outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <p id={idEstado} aria-live="polite" className="mt-1 text-xs text-texto-suave">
            {coincide ? 'El nombre coincide: ya puedes eliminar.' : 'El botón se habilita cuando el nombre coincide.'}
          </p>

          {error ? (
            <div className="mt-3">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Boton variante="secundario" onClick={cerrar}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              disabled={!coincide || ocupado}
              aria-describedby={idEstado}
              onClick={() =>
                void ejecutar(`/api/gym/ejercicios/${id}`, { confirmacion }, 'DELETE', '/gym?aviso=eliminado')
              }
            >
              Eliminar para siempre
            </Boton>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
