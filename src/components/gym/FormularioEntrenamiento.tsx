'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';
import {
  EditorSeries,
  filasDesdePesos,
  filasIniciales,
  leerSeries,
  type FilaSerie,
} from '@/components/gym/FormularioSeries';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { ModalMetaAlcanzada } from '@/components/gym/ModalMetaAlcanzada';
import { TarjetaRecomendacion } from '@/components/gym/TarjetaRecomendacion';
import { Aviso } from '@/components/ui/Aviso';
import { Boton, clasesBoton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { LogroMeta, Metodo, ResultadoEntrenamiento, TipoEjercicio } from '@/lib/datos/tipos';
import { enviarJson } from '@/lib/http/cliente';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface EjercicioDisponible {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  metodo: Metodo;
  rango: [number, number];
  objetivo: string;
  pesoSugeridoKg: number | null;
  pesosPlanKg: (number | null)[];
  etiquetas: string[];
}

export function FormularioEntrenamiento({
  ejercicios,
  hoy,
  avanzado = false,
}: {
  ejercicios: EjercicioDisponible[];
  hoy: string;
  avanzado?: boolean;
}) {
  const [seleccion, setSeleccion] = useState<Record<string, FilaSerie[]>>({});
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoEntrenamiento[] | null>(null);
  const [logros, setLogros] = useState<LogroMeta[]>([]);
  const cerrarLogros = useCallback(() => setLogros([]), []);

  const alternar = (ejercicio: EjercicioDisponible) => {
    setError('');
    setSeleccion(({ [ejercicio.id]: actual, ...resto }) =>
      actual
        ? resto
        : {
            ...resto,
            [ejercicio.id]:
              ejercicio.pesosPlanKg.length > 0
                ? filasDesdePesos(ejercicio.pesosPlanKg, ejercicio.etiquetas)
                : filasIniciales(3, ejercicio.pesoSugeridoKg),
          },
    );
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const elegidos = ejercicios.filter((ejercicio) => seleccion[ejercicio.id]);

    if (elegidos.length === 0) {
      setError('Selecciona al menos un ejercicio.');
      return;
    }
    if (fecha > hoy) {
      setError('La fecha no puede ser futura.');
      return;
    }

    let cuerpo;

    try {
      cuerpo = {
        fecha,
        ejercicios: elegidos.map((ejercicio) => ({
          ejercicioId: ejercicio.id,
          series: leerSeries(seleccion[ejercicio.id] ?? [], ejercicio.tipo),
        })),
      };
    } catch (causa) {
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revisa las series: cada una necesita sus repeticiones.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson<ResultadoEntrenamiento[]>('/api/gym/entrenamiento', cuerpo);
    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }

    setResultados(respuesta.datos);
    setLogros(respuesta.datos.flatMap((resultado) => (resultado.logro ? [resultado.logro] : [])));
  };

  if (resultados) {
    return (
      <>
        {logros.length > 0 ? <ModalMetaAlcanzada logros={logros} onCerrar={cerrarLogros} avanzado={avanzado} /> : null}
        <Aviso tipo="exito">Entrenamiento guardado. Esto sigue para tu próxima sesión:</Aviso>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {resultados.map((resultado) => {
            const ejercicio = ejercicios.find((opcion) => opcion.id === resultado.ejercicioId);
            return (
              <li key={resultado.ejercicioId}>
                <h2 className="mb-1 text-base font-semibold text-texto">{resultado.nombre}</h2>
                <TarjetaRecomendacion
                  recomendacion={resultado.recomendacion}
                  sinPrueba={false}
                  ejercicio={ejercicio ?? { tipo: 'peso', metodo: 'rectas', rango: [1, 1] }}
                  avanzado={avanzado}
                  conFrase={ejercicio !== undefined}
                />
              </li>
            );
          })}
        </ul>
        <Link href="/gym" className={`${clasesBoton('secundario')} mt-4`}>
          Volver a ejercicios
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Tarjeta className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-64">
          <Campo
            etiqueta="Fecha"
            type="date"
            max={hoy}
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-texto-suave">
            {Object.keys(seleccion).length} de {ejercicios.length} seleccionados
          </p>
          <Boton type="submit" cargando={guardando}>
            Guardar entrenamiento
          </Boton>
        </div>
      </Tarjeta>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {ejercicios.map((ejercicio) => {
          const filas = seleccion[ejercicio.id];

          return (
            <Tarjeta key={ejercicio.id} className={filas ? 'border-primario' : ''}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(filas)}
                  onChange={() => alternar(ejercicio)}
                  className="h-5 w-5 accent-[var(--color-primario)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-texto">{ejercicio.nombre}</span>
                  <span className="block text-sm tabular-nums text-texto-suave">
                    {ejercicio.objetivo}
                  </span>
                </span>
                <InsigniaTipo tipo={ejercicio.tipo} />
              </label>

              {filas ? (
                <div className="mt-4">
                  <EditorSeries
                    tipo={ejercicio.tipo}
                    avanzado={avanzado}
                    filas={filas}
                    onCambio={(nuevas) =>
                      setSeleccion((actual) => ({ ...actual, [ejercicio.id]: nuevas }))
                    }
                  />
                </div>
              ) : null}
            </Tarjeta>
          );
        })}
      </div>

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto">
        Guardar entrenamiento
      </Boton>
    </form>
  );
}
