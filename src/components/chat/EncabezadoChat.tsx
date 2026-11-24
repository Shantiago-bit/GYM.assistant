'use client';

import Link from 'next/link';
import { useState, type RefObject } from 'react';
import { RanuraLogoChrono, type EstadoIntroChrono } from '@/components/marca/IntroChrono';
import { SimboloChrono } from '@/components/marca/SimboloChrono';
import { Boton } from '@/components/ui/Boton';
import { Icono } from '@/components/ui/Icono';
import { MenuMasOpciones, CLASES_OPCION_MENU } from '@/components/ui/MenuMasOpciones';
import { Modal } from '@/components/ui/Modal';
import { resumenUso, type UsoChat } from '@/lib/chat/limite';

// El encabezado del chat (unos 64 px): CHRONO con su estado vivo, el contador de mensajes del día, "Lo que sé
// de ti" (cuando el panel no está fijo) y el menú "Más". RanuraLogoChrono es el destino de la intro.
export function EncabezadoChat({
  intro,
  estadoVivo,
  pensando,
  uso,
  panelAbierto,
  alAbrirPanel,
  botonPanel,
  hayMensajes,
  alNuevaConversacion,
}: {
  intro: Pick<EstadoIntroChrono, 'fase' | 'modo' | 'saltada'>;
  estadoVivo: string;
  pensando: boolean;
  uso: UsoChat;
  panelAbierto: boolean;
  alAbrirPanel: () => void;
  botonPanel: RefObject<HTMLButtonElement | null>;
  hayMensajes: boolean;
  alNuevaConversacion: () => void;
}) {
  const [modal, setModal] = useState<'nueva' | 'capacidades' | 'privacidad' | null>(null);
  const { quedanPocos } = resumenUso(uso);
  const porcentaje = uso.limite > 0 ? Math.min(100, (uso.usados / uso.limite) * 100) : 100;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-borde px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <RanuraLogoChrono fase={intro.fase} modo={intro.modo} saltada={intro.saltada} />
        <div className="chrono-titulo min-w-0">
          <h1 className="text-lg font-bold leading-6 tracking-wide text-texto">CHRONO</h1>
          <p className="flex items-center gap-1.5 truncate text-sm text-texto-suave" data-testid="estado-chrono">
            {pensando ? <SimboloChrono variante="mono" tamano={16} className="simbolo-respira shrink-0 text-primario" /> : null}
            <span className="truncate">{estadoVivo}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="w-auto sm:w-40" data-testid="contador-chat">
          <p className={`text-right text-sm tabular-nums sm:text-left ${quedanPocos ? 'font-semibold text-aviso' : 'text-texto-suave'}`}>
            <span className="sm:hidden" aria-hidden="true">
              {uso.usados}/{uso.limite}
            </span>
            <span className="sr-only sm:not-sr-only">
              {uso.usados} de {uso.limite} mensajes hoy
            </span>
          </p>
          <div aria-hidden="true" className="mt-1 hidden h-1 overflow-hidden rounded-full bg-borde sm:block">
            <div className={`h-full rounded-full ${quedanPocos ? 'bg-aviso' : 'bg-primario'}`} style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
        <button
          ref={botonPanel}
          type="button"
          aria-expanded={panelAbierto}
          onClick={alAbrirPanel}
          className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-borde-fuerte px-2.5 text-sm font-medium text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario xl:hidden"
        >
          <Icono nombre="usuario" />
          <span className="sr-only md:not-sr-only">Lo que sé de ti</span>
        </button>
        <MenuMasOpciones etiqueta="Más">
          <button type="button" role="menuitem" tabIndex={-1} className={CLASES_OPCION_MENU} onClick={() => (hayMensajes ? setModal('nueva') : alNuevaConversacion())}>
            Nueva conversación
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className={CLASES_OPCION_MENU} onClick={() => setModal('capacidades')}>
            ¿Qué puede hacer CHRONO?
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className={CLASES_OPCION_MENU} onClick={() => setModal('privacidad')}>
            Privacidad del chat
          </button>
        </MenuMasOpciones>
      </div>

      {modal === 'nueva' ? (
        <Modal titulo="¿Empezar una conversación nueva?" onCerrar={() => setModal(null)}>
          <p className="text-base text-texto-suave">Se borra la conversación de esta pestaña. Tus ejercicios y tu historial no cambian.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Boton variante="secundario" onClick={() => setModal(null)}>
              Seguir aquí
            </Boton>
            <Boton
              onClick={() => {
                setModal(null);
                alNuevaConversacion();
              }}
            >
              Empezar de nuevo
            </Boton>
          </div>
        </Modal>
      ) : null}
      {modal === 'capacidades' ? (
        <Modal titulo="¿Qué puede hacer CHRONO?" onCerrar={() => setModal(null)}>
          <ul className="list-disc space-y-1.5 pl-5 text-base text-texto marker:text-primario">
            <li>Conoce tus ejercicios, tus sesiones y lo que te toca en cada uno.</li>
            <li>Arma rutinas para tus días de entrenamiento y explica cada recomendación.</li>
            <li>Propone crear, ajustar, archivar o restaurar ejercicios: tú confirmas cada cambio.</li>
            <li>Responde dudas de técnica, descanso, alimentación y suplementos.</li>
          </ul>
          <p className="mt-4 text-sm font-semibold text-texto">Sus límites</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-texto-suave marker:text-primario">
            <li>Hasta {uso.limite} mensajes por día.</li>
            <li>No registra sesiones ni borra ejercicios: eso lo haces tú en la app.</li>
            <li>Puede equivocarse y no reemplaza a un profesional de la salud.</li>
          </ul>
        </Modal>
      ) : null}
      {modal === 'privacidad' ? (
        <Modal titulo="Privacidad del chat" onCerrar={() => setModal(null)}>
          <p className="text-base text-texto">
            Tus mensajes no se guardan en el servidor: viven solo en esta pestaña y se procesan con Groq para responderte.
          </p>
          <Link href="/privacidad" className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-primario underline underline-offset-4">
            Leer la política de privacidad
          </Link>
        </Modal>
      ) : null}
    </header>
  );
}
