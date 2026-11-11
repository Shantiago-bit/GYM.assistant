'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { enviarJson } from '@/lib/http/cliente';
import { supabase } from '@/lib/supabase';

// "Reenviar al tutor" (máximo 3 por día) y "Cerrar sesión" en la pantalla de espera.
export function AccionesEspera({ restantesIniciales }: { restantesIniciales: number }) {
  const router = useRouter();
  const [restantes, setRestantes] = useState(restantesIniciales);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const reenviar = async () => {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson<{ restantes: number }>('/api/gym/perfil/reenviar-tutor');
    setEnviando(false);
    if (!respuesta.ok) {
      if (respuesta.codigo === 'REENVIOS_AGOTADOS') setRestantes(0);
      setAviso({ texto: respuesta.mensaje, tipo: 'error' });
      return;
    }
    setRestantes(respuesta.datos.restantes);
    setAviso({ texto: 'Listo, le reenviamos el correo a tu tutor.', tipo: 'exito' });
  };

  const cerrarSesion = async () => {
    await supabase?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={() => void reenviar()} cargando={enviando} disabled={restantes === 0}>
          Reenviar al tutor
        </Boton>
        <Boton variante="fantasma" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </div>
      <p className="text-xs text-texto-suave">
        {restantes > 0
          ? `Puedes reenviarlo ${restantes} ${restantes === 1 ? 'vez' : 'veces'} más hoy.`
          : 'Ya no puedes reenviarlo hoy. Podrás hacerlo de nuevo mañana.'}
      </p>
    </div>
  );
}
