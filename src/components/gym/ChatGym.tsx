'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Compositor } from '@/components/chat/Compositor';
import { EncabezadoChat } from '@/components/chat/EncabezadoChat';
import { EstadoVacioChat } from '@/components/chat/EstadoVacioChat';
import { MensajeChrono } from '@/components/chat/MensajeChrono';
import { HojaContexto, PanelContexto } from '@/components/chat/PanelContexto';
import { TarjetaPropuesta } from '@/components/gym/TarjetaPropuesta';
import { IntroChrono, useIntroChrono } from '@/components/marca/IntroChrono';
import { SimboloChrono } from '@/components/marca/SimboloChrono';
import { Aviso } from '@/components/ui/Aviso';
import { Icono } from '@/components/ui/Icono';
import type { EventoChat, MensajeChat } from '@/lib/chat/asistente';
import type { ContextoChat } from '@/lib/chat/contextoVisible';
import { resumenUso, type UsoChat } from '@/lib/chat/limite';
import { notaDeCancelacion, notaDeConfirmacion, pasosDePropuesta, type PropuestaVista } from '@/lib/chat/propuestas';
import { sugerenciasInteligentes } from '@/lib/chat/sugerencias';
import { CHAT_LIMITE_DIARIO, CHAT_MAX_CARACTERES, CHAT_MAX_MENSAJES } from '@/lib/config/gym';
import { enviarJson } from '@/lib/http/cliente';

// En pantalla, una respuesta de CHRONO puede traer tarjetas de propuesta y cada mensaje la hora en que se escribió
// (para los separadores); al servidor solo viaja el texto.
type MensajeVista = MensajeChat & { propuestas?: PropuestaVista[]; hora?: number };

const ESTADO_HERRAMIENTA: Record<string, string> = {
  listar_ejercicios: 'Revisando tus ejercicios…',
  ver_ejercicio: 'Revisando el historial del ejercicio…',
  resumen_periodo: 'Revisando tu resumen…',
  proponer_crear_ejercicio: 'Preparando la propuesta…',
  proponer_modificar_ejercicio: 'Preparando la propuesta…',
  proponer_archivar_ejercicio: 'Preparando la propuesta…',
  proponer_restaurar_ejercicio: 'Preparando la propuesta…',
};

const DIEZ_MINUTOS = 10 * 60 * 1000;
const CERCA_DEL_FINAL = 80; // px: más cerca que esto, la persona "está al final"
const HORA = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });

// Sin datos del servidor (por ejemplo, en pruebas): un contexto vacío con las sugerencias por defecto.
const CONTEXTO_VACIO: ContextoChat = {
  apodo: '',
  saludo: 'Hola',
  dias: [],
  estadoHoy: 'descanso',
  racha: 0,
  constelacion: null,
  ejercicios: [],
  record: null,
  sugerencias: sugerenciasInteligentes({ hoy: '2000-01-01', estadoHoy: 'descanso', ejercicios: [{ nombre: '', listo: false, marcas: [] }] }),
};

function leerGuardado(clave: string): MensajeVista[] {
  try {
    const guardado = sessionStorage.getItem(clave);
    const mensajes = guardado ? (JSON.parse(guardado) as MensajeVista[]) : [];
    // Si la página se cerró mientras se aplicaba un cambio, la tarjeta vuelve a quedar para decidir.
    return mensajes.map((mensaje) =>
      mensaje.propuestas
        ? {
            ...mensaje,
            propuestas: mensaje.propuestas.map((propuesta) =>
              propuesta.estado === 'aplicando' ? { ...propuesta, estado: 'pendiente' } : propuesta,
            ),
          }
        : mensaje,
    );
  } catch {
    return [];
  }
}

async function leerError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { error?: { mensaje?: string } | string };
    const mensaje = typeof cuerpo.error === 'string' ? cuerpo.error : cuerpo.error?.mensaje;
    return mensaje ?? 'No se pudo enviar el mensaje.';
  } catch {
    return 'No se pudo enviar el mensaje.';
  }
}

// Índice de la última pregunta de la persona (para Regenerar y Reintentar).
function ultimaPregunta(mensajes: MensajeVista[]): number {
  for (let indice = mensajes.length - 1; indice >= 0; indice--) if (mensajes[indice]!.rol === 'usuario') return indice;
  return -1;
}

export function ChatGym({
  usuarioId,
  preguntaInicial = '',
  contexto = CONTEXTO_VACIO,
  usoInicial = { usados: 0, limite: CHAT_LIMITE_DIARIO },
}: {
  usuarioId: string;
  preguntaInicial?: string;
  contexto?: ContextoChat;
  usoInicial?: UsoChat;
}) {
  // La conversación vive en la pestaña: sobrevive a la navegación dentro de /gym, no al cerrar el navegador.
  const claveGuardado = `gym-chat:${usuarioId}`;
  const [mensajes, setMensajes] = useState<MensajeVista[]>([]);
  // Una pregunta sugerida desde el inicio llega ya escrita; la persona decide si la envía.
  const [entrada, setEntrada] = useState(preguntaInicial.slice(0, CHAT_MAX_CARACTERES));
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState('');
  const [espera, setEspera] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [uso, setUso] = useState<UsoChat>(usoInicial);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [alFinal, setAlFinal] = useState(true);
  const [hayNuevo, setHayNuevo] = useState(false);
  const controlador = useRef<AbortController | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const alFinalRef = useRef(true);
  const botonPanel = useRef<HTMLButtonElement>(null);
  // La intro al abrir CHRONO: una capa encima del chat, que ya está listo debajo. Al terminar deja el foco en el campo.
  const campo = useRef<HTMLTextAreaElement>(null);
  const intro = useIntroChrono(Boolean(preguntaInicial.trim()), campo);
  const { agotado } = resumenUso(uso);

  useEffect(() => {
    setMensajes(leerGuardado(claveGuardado));
    return () => controlador.current?.abort();
  }, [claveGuardado]);

  useEffect(() => {
    if (enviando) {
      return;
    }
    try {
      sessionStorage.setItem(claveGuardado, JSON.stringify(mensajes));
    } catch {
      // Sin almacenamiento la conversación sigue funcionando, solo no se conserva.
    }
  }, [mensajes, enviando, claveGuardado]);

  // Scroll: solo baja solo si la persona ya estaba al final; si subió a leer, aparece "Ir al final".
  const bajar = useCallback((suave = false) => {
    const elemento = lista.current;
    if (!elemento) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (typeof elemento.scrollTo === 'function') elemento.scrollTo({ top: elemento.scrollHeight, behavior: suave && !reducido ? 'smooth' : 'auto' });
    else elemento.scrollTop = elemento.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    // Sin mensajes, el estado vacío se lee desde arriba.
    if (mensajes.length === 0) return;
    if (alFinalRef.current) bajar();
    else setHayNuevo(true);
  }, [mensajes, estado, error, bajar]);

  const alDesplazar = () => {
    const elemento = lista.current;
    if (!elemento) return;
    const cerca = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < CERCA_DEL_FINAL;
    alFinalRef.current = cerca;
    setAlFinal(cerca);
    if (cerca) setHayNuevo(false);
  };

  const irAlFinal = () => {
    alFinalRef.current = true;
    setAlFinal(true);
    setHayNuevo(false);
    bajar(true);
  };

  const actualizarUso = async () => {
    try {
      const respuesta = await fetch('/api/gym/chat/uso', { cache: 'no-store' });
      if (respuesta.ok) setUso((await respuesta.json()) as UsoChat);
    } catch {
      // Sin conexión: el contador se queda con el último valor.
    }
  };

  const agregarAlUltimo = (texto: string) =>
    setMensajes((actuales) => {
      const copia = [...actuales];
      const ultimo = copia.at(-1);
      if (ultimo?.rol === 'asistente') {
        copia[copia.length - 1] = { ...ultimo, texto: ultimo.texto + texto };
      }
      return copia;
    });

  const agregarPropuesta = (propuesta: PropuestaVista) =>
    setMensajes((actuales) => {
      const copia = [...actuales];
      const ultimo = copia.at(-1);
      if (ultimo?.rol === 'asistente') {
        copia[copia.length - 1] = { ...ultimo, propuestas: [...(ultimo.propuestas ?? []), propuesta] };
      }
      return copia;
    });

  const quitarRespuestaVacia = () =>
    setMensajes((actuales) => {
      const ultimo = actuales.at(-1);
      return ultimo?.rol === 'asistente' && !ultimo.texto.trim() && !ultimo.propuestas?.length
        ? actuales.slice(0, -1)
        : actuales;
    });

  // Actualiza una tarjeta y, si hay nota, la deja en la conversación para que CHRONO conozca el resultado.
  const cambiarPropuesta = (id: string, cambios: Partial<PropuestaVista>, nota?: string) =>
    setMensajes((actuales) => {
      const copia = actuales.map((mensaje) =>
        mensaje.propuestas?.some((propuesta) => propuesta.id === id)
          ? {
              ...mensaje,
              propuestas: mensaje.propuestas.map((propuesta) =>
                propuesta.id === id ? ({ ...propuesta, ...cambios } as PropuestaVista) : propuesta,
              ),
            }
          : mensaje,
      );
      return nota ? [...copia, { rol: 'asistente', texto: nota, hora: Date.now() }] : copia;
    });

  // El cambio se aplica con las mismas rutas de la API que usa el resto de la app, que vuelven a validarlo todo.
  const confirmar = async (propuesta: PropuestaVista) => {
    cambiarPropuesta(propuesta.id, { estado: 'aplicando' });
    for (const paso of pasosDePropuesta(propuesta)) {
      const resultado = await enviarJson(paso.url, paso.cuerpo);
      if (!resultado.ok) {
        cambiarPropuesta(propuesta.id, { estado: 'error', error: resultado.mensaje });
        return;
      }
    }
    cambiarPropuesta(propuesta.id, { estado: 'confirmada' }, notaDeConfirmacion(propuesta));
  };

  const cancelar = (propuesta: PropuestaVista) =>
    cambiarPropuesta(propuesta.id, { estado: 'cancelada' }, notaDeCancelacion(propuesta));

  // `base`: la conversación sobre la que se pregunta (Regenerar y Reintentar la recortan antes de la última
  // pregunta y la vuelven a enviar). Cada envío cuenta para el límite del día, como siempre.
  const enviar = async (texto: string, base: MensajeVista[] = mensajes, limpiarCampo = true) => {
    const pregunta = texto.trim();
    if (!pregunta || enviando || agotado) {
      return;
    }

    const historial: MensajeVista[] = [...base, { rol: 'usuario', texto: pregunta, hora: Date.now() }];
    setMensajes([...historial, { rol: 'asistente', texto: '', hora: Date.now() }]);
    if (limpiarCampo) setEntrada('');
    setError('');
    setEstado('CHRONO está pensando…');
    setEspera(null);
    setEnviando(true);
    alFinalRef.current = true;
    setUso((actual) => ({ ...actual, usados: Math.min(actual.limite, actual.usados + 1) }));
    controlador.current = new AbortController();
    const paraEnviar: MensajeChat[] = historial
      .filter((mensaje) => mensaje.texto.trim())
      .map((mensaje) => ({ rol: mensaje.rol, texto: mensaje.texto }))
      .slice(-CHAT_MAX_MENSAJES);

    try {
      const respuesta = await fetch('/api/gym/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: paraEnviar }),
        signal: controlador.current.signal,
      });

      if (!respuesta.ok || !respuesta.body) {
        setError(await leerError(respuesta));
        quitarRespuestaVacia();
        return;
      }

      const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
      let pendiente = '';
      for (;;) {
        const { value, done } = await lector.read();
        if (done) {
          break;
        }
        pendiente += value;
        const lineas = pendiente.split('\n');
        pendiente = lineas.pop() ?? '';
        for (const linea of lineas) {
          if (!linea.trim()) {
            continue;
          }
          const evento = JSON.parse(linea) as EventoChat;
          if (evento.tipo === 'texto') {
            setEstado('');
            setEspera(null);
            agregarAlUltimo(evento.texto);
          } else if (evento.tipo === 'herramienta') {
            setEstado(ESTADO_HERRAMIENTA[evento.nombre] ?? 'Consultando tus datos…');
          } else if (evento.tipo === 'espera') {
            // Límite por minuto del plan gratuito de Groq: CHRONO sigue solo cuando le dan turno.
            setEspera(evento.segundos);
            setEstado(`Hay mucha demanda en este momento. CHRONO sigue en ${evento.segundos} s…`);
          } else if (evento.tipo === 'propuesta') {
            agregarPropuesta({ ...evento.propuesta, estado: 'pendiente' });
          } else if (evento.tipo === 'error') {
            setError(evento.mensaje);
          }
        }
      }
    } catch (falla) {
      if (!(falla instanceof DOMException && falla.name === 'AbortError')) {
        setError('Se perdió la conexión con CHRONO. Intenta de nuevo.');
      }
    } finally {
      quitarRespuestaVacia();
      setEstado('');
      setEspera(null);
      setEnviando(false);
      controlador.current = null;
      void actualizarUso();
    }
  };

  // Regenerar (último mensaje de CHRONO) y Reintentar (tras un error): vuelven a enviar la última pregunta, sin
  // tocar lo que la persona tenga escrito en el campo.
  const repetirUltima = () => {
    const indice = ultimaPregunta(mensajes);
    if (indice < 0) return;
    void enviar(mensajes[indice]!.texto, mensajes.slice(0, indice), false);
  };

  const detener = () => controlador.current?.abort();

  const nuevaConversacion = () => {
    controlador.current?.abort();
    setMensajes([]);
    setError('');
    campo.current?.focus();
  };

  // Escribe una pregunta en el campo para editarla (chips, panel): no se envía sola.
  const escribir = (texto: string) => {
    setEntrada(texto.slice(0, CHAT_MAX_CARACTERES));
    setPanelAbierto(false);
    requestAnimationFrame(() => campo.current?.focus());
  };

  const estadoVivo = espera !== null ? `Esperando turno: sigue en ${espera} s` : enviando ? 'Pensando…' : 'Listo para ayudarte';
  const indiceUltimo = mensajes.length - 1;
  const panel = <PanelContexto contexto={contexto} alPreguntar={escribir} />;

  return (
    <section data-intro={intro.fase} aria-label="Chat con CHRONO" className="chat-chrono chat-pantalla flex flex-col bg-fondo">
      <EncabezadoChat
        intro={intro}
        estadoVivo={estadoVivo}
        pensando={enviando}
        uso={uso}
        panelAbierto={panelAbierto}
        alAbrirPanel={() => setPanelAbierto(true)}
        botonPanel={botonPanel}
        hayMensajes={mensajes.length > 0}
        alNuevaConversacion={nuevaConversacion}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Fondo del área del chat: un cielo muy tenue y la marca de agua de CHRONO (5 %), detrás de todo. */}
          <div aria-hidden="true" className="cielo-chat pointer-events-none absolute inset-0 overflow-hidden">
            <SimboloChrono variante="mono" tamano={520} className="marca-agua-chrono absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div ref={lista} onScroll={alDesplazar} className="relative min-h-0 flex-1 overflow-y-auto" data-testid="lista-chat">
            <div className={`mx-auto flex min-h-full w-full max-w-[720px] flex-col px-4 py-6 ${mensajes.length > 0 ? 'xl:max-w-[820px]' : ''}`}>
              {mensajes.length === 0 ? (
                <EstadoVacioChat
                  contexto={contexto}
                  alEnviar={(texto) => void enviar(texto)}
                  alEscribir={escribir}
                />
              ) : (
                <div
                  role="log"
                  aria-live="polite"
                  aria-busy={enviando}
                  aria-label="Conversación"
                  className="chrono-entrada flex flex-col gap-6"
                  style={{ '--orden': 1 } as CSSProperties}
                >
                  {mensajes.map((mensaje, indice) => {
                    const anterior = mensajes[indice - 1];
                    const separador =
                      anterior?.hora && mensaje.hora && mensaje.hora - anterior.hora > DIEZ_MINUTOS ? HORA.format(mensaje.hora) : null;
                    const contenido =
                      mensaje.rol === 'usuario' ? (
                        <article aria-label="Tú dijiste" className="anim-entrada flex justify-end">
                          <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-primario px-4 py-2.5 text-base leading-[1.6] text-white">
                            {mensaje.texto}
                          </p>
                        </article>
                      ) : mensaje.texto || mensaje.propuestas?.length ? (
                        <MensajeChrono
                          texto={mensaje.texto}
                          conSimbolo={anterior?.rol !== 'asistente'}
                          alRegenerar={indice === indiceUltimo && !enviando && !agotado ? repetirUltima : undefined}
                        >
                          {mensaje.propuestas?.map((propuesta) => (
                            <TarjetaPropuesta
                              key={propuesta.id}
                              propuesta={propuesta}
                              deshabilitada={enviando}
                              alConfirmar={() => void confirmar(propuesta)}
                              alCancelar={() => cancelar(propuesta)}
                            />
                          ))}
                        </MensajeChrono>
                      ) : null;
                    return (
                      <Fragment key={indice}>
                        {separador ? (
                          <p className="flex items-center gap-3 text-sm text-texto-suave before:h-px before:flex-1 before:bg-borde after:h-px after:flex-1 after:bg-borde">
                            <span className="inline-flex items-center gap-1.5">
                              <Icono nombre="cronometro" className="h-4 w-4" />
                              {separador}
                            </span>
                          </p>
                        ) : null}
                        {contenido}
                      </Fragment>
                    );
                  })}
                  {estado ? (
                    <div className="flex items-center gap-3 text-base text-texto-suave" role="status">
                      <SimboloChrono variante="mono" tamano={24} className="simbolo-respira shrink-0 text-primario" />
                      {estado}
                    </div>
                  ) : null}
                  {error ? (
                    <div className="flex flex-col items-start gap-2">
                      <Aviso tipo="error">{error}</Aviso>
                      {!agotado && ultimaPregunta(mensajes) >= 0 ? (
                        <button
                          type="button"
                          onClick={repetirUltima}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borde-fuerte px-4 text-sm font-medium text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                        >
                          <Icono nombre="regenerar" className="h-4 w-4" />
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* En móvil, espacio extra abajo para el botón "Entrenar", que sobresale de la barra inferior. */}
          <div className={`relative mx-auto w-full max-w-[720px] px-4 pb-8 pt-2 lg:pb-3 ${mensajes.length > 0 ? 'xl:max-w-[820px]' : ''}`}>
            {!alFinal && mensajes.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-3">
                <button
                  type="button"
                  onClick={irAlFinal}
                  className="boton-ir-final pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borde-fuerte bg-elevada px-4 text-sm font-semibold text-texto shadow-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                  data-testid="ir-al-final"
                >
                  {hayNuevo ? 'Nuevo mensaje' : 'Ir al final'}
                  <Icono nombre="flechaAbajo" className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <Compositor
              valor={entrada}
              alCambiar={setEntrada}
              alEnviar={() => void enviar(entrada)}
              alDetener={detener}
              enviando={enviando}
              agotado={agotado}
              maxCaracteres={CHAT_MAX_CARACTERES}
              limite={uso.limite}
              conSeguimientos={mensajes.length > 0}
              campo={campo}
            />
          </div>
        </div>

        <aside aria-label="Lo que sé de ti" className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-borde lg:block xl:w-80">
          <h2 className="px-7 pt-5 text-lg font-semibold text-texto">Lo que sé de ti</h2>
          {panel}
        </aside>
      </div>

      <HojaContexto
        abierta={panelAbierto}
        alCerrar={() => {
          setPanelAbierto(false);
          botonPanel.current?.focus();
        }}
      >
        {panel}
      </HojaContexto>
      <IntroChrono {...intro} />
    </section>
  );
}
