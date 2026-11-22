'use client';

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icono } from '@/components/ui/Icono';
import { Confeti, NumeroAnimado } from '@/components/ui/Movimiento';
import { CURVA_SALIDA, DURACION } from '@/lib/movimiento';
import { nombreMes, textoComparacion, textoRecord, type ResumenMes } from '@/lib/reglas/resumenMes';

const SEGUNDOS_POR_TARJETA = 6;
const FORMATO = new Intl.NumberFormat('es-CO');

interface Tarjeta {
  id: string;
  // Lo que se ve (decorativo para lectores: el mismo contenido va en la lista de abajo).
  visual: ReactNode;
  // El mismo contenido, en texto, para la lista accesible.
  texto: string;
  confeti?: boolean;
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <p className="flex flex-col">
      <span className="font-titulos text-7xl font-bold tabular-nums sm:text-8xl">
        <NumeroAnimado valor={valor} />
      </span>
      <span className="mt-1 text-lg text-white/90">{etiqueta}</span>
    </p>
  );
}

function tarjetas(resumen: ResumenMes): Tarjeta[] {
  const mes = nombreMes(resumen.mes);
  const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
  return [
    {
      id: 'portada',
      texto: `Tu mes de ${mes}: ${resumen.dias} ${plural(resumen.dias, 'día entrenado', 'días entrenados')} en ${resumen.sesiones} ${plural(resumen.sesiones, 'sesión', 'sesiones')}.`,
      visual: (
        <>
          <p className="text-lg text-white/90">Tu mes de {mes}</p>
          <Cifra valor={resumen.dias} etiqueta={plural(resumen.dias, 'día entrenado', 'días entrenados')} />
          <p className="text-lg text-white/90">
            en {resumen.sesiones} {plural(resumen.sesiones, 'sesión', 'sesiones')}
          </p>
        </>
      ),
    },
    {
      id: 'racha',
      texto: `Tu mejor racha del mes: ${resumen.mejorRacha} ${plural(resumen.mejorRacha, 'día', 'días')} seguidos.`,
      visual: (
        <>
          <p className="text-lg text-white/90">Tu mejor racha del mes</p>
          <Cifra valor={resumen.mejorRacha} etiqueta={`${plural(resumen.mejorRacha, 'día', 'días')} seguidos`} />
          <p className="text-base text-white/90">Contando solo tus días de entrenamiento.</p>
        </>
      ),
    },
    {
      id: 'records',
      confeti: resumen.totalRecords > 0,
      texto:
        resumen.totalRecords === 0
          ? 'Este mes no hubo récords nuevos: el próximo puede ser el tuyo.'
          : `${resumen.totalRecords} ${plural(resumen.totalRecords, 'récord personal', 'récords personales')}: ${resumen.records
              .map((record) => `${record.nombre}, ${textoRecord(record)}`)
              .join('; ')}.`,
      visual:
        resumen.totalRecords === 0 ? (
          <>
            <p className="text-lg text-white/90">Récords personales</p>
            <p className="font-titulos text-3xl font-bold">Este mes no hubo récords nuevos</p>
            <p className="text-base text-white/90">El próximo puede ser el tuyo.</p>
          </>
        ) : (
          <>
            <Cifra valor={resumen.totalRecords} etiqueta={plural(resumen.totalRecords, 'récord personal', 'récords personales')} />
            <ul className="space-y-2">
              {resumen.records.map((record) => (
                <li key={record.ejercicioId} className="flex items-center gap-2 text-lg">
                  <Icono nombre="trofeo" className="h-5 w-5" />
                  <span>
                    <span className="font-semibold">{record.nombre}:</span> {textoRecord(record)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ),
    },
    {
      id: 'estrella',
      texto: resumen.estrella
        ? `Tu ejercicio estrella: ${resumen.estrella.nombre}, con ${resumen.estrella.sesiones} ${plural(resumen.estrella.sesiones, 'sesión', 'sesiones')}. Volumen total: ${FORMATO.format(resumen.volumenKg)} kg.`
        : 'Este mes no anotaste sesiones.',
      visual: resumen.estrella ? (
        <>
          <p className="text-lg text-white/90">Tu ejercicio estrella</p>
          <p className="font-titulos text-4xl font-bold sm:text-5xl">{resumen.estrella.nombre}</p>
          <p className="text-lg text-white/90">
            {resumen.estrella.sesiones} {plural(resumen.estrella.sesiones, 'sesión', 'sesiones')}
          </p>
          <Cifra valor={resumen.volumenKg} etiqueta="kg de volumen total" />
        </>
      ) : (
        <p className="font-titulos text-3xl font-bold">Este mes no anotaste sesiones</p>
      ),
    },
    {
      id: 'comparacion',
      texto: `Frente al mes anterior: ${textoComparacion(resumen.dias, resumen.anterior.dias, resumen.mes)} en días entrenados y ${textoComparacion(resumen.sesiones, resumen.anterior.sesiones, resumen.mes)} en sesiones.`,
      visual: (
        <>
          <p className="text-lg text-white/90">Frente al mes anterior</p>
          <ul className="space-y-3 text-xl">
            <li>
              <span className="font-semibold">Días entrenados:</span> {textoComparacion(resumen.dias, resumen.anterior.dias, resumen.mes)}
            </li>
            <li>
              <span className="font-semibold">Sesiones:</span> {textoComparacion(resumen.sesiones, resumen.anterior.sesiones, resumen.mes)}
            </li>
          </ul>
          <p className="text-base text-white/90">Compártelo con la imagen de abajo.</p>
        </>
      ),
    },
  ];
}

// La historia del mes: 5 tarjetas que avanzan solas (salvo con movimiento reducido), con toques, con las flechas o
// con los botones Anterior y Siguiente, y se pueden pausar. Todo el contenido está también en una lista para
// lectores de pantalla; las tarjetas animadas son decorativas para ellos.
export function HistoriaMes({ resumen }: { resumen: ResumenMes }) {
  const reducir = useReducedMotion() ?? false;
  const lista = tarjetas(resumen);
  const [actual, setActual] = useState(0);
  const [pausada, setPausada] = useState(reducir);
  const [direccion, setDireccion] = useState(1);
  const historia = useRef<HTMLDivElement>(null);

  const ir = useCallback(
    (indice: number) => {
      const destino = Math.min(lista.length - 1, Math.max(0, indice));
      setDireccion(destino >= actual ? 1 : -1);
      setActual(destino);
    },
    [actual, lista.length],
  );

  // Con movimiento reducido empieza en pausa (no avanza sola).
  useEffect(() => {
    if (reducir) setPausada(true);
  }, [reducir]);

  useEffect(() => {
    if (pausada || actual >= lista.length - 1) return;
    const temporizador = setTimeout(() => ir(actual + 1), SEGUNDOS_POR_TARJETA * 1000);
    return () => clearTimeout(temporizador);
  }, [pausada, actual, ir, lista.length]);

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      ir(actual + 1);
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      ir(actual - 1);
    } else if (evento.key === ' ' && evento.target === historia.current) {
      evento.preventDefault();
      setPausada((valor) => !valor);
    }
  };

  const tarjeta = lista[actual]!;
  return (
    <section aria-labelledby="titulo-historia" className="mx-auto w-full max-w-md" data-guia="historia-mes">
      <h2 id="titulo-historia" className="sr-only">
        Tu mes de {nombreMes(resumen.mes, true)}, tarjeta por tarjeta
      </h2>
      {/* Barras de progreso: una por tarjeta. */}
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        {lista.map((item, indice) => (
          <span key={item.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-borde">
            <span className={`block h-full rounded-full bg-primario ${indice <= actual ? 'w-full' : 'w-0'}`} />
          </span>
        ))}
      </div>

      <div
        ref={historia}
        tabIndex={0}
        onKeyDown={alTeclear}
        role="group"
        aria-roledescription="historia"
        aria-label={`Tarjeta ${actual + 1} de ${lista.length}. Usa las flechas para avanzar o volver.`}
        className="relative aspect-[9/14] w-full overflow-hidden rounded-tarjeta bg-gradient-to-br from-primario to-primario-fuerte text-white shadow-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        {/* Tocar la mitad izquierda vuelve y la derecha avanza (en el móvil, como una historia). */}
        <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => ir(actual - 1)} />
        <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-y-0 right-0 z-10 w-2/3" onClick={() => ir(actual + 1)} />
        <AnimatePresence initial={false} custom={direccion} mode="wait">
          <m.div
            key={tarjeta.id}
            aria-hidden="true"
            initial={reducir ? { opacity: 0 } : { opacity: 0, x: 40 * direccion }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, x: -40 * direccion }}
            transition={{ duration: reducir ? 0 : DURACION.lenta, ease: CURVA_SALIDA }}
            className="flex h-full flex-col justify-center gap-5 p-8"
          >
            {tarjeta.visual}
            {tarjeta.confeti ? <Confeti /> : null}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => ir(actual - 1)}
          disabled={actual === 0}
          className="inline-flex min-h-11 items-center gap-1 rounded-boton px-3 text-sm font-semibold text-primario hover:bg-primario-suave disabled:text-texto-suave disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          <Icono nombre="flechaIzquierda" className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setPausada((valor) => !valor)}
          aria-pressed={pausada}
          className="inline-flex min-h-11 items-center rounded-boton px-3 text-sm font-semibold text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          {pausada ? 'Reproducir' : 'Pausar'}
        </button>
        <button
          type="button"
          onClick={() => ir(actual + 1)}
          disabled={actual === lista.length - 1}
          className="inline-flex min-h-11 items-center gap-1 rounded-boton px-3 text-sm font-semibold text-primario hover:bg-primario-suave disabled:text-texto-suave disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          Siguiente
          <Icono nombre="flechaDerecha" className="h-4 w-4" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        Tarjeta {actual + 1} de {lista.length}
      </p>

      {/* Todo el contenido, en orden, para lectores de pantalla. */}
      <ol className="sr-only" aria-label="Resumen del mes">
        {lista.map((item) => (
          <li key={item.id}>{item.texto}</li>
        ))}
      </ol>
    </section>
  );
}
