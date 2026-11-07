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
import type { LogroMeta, ResultadoEntrenamiento, TipoEjercicio } from '@/lib/datos/tipos';
import { enviarJson } from '@/lib/http/cliente';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface EjercicioDisponible {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  objetivo: string;
  pesoSugeridoKg: number | null;
  pesosPlanKg: (number | null)[];
  etiquetas: string[];
}

export function FormularioEntrenamiento({
  ejercicios,
  hoy,
}: {
  ejercicios: EjercicioDisponible[];
  hoy: string;
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
                ? filasDesdePesos(ejercicio.pesosPlanKg)
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
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revise los datos ingresados.');
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
        {logros.length > 0 ? <ModalMetaAlcanzada logros={logros} onCerrar={cerrarLogros} /> : null}
        <Aviso tipo="exito">Entrenamiento guardado. Esto sigue para tu próxima sesión:</Aviso>
        <ul className="mt-4 space-y-3">
          {resultados.map((resultado) => (
            <li key={resultado.ejercicioId}>
              <h2 className="mb-1 text-sm font-semibold text-texto">{resultado.nombre}</h2>
              <TarjetaRecomendacion recomendacion={resultado.recomendacion} sinPrueba={false} />
            </li>
          ))}
        </ul>
        <Link href="/gym" className={`${clasesBoton('secundario')} mt-4`}>
          Volver a ejercicios
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Tarjeta>
        <Campo
          etiqueta="Fecha"
          type="date"
          max={hoy}
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      </Tarjeta>

      {ejercicios.map((ejercicio) => {
        const filas = seleccion[ejercicio.id];

        return (
          <Tarjeta key={ejercicio.id}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(filas)}
                onChange={() => alternar(ejercicio)}
                className="h-5 w-5 accent-[var(--color-primario)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-texto">{ejercicio.nombre}</span>
                <span className="block text-sm tabular-nums text-texto-suave">{ejercicio.objetivo}</span>
              </span>
              <InsigniaTipo tipo={ejercicio.tipo} />
            </label>

            {filas ? (
              <div className="mt-4">
                <EditorSeries
                  tipo={ejercicio.tipo}
                  filas={filas}
                  etiquetas={ejercicio.etiquetas}
                  onCambio={(nuevas) =>
                    setSeleccion((actual) => ({ ...actual, [ejercicio.id]: nuevas }))
                  }
                />
              </div>
            ) : null}
          </Tarjeta>
        );
      })}

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto">
        Guardar entrenamiento
      </Boton>
    </form>
  );
}
