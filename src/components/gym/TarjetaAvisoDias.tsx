'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { enviarJson } from '@/lib/http/cliente';

// Una sola vez, para las cuentas que recibieron lunes a sábado por defecto. No es un modal: no interrumpe.
export function TarjetaAvisoDias({ enPerfil = false }: { enPerfil?: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const marcarVisto = () => enviarJson('/api/gym/perfil/dias/aviso');

  if (!visible) return null;

  return (
    <section
      aria-label="Elige tus días de entrenamiento"
      data-guia="dias-entrenamiento"
      className="mb-5 flex flex-col gap-3 rounded-gym border border-borde bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-texto">Ahora puedes elegir qué días entrenas para que tu racha sea justa.</p>
      <div className="flex flex-wrap gap-2">
        <Boton
          onClick={() => {
            setVisible(false);
            void marcarVisto();
            if (enPerfil) {
              document.getElementById('dias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              router.push('/gym/perfil#dias');
            }
          }}
        >
          Elegir mis días
        </Boton>
        <Boton
          variante="secundario"
          onClick={() => {
            setVisible(false);
            void marcarVisto();
          }}
        >
          Mantener lunes a sábado
        </Boton>
      </div>
    </section>
  );
}
