'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { enviarJson } from '@/lib/http/cliente';

// Devuelve un ejercicio archivado a la lista activa. No es destructivo, así que no pide confirmación.
// destino: página a la que se vuelve con el aviso "restaurado" (el detalle o la lista de archivados).
export function BotonRestaurar({
  id,
  destino,
  variante = 'primario',
  guia,
}: {
  id: string;
  destino: string;
  variante?: 'primario' | 'secundario';
  guia?: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const restaurar = async () => {
    setError('');
    setOcupado(true);
    const respuesta = await enviarJson(`/api/gym/ejercicios/${id}/restaurar`);
    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setOcupado(false);
      return;
    }
    const url = new URL(destino, window.location.origin);
    url.searchParams.set('aviso', 'restaurado');
    router.replace(`${url.pathname}${url.search}` as Route);
    router.refresh();
    setOcupado(false);
  };

  return (
    <>
      <Boton variante={variante} disabled={ocupado} onClick={() => void restaurar()} data-guia={guia}>
        {ocupado ? 'Restaurando…' : 'Restaurar'}
      </Boton>
      {error ? (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </>
  );
}
