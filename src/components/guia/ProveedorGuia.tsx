'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { Component, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BurbujaGuia } from '@/components/guia/BurbujaGuia';
import { Foco } from '@/components/guia/Foco';
import { enviarAccionGuia, existeObjetivo, leerGuia, type DatosGuia } from '@/lib/guia/acciones';
import {
  buscarPasoDisponible,
  numeracion,
  pasoAnterior,
  pasoParaReanudar,
  patronRuta,
  recorridoDeRuta,
  rutaDeEntrada,
  siguientePaso,
  type ProgresoRecorrido,
} from '@/lib/guia/motor';
import { RECORRIDOS, type EstadoRecorrido, type IdRecorrido } from '@/lib/guia/recorridos';

interface Activo {
  recorrido: IdRecorrido;
  indice: number;
}

// Tras pulsar un paso de navegación, la guía espera a que cargue la página del siguiente recorrido.
interface Espera {
  desde: Activo;
  hacia: IdRecorrido;
  ruta: string;
}

interface ContextoGuia {
  datos: DatosGuia | null;
  activo: Activo | null;
  iniciar: (id: IdRecorrido) => void;
  reiniciar: () => void;
  marcarOfertaVista: () => void;
  entrada: (id: IdRecorrido) => string | null;
  // El panel con los recorridos se abre desde el menú de perfil.
  panelAbierto: boolean;
  abrirPanel: () => void;
  cerrarPanel: () => void;
}

const Contexto = createContext<ContextoGuia | null>(null);

export function useGuia(): ContextoGuia {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useGuia debe usarse dentro de ProveedorGuia.');
  return contexto;
}

// Si el tour falla, se cierra solo y la pantalla sigue usable.
class LimiteErrorGuia extends Component<{ onError: () => void; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch(error: unknown) {
    console.error('La guía se cerró por un error:', error);
    this.props.onError();
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

export function ProveedorGuia({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const [datos, setDatos] = useState<DatosGuia | null>(null);
  const [activo, setActivo] = useState<Activo | null>(null);
  const [espera, setEspera] = useState<Espera | null>(null);
  const [descartados, setDescartados] = useState<string[]>([]);
  const [montado, setMontado] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  useEffect(() => {
    setMontado(true);
    void leerGuia().then((leidos) => leidos && setDatos(leidos));
  }, []);

  // Guarda el progreso sin bloquear la guía: se actualiza al instante y se envía a la API. La respuesta no
  // se usa para el progreso: si dos respuestas llegaran en desorden, devolverían un paso viejo.
  const guardar = useCallback((id: IdRecorrido, estado: EstadoRecorrido, paso: number) => {
    const progreso: ProgresoRecorrido = { estado, paso };
    setDatos((actuales) => (actuales ? { ...actuales, recorridos: { ...actuales.recorridos, [id]: progreso } } : actuales));
    void enviarAccionGuia({ accion: 'recorrido', recorrido: id, estado, paso });
  }, []);

  const mostrar = useCallback(
    (recorrido: IdRecorrido, desde: number) => {
      // Empieza en el primer paso con objetivo en pantalla; si el elemento aún no está, Foco reintenta.
      const pasos = RECORRIDOS[recorrido].pasos;
      const indice = buscarPasoDisponible(pasos, desde, 1, existeObjetivo) ?? desde;
      setActivo({ recorrido, indice });
      guardar(recorrido, 'en_curso', indice);
    },
    [guardar],
  );

  // Al cambiar de página: sigue el recorrido de destino o cierra el que quedó en otra pantalla.
  useEffect(() => {
    if (espera) {
      if (patronRuta(RECORRIDOS[espera.hacia].ruta).test(ruta)) {
        // Al pasar de un recorrido al siguiente, el anterior queda completado. Si se inició un recorrido
        // desde otra página, desde y hacia son el mismo y no hay nada que cerrar.
        if (espera.desde.recorrido !== espera.hacia) {
          guardar(espera.desde.recorrido, 'completado', espera.desde.indice);
        }
        setEspera(null);
        mostrar(espera.hacia, 0);
      } else if (ruta !== espera.ruta) {
        setEspera(null);
      }
      return;
    }
    if (activo && !patronRuta(RECORRIDOS[activo.recorrido].ruta).test(ruta)) {
      setActivo(null);
    }
  }, [ruta, espera, activo, guardar, mostrar]);

  const entrada = useCallback(
    (id: IdRecorrido) => rutaDeEntrada(id, datos?.ejercicios ?? { sinPrueba: null, conPrueba: null }),
    [datos],
  );

  const iniciar = useCallback(
    (id: IdRecorrido) => {
      setDescartados([]);
      if (patronRuta(RECORRIDOS[id].ruta).test(ruta)) {
        mostrar(id, 0);
        return;
      }
      const destino = entrada(id);
      if (!destino) return;
      setActivo(null);
      setEspera({ desde: { recorrido: id, indice: 0 }, hacia: id, ruta });
      router.push(destino as Route);
    },
    [ruta, mostrar, entrada, router],
  );

  const cerrar = useCallback(() => setActivo(null), []);

  const contexto = useMemo<ContextoGuia>(
    () => ({
      datos,
      activo,
      iniciar,
      entrada,
      reiniciar: () => {
        setActivo(null);
        void enviarAccionGuia({ accion: 'reiniciar' }).then((nuevos) => nuevos && setDatos(nuevos));
      },
      marcarOfertaVista: () => {
        setDatos((actuales) => (actuales ? { ...actuales, ofertaVista: true } : actuales));
        void enviarAccionGuia({ accion: 'oferta_vista' }).then((nuevos) => nuevos && setDatos(nuevos));
      },
      panelAbierto,
      abrirPanel: () => setPanelAbierto(true),
      cerrarPanel: () => setPanelAbierto(false),
    }),
    [datos, activo, iniciar, entrada, panelAbierto],
  );

  const recorrido = activo ? RECORRIDOS[activo.recorrido] : null;
  const paso = activo && recorrido ? recorrido.pasos[activo.indice] : undefined;

  const siguiente = () => {
    if (!activo || !recorrido) return;
    const indice = siguientePaso(recorrido.pasos, activo.indice, existeObjetivo);
    if (indice === null) {
      guardar(activo.recorrido, 'completado', activo.indice);
      setActivo(null);
      return;
    }
    setActivo({ ...activo, indice });
    guardar(activo.recorrido, 'en_curso', indice);
  };

  const anterior = () => {
    if (!activo || !recorrido) return;
    const indice = pasoAnterior(recorrido.pasos, activo.indice, existeObjetivo);
    if (indice === null) return;
    setActivo({ ...activo, indice });
    guardar(activo.recorrido, 'en_curso', indice);
  };

  // El recorrido de la página actual que quedó a medias, para ofrecer "Continuar la guía".
  const pendiente = !activo && !espera ? recorridoDeRuta(ruta) : null;
  const progresoPendiente = pendiente ? datos?.recorridos[pendiente.id] : undefined;
  const ofrecerContinuar =
    pendiente !== null && progresoPendiente?.estado === 'en_curso' && !descartados.includes(pendiente.id);

  return (
    <Contexto.Provider value={contexto}>
      {children}
      {montado && activo && recorrido && paso
        ? createPortal(
            <LimiteErrorGuia key={`${activo.recorrido}-${activo.indice}`} onError={cerrar}>
              <Foco
                paso={paso}
                onSinObjetivo={siguiente}
                onAvanzar={siguiente}
                onNavegar={() => {
                  if (!paso.continua) return;
                  setEspera({ desde: activo, hacia: paso.continua, ruta });
                  setActivo(null);
                }}
              >
                {({ hueco, objetivo, condicionCumplida }) => (
                  <BurbujaGuia
                    titulo={paso.titulo}
                    texto={paso.texto}
                    {...numeracion(recorrido.pasos, activo.indice, existeObjetivo)}
                    tipo={paso.tipo}
                    hueco={hueco}
                    objetivo={objetivo}
                    condicionCumplida={condicionCumplida}
                    puedeAnterior={pasoAnterior(recorrido.pasos, activo.indice, existeObjetivo) !== null}
                    esUltimo={siguientePaso(recorrido.pasos, activo.indice, existeObjetivo) === null}
                    enlaces={paso.enlaces}
                    onAnterior={anterior}
                    onSiguiente={siguiente}
                    onSaltar={() => {
                      guardar(activo.recorrido, 'saltado', activo.indice);
                      setActivo(null);
                    }}
                    onPausar={cerrar}
                  />
                )}
              </Foco>
            </LimiteErrorGuia>,
            document.body,
          )
        : null}
      {espera && ruta === espera.ruta ? (
        <AvisoGuia
          texto="La guía sigue en la próxima pantalla."
          accion="Volver a la guía"
          onAccion={() => {
            setActivo(espera.desde);
            setEspera(null);
          }}
          onCerrar={() => setEspera(null)}
        />
      ) : ofrecerContinuar && pendiente && progresoPendiente ? (
        <AvisoGuia
          texto={`Guía: ${pendiente.titulo}`}
          accion="Continuar la guía"
          onAccion={() => mostrar(pendiente.id, pasoParaReanudar(progresoPendiente, pendiente))}
          onCerrar={() => setDescartados((actuales) => [...actuales, pendiente.id])}
        />
      ) : null}
    </Contexto.Provider>
  );
}

function AvisoGuia({
  texto,
  accion,
  onAccion,
  onCerrar,
}: {
  texto: string;
  accion: string;
  onAccion: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-borde bg-superficie py-1.5 pl-4 pr-1.5 text-sm shadow-soft"
    >
      <span className="truncate text-texto-suave">{texto}</span>
      <button
        type="button"
        onClick={onAccion}
        className="min-h-11 whitespace-nowrap rounded-full bg-primario px-4 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        {accion}
      </button>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el aviso de la guía"
        className="min-h-11 min-w-11 rounded-full px-3 py-2 text-texto-suave hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
      >
        ✕
      </button>
    </div>
  );
}
