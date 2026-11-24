'use client';

import { useEffect } from 'react';
import { aplicarNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import type { NivelAnimacion } from '@/lib/reglas/animacion';

// Si las cookies de este navegador no coinciden con el perfil (se cambió en otro dispositivo, o es la primera vez
// aquí), manda el perfil: actualiza cookies y <html>. No pinta nada.
export function SincronizarAnimacion({ nivel, vibracion }: { nivel: NivelAnimacion; vibracion: boolean }) {
  useEffect(() => {
    const d = document.documentElement.dataset;
    if (d.animacion !== nivel || (d.vibracion === 'no') === vibracion) aplicarNivelMovimiento(nivel, vibracion);
  }, [nivel, vibracion]);
  return null;
}
