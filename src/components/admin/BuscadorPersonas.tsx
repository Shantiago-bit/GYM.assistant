'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { TEXTO_ESTADO, type EstadoPersona } from '@/lib/reglas/personasAdmin';

interface Resultado {
  id: string;
  correoMascara: string;
  apodo: string | null;
  estado: EstadoPersona;
}

const ESPERA_MS = 250;

// Combobox con lista (patrón ARIA 1.2): flechas para moverse, Enter abre el detalle, Esc cierra. Busca por correo
// exacto o por el inicio del apodo. Con más de 8 coincidencias, enlace a la lista filtrada.
export function BuscadorPersonas() {
  const router = useRouter();
  const idLista = useId();
  const idEstado = useId();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [buscando, setBuscando] = useState(false);
  const peticion = useRef(0);

  useEffect(() => {
    const q = texto.trim();
    if (!q) {
      setResultados([]);
      setHayMas(false);
      setBuscando(false);
      return;
    }
    const numero = ++peticion.current;
    setBuscando(true);
    const temporizador = window.setTimeout(async () => {
      try {
        const respuesta = await fetch(`/api/admin/personas/buscar?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const contenido = await respuesta.json();
        if (numero !== peticion.current) return; // llegó tarde: ya se escribió otra cosa
        setResultados(contenido.ok ? contenido.datos.resultados : []);
        setHayMas(contenido.ok ? contenido.datos.hayMas : false);
      } catch {
        if (numero === peticion.current) setResultados([]);
      } finally {
        if (numero === peticion.current) setBuscando(false);
      }
      setActivo(-1);
    }, ESPERA_MS);
    return () => window.clearTimeout(temporizador);
  }, [texto]);

  const listaVisible = abierta && texto.trim() !== '' && !buscando;
  const enlaceLista = `/admin/personas?q=${encodeURIComponent(texto.trim())}`;

  const abrir = (resultado: Resultado) => {
    setAbierta(false);
    router.push(`/admin/personas/${resultado.id}` as Route);
  };

  const alPulsar = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setAbierta(true);
      if (resultados.length) setActivo((actual) => (actual + 1) % resultados.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAbierta(true);
      if (resultados.length) setActivo((actual) => (actual <= 0 ? resultados.length - 1 : actual - 1));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const elegido = resultados[activo] ?? (resultados.length === 1 ? resultados[0] : undefined);
      if (elegido) abrir(elegido);
      else if (texto.trim()) router.push(enlaceLista as Route);
    } else if (evento.key === 'Escape') {
      if (abierta) {
        evento.preventDefault();
        setAbierta(false);
        setActivo(-1);
      } else {
        setTexto('');
      }
    }
  };

  const mensajeEstado = !texto.trim()
    ? ''
    : buscando
      ? 'Buscando…'
      : resultados.length === 0
        ? 'No hay coincidencias'
        : `${resultados.length}${hayMas ? ' o más' : ''} ${resultados.length === 1 ? 'resultado' : 'resultados'}`;

  return (
    <div role="search" aria-label="Buscar personas" className="relative flex-1">
      <label htmlFor="buscar-personas" className="sr-only">
        Buscar personas por correo exacto o inicio del apodo
      </label>
      <input
        id="buscar-personas"
        type="text"
        role="combobox"
        aria-expanded={listaVisible}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={listaVisible && activo >= 0 ? `${idLista}-${activo}` : undefined}
        aria-describedby={idEstado}
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar personas por correo o apodo…"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setAbierta(true);
        }}
        onFocus={() => setAbierta(true)}
        onBlur={() => window.setTimeout(() => setAbierta(false), 150)}
        onKeyDown={alPulsar}
        className="min-h-11 w-full max-w-md rounded-full border border-borde-campo bg-campo px-4 text-base text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
      />
      <p id={idEstado} role="status" className="sr-only">
        {mensajeEstado}
      </p>
      <div
        className={`${listaVisible ? '' : 'hidden'} absolute left-0 top-full z-40 mt-2 w-full max-w-md overflow-hidden rounded-tarjeta bg-elevada shadow-elevada`}
      >
        <ul id={idLista} role="listbox" aria-label="Personas encontradas" className="max-h-80 overflow-y-auto py-1">
          {resultados.map((resultado, i) => (
            <li
              key={resultado.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => abrir(resultado)}
              onMouseEnter={() => setActivo(i)}
              className={`flex min-h-11 cursor-pointer flex-col justify-center px-4 py-1.5 text-sm ${i === activo ? 'bg-primario-suave' : ''}`}
            >
              <span className="font-semibold text-texto">{resultado.apodo ?? 'Sin apodo'}</span>
              <span className="text-texto-suave">
                {resultado.correoMascara} · {TEXTO_ESTADO[resultado.estado]}
              </span>
            </li>
          ))}
        </ul>
        {resultados.length === 0 ? <p className="px-4 py-3 text-sm text-texto-suave">No hay coincidencias</p> : null}
        {hayMas ? (
          <a
            href={enlaceLista}
            onMouseDown={(evento) => evento.preventDefault()}
            className="block border-t border-borde px-4 py-3 text-sm font-semibold text-primario underline-offset-4 hover:underline"
          >
            Ver todas las coincidencias en la lista
          </a>
        ) : null}
      </div>
    </div>
  );
}
