'use client';

import { useEffect } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { Confeti } from '@/components/ui/Movimiento';
import { Mancuerna } from '@/components/movimiento/Mancuerna';
import { useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import { vibrar } from '@/lib/reglas/animacion';
import type { LogroMeta } from '@/lib/datos/tipos';
import { formatearPeso } from '@/lib/formato';

function ResumenLogro({ logro, avanzado }: { logro: LogroMeta; avanzado: boolean }) {
  const reps = (cantidad: number) => (avanzado ? `${cantidad} reps` : `${cantidad} ${cantidad === 1 ? 'repetición' : 'repeticiones'}`);
  const [min, max] = logro.rango;
  const esPeso = logro.tipo === 'peso';

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-texto">{logro.nombre}</h3>
        <p className="text-sm text-texto-suave">
          {avanzado ? `Rango ${min}–${max} reps` : `Repeticiones objetivo: ${min} a ${max}`} ·{' '}
          {logro.metodo === 'rectas' || logro.metodo === 'cluster'
            ? `llegaste a ${max} en ${logro.series.length === 1 ? 'la serie' : `las ${logro.series.length} series`}`
            : `llegaste a ${max} en la serie más pesada`}
        </p>
      </div>

      <ul className="divide-y divide-borde rounded-gym border border-borde text-sm tabular-nums">
        {logro.series.map((serie, indice) => (
          <li key={indice} className="flex justify-between px-3 py-1.5">
            <span className="text-texto-suave">Serie {indice + 1}</span>
            <span className="font-medium text-texto">
              {reps(serie.reps)}{serie.pesoGramos === null ? '' : ` × ${formatearPeso(serie.pesoGramos)}`}
            </span>
          </li>
        ))}
        {logro.volumenGramos === null ? null : (
          <li className="flex justify-between px-3 py-1.5">
            <span className="text-texto-suave">{avanzado ? 'Volumen total' : 'Peso total movido'}</span>
            <span className="font-medium text-texto">{formatearPeso(logro.volumenGramos)}</span>
          </li>
        )}
      </ul>

      <div className="rounded-gym border-l-4 border-l-subir bg-primario-suave px-3 py-2">
        <p className="text-sm font-medium text-texto-suave">{avanzado ? 'Próxima rutina' : 'La próxima vez'}</p>
        {esPeso && logro.pesoSiguienteGramos !== null ? (
          <>
            <p className="text-lg font-bold tabular-nums text-texto">
              {formatearPeso(logro.pesoSiguienteGramos)} × {reps(logro.metaRepsSiguiente)}
            </p>
            <p className="text-sm text-texto-suave">
              {avanzado
                ? `Sube ${formatearPeso(logro.incrementoGramos ?? 0)} y vuelve al mínimo del rango. Desde ahí, progresa otra vez hasta ${max} repeticiones.`
                : `Sube ${formatearPeso(logro.incrementoGramos ?? 0)} y busca ${min} repeticiones por serie. Cuando llegues otra vez a ${max}, vuelves a subir.`}
            </p>
            {logro.metodo !== 'rectas' && logro.metodo !== 'cluster' ? (
              <p className="mt-1 text-sm text-texto-suave">
                Es el peso de la serie más pesada; las demás se recalculan desde él en el plan de la próxima sesión.
              </p>
            ) : null}
            {logro.saltoDoble ? (
              <p className="mt-1 text-sm font-medium text-texto">
                Salto doble: te sobraban 3 o más repeticiones en todas las series.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-texto">{avanzado ? 'Una variante más difícil' : 'Una versión más difícil del ejercicio'}</p>
            <p className="text-sm text-texto-suave">
              Empieza con {logro.metaRepsSiguiente} repeticiones y progresa otra vez hasta {max}.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function ModalMetaAlcanzada({
  logros,
  onCerrar,
  avanzado = false,
}: {
  logros: LogroMeta[];
  onCerrar: () => void;
  avanzado?: boolean;
}) {
  const { nivel, vibracion } = useNivelMovimiento();
  // El momento del logro: la barra se carga con un disco extra, la pantalla tiembla 300 ms (solo "Completas") y
  // el teléfono vibra un instante (si la persona lo permite).
  useEffect(() => {
    vibrar(nivel, vibracion, 20);
    if (nivel !== 'completas') return undefined;
    const contenido = document.getElementById('contenido');
    contenido?.classList.add('temblor-pantalla');
    const t = setTimeout(() => contenido?.classList.remove('temblor-pantalla'), 320);
    return () => {
      clearTimeout(t);
      contenido?.classList.remove('temblor-pantalla');
    };
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal titulo="¡Meta alcanzada!" onCerrar={onCerrar}>
      <Confeti particulas={30} conMancuernas />
      <div className="flex justify-center pb-2">
        <Mancuerna estado="record" tamano={96} />
      </div>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto">
        <p className="text-sm text-texto-suave">
          {avanzado
            ? 'Completaste el tope del rango en todas las series. Es momento de subir la carga.'
            : 'Llegaste al máximo de repeticiones en todas las series. ¡Te toca subir!'}
        </p>
        {logros.map((logro) => (
          <ResumenLogro key={logro.nombre} logro={logro} avanzado={avanzado} />
        ))}
        <Boton onClick={onCerrar} className="w-full">
          Entendido
        </Boton>
      </div>
    </Modal>
  );
}
