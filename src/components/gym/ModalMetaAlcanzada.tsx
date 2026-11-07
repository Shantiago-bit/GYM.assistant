'use client';

import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import type { LogroMeta } from '@/lib/datos/tipos';
import { formatearPeso } from '@/lib/formato';

function ResumenLogro({ logro }: { logro: LogroMeta }) {
  const [min, max] = logro.rango;
  const esPeso = logro.tipo === 'peso';

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-texto">{logro.nombre}</h3>
        <p className="text-sm text-texto-suave">
          Rango {min}–{max} reps · llegaste a {max} en las {logro.series.length}{' '}
          {logro.series.length === 1 ? 'serie' : 'series'}
        </p>
      </div>

      <ul className="divide-y divide-borde rounded-gym border border-borde text-sm tabular-nums">
        {logro.series.map((serie, indice) => (
          <li key={indice} className="flex justify-between px-3 py-1.5">
            <span className="text-texto-suave">Serie {indice + 1}</span>
            <span className="font-medium text-texto">
              {serie.reps} reps{serie.pesoGramos === null ? '' : ` × ${formatearPeso(serie.pesoGramos)}`}
            </span>
          </li>
        ))}
        {logro.volumenGramos === null ? null : (
          <li className="flex justify-between px-3 py-1.5">
            <span className="text-texto-suave">Volumen total</span>
            <span className="font-medium text-texto">{formatearPeso(logro.volumenGramos)}</span>
          </li>
        )}
      </ul>

      <div className="rounded-gym border-l-4 border-l-subir bg-primario-suave px-3 py-2">
        <p className="text-sm font-medium text-texto-suave">Próxima rutina</p>
        {esPeso && logro.pesoSiguienteGramos !== null ? (
          <>
            <p className="text-lg font-bold tabular-nums text-texto">
              {formatearPeso(logro.pesoSiguienteGramos)} × {logro.metaRepsSiguiente} reps
            </p>
            <p className="text-sm text-texto-suave">
              Sube {formatearPeso(logro.incrementoGramos ?? 0)} y vuelve al mínimo del rango. Desde ahí,
              progresa otra vez hasta {max} repeticiones.
            </p>
            {logro.saltoDoble ? (
              <p className="mt-1 text-sm font-medium text-texto">
                Salto doble: te sobraban 3 o más repeticiones en todas las series.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-texto">Una variante más difícil</p>
            <p className="text-sm text-texto-suave">
              Empieza con {logro.metaRepsSiguiente} repeticiones y progresa otra vez hasta {max}.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function ModalMetaAlcanzada({ logros, onCerrar }: { logros: LogroMeta[]; onCerrar: () => void }) {
  return (
    <Modal titulo="¡Meta alcanzada!" onCerrar={onCerrar}>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto">
        <p className="text-sm text-texto-suave">
          Completaste el tope del rango en todas las series. Es momento de subir la carga.
        </p>
        {logros.map((logro) => (
          <ResumenLogro key={logro.nombre} logro={logro} />
        ))}
        <Boton onClick={onCerrar} className="w-full">
          Entendido
        </Boton>
      </div>
    </Modal>
  );
}
