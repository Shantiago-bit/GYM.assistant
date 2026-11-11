'use client';

import { useEffect, useState } from 'react';

const TAMANOS = {
  chico: 'h-8 w-8 text-xs',
  grande: 'h-24 w-24 text-3xl',
} as const;

const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || '?';

// Foto de perfil o, sin foto (o si la URL firmada ya venció), las iniciales del nombre.
export function Avatar({
  url,
  nombre,
  tamano = 'chico',
  className = '',
}: {
  url: string | null;
  nombre: string;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [url]);

  const clases = `${TAMANOS[tamano]} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`;
  if (url && !fallo) {
    // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración: next/image no aporta nada.
    return <img src={url} alt="" className={`${clases} object-cover`} onError={() => setFallo(true)} />;
  }
  return (
    <span aria-hidden="true" className={`${clases} bg-primario-suave font-bold text-primario`}>
      {iniciales(nombre)}
    </span>
  );
}
