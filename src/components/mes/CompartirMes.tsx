'use client';

import { useEffect, useState } from 'react';
import { Boton, clasesBoton } from '@/components/ui/Boton';

// La URL de la imagen: siempre la de la cuenta de la sesión. Los interruptores empiezan apagados.
export function urlImagenMes(mes: string, opciones: { apodo: boolean; pesos: boolean }): string {
  const parametros = new URLSearchParams({ mes });
  if (opciones.apodo) parametros.set('apodo', '1');
  if (opciones.pesos) parametros.set('pesos', '1');
  return `/api/gym/mi-mes/imagen?${parametros.toString()}`;
}

function Interruptor({ etiqueta, activo, onCambio }: { etiqueta: string; activo: boolean; onCambio: (valor: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-boton border border-borde bg-superficie px-3 text-left text-sm font-medium text-texto hover:border-primario focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
    >
      {etiqueta}
      <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${activo ? 'bg-primario' : 'bg-borde'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-superficie shadow-suave transition-transform motion-reduce:transition-none ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

// "Compartir": antes de compartir, la persona elige si mostrar su apodo y los pesos de sus récords (apagados por
// defecto). "Compartir" usa navigator.share con el archivo si el navegador lo permite; si no, solo "Descargar".
export function CompartirMes({ mes }: { mes: string }) {
  const [apodo, setApodo] = useState(false);
  const [pesos, setPesos] = useState(false);
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const [estado, setEstado] = useState('');
  const url = urlImagenMes(mes, { apodo, pesos });
  const nombreArchivo = `mi-mes-${mes}.png`;

  useEffect(() => {
    setPuedeCompartir(typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function');
  }, []);

  const compartir = async () => {
    setEstado('Preparando la imagen…');
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error('imagen');
      const archivo = new File([await respuesta.blob()], nombreArchivo, { type: 'image/png' });
      if (!navigator.canShare({ files: [archivo] })) {
        setEstado('Tu navegador no permite compartir el archivo: usa "Descargar imagen".');
        return;
      }
      await navigator.share({ files: [archivo], title: 'Mi mes en el gym' });
      setEstado('');
    } catch (error) {
      // Cancelar el menú de compartir no es un error.
      setEstado(error instanceof DOMException && error.name === 'AbortError' ? '' : 'No se pudo compartir. Intenta con "Descargar imagen".');
    }
  };

  return (
    <section aria-labelledby="titulo-compartir" className="mx-auto w-full max-w-md space-y-3" data-guia="compartir-mes">
      <h2 id="titulo-compartir" className="font-titulos text-titulo-2 font-bold text-texto">
        Compártelo
      </h2>
      <p className="text-sm text-texto-suave">
        La imagen muestra tus días, tu racha, cuántos récords lograste y tu ejercicio estrella. Por defecto no lleva tu
        nombre ni tus pesos.
      </p>
      <Interruptor etiqueta="Mostrar mi apodo" activo={apodo} onCambio={setApodo} />
      <Interruptor etiqueta="Mostrar pesos de mis récords" activo={pesos} onCambio={setPesos} />
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada al vuelo por la API, no un archivo estático */}
      <img
        src={url}
        alt="Vista previa de la imagen para compartir"
        width={1080}
        height={1920}
        className="mx-auto h-auto w-48 rounded-boton border border-borde shadow-suave"
      />
      <div className="flex flex-wrap gap-2">
        {puedeCompartir ? <Boton onClick={() => void compartir()}>Compartir</Boton> : null}
        <a href={url} download={nombreArchivo} className={clasesBoton(puedeCompartir ? 'secundario' : 'primario')}>
          Descargar imagen
        </a>
      </div>
      <p className="text-sm text-texto" aria-live="polite">
        {estado}
      </p>
    </section>
  );
}
