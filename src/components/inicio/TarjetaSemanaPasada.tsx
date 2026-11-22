'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { Cerrable } from '@/components/ui/Cerrable';
import { Icono } from '@/components/ui/Icono';
import { formatearFecha } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import { PREGUNTA_SEMANA, type ResumenSemana } from '@/lib/reglas/semana';

// "Tu semana": el resumen de la semana anterior, hecho con reglas (no con IA). Sale desde el lunes y se puede
// cerrar hasta el lunes siguiente.
export function TarjetaSemanaPasada({ resumen }: { resumen: ResumenSemana }) {
  const [visible, setVisible] = useState(true);
  const cerrar = () => {
    setVisible(false);
    void enviarJson('/api/gym/perfil/semana');
  };
  const nada = resumen.mejoras.length === 0 && resumen.estancados.length === 0;

  return (
    <Cerrable visible={visible}>
      <section
        aria-labelledby="titulo-semana-pasada"
        data-guia="semana-pasada"
        className="relative mb-5 rounded-tarjeta border border-borde bg-superficie p-4 pr-14 shadow-suave sm:p-5 sm:pr-14"
      >
        <h2 id="titulo-semana-pasada" className="font-titulos text-lg font-bold text-texto">
          Tu semana pasada
        </h2>
        <p className="text-sm text-texto-suave">
          Del {formatearFecha(resumen.desde)} al {formatearFecha(resumen.hasta)}: {resumen.sesiones}{' '}
          {resumen.sesiones === 1 ? 'sesión' : 'sesiones'} en {resumen.dias} {resumen.dias === 1 ? 'día' : 'días'}.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {resumen.mejoras.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-subir">Mejoró</h3>
              <ul className="mt-1 space-y-1 text-sm text-texto">
                {resumen.mejoras.map((mejora) => (
                  <li key={mejora.ejercicioId} className="flex items-start gap-1.5">
                    <Icono nombre={mejora.record ? 'trofeo' : 'flechaArriba'} className="mt-0.5 h-4 w-4 text-subir" />
                    <span>
                      <span className="font-medium">{mejora.nombre}:</span> {mejora.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {resumen.estancados.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-mantener">Se estancó</h3>
              <ul className="mt-1 space-y-1 text-sm text-texto">
                {resumen.estancados.map((estancado) => (
                  <li key={estancado.ejercicioId} className="flex items-start gap-1.5">
                    <Icono nombre="flechaDerecha" className="mt-0.5 h-4 w-4 text-mantener" />
                    <span>
                      <span className="font-medium">{estancado.nombre}:</span> {estancado.sesiones} sesiones igual
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {nada ? <p className="text-sm text-texto">Sin cambios para destacar.</p> : null}
        </div>
        <div className="mt-3 rounded-boton bg-primario-suave p-3">
          <h3 className="text-sm font-semibold text-texto">Para esta semana</h3>
          <p className="mt-0.5 text-sm text-texto">{resumen.sugerencia}</p>
        </div>
        <Link
          href={`/gym/chat?pregunta=${encodeURIComponent(PREGUNTA_SEMANA)}` as Route}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-boton px-2 text-sm font-semibold text-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario -ml-2"
        >
          Pregúntale a CHRONO
          <Icono nombre="flechaDerecha" className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar el resumen de la semana hasta el lunes"
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-texto-suave hover:bg-fondo hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          <Icono nombre="cerrar" />
        </button>
      </section>
    </Cerrable>
  );
}
