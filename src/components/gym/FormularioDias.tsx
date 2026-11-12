'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { SelectorDias } from '@/components/ui/SelectorDias';
import { enviarJson } from '@/lib/http/cliente';

// "Mis días de entrenamiento" en el perfil: el cambio aplica desde hoy.
export function FormularioDias({ inicial }: { inicial: number[] }) {
  const router = useRouter();
  const [dias, setDias] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setAviso(null);
    if (dias.length === 0) {
      setAviso({ texto: 'Elige al menos un día', tipo: 'error' });
      return;
    }
    setGuardando(true);
    const respuesta = await enviarJson<{ dias: number[] }>('/api/gym/perfil/dias', { dias });
    setGuardando(false);
    if (!respuesta.ok) {
      setAviso({ texto: respuesta.mensaje, tipo: 'error' });
      return;
    }
    setDias(respuesta.datos.dias);
    setAviso({ texto: 'Listo: tus días de entrenamiento se guardaron.', tipo: 'exito' });
    router.refresh();
  };

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate aria-label="Mis días de entrenamiento">
      <SelectorDias valor={dias} alCambiar={setDias} etiqueta="¿Qué días entrenas?" />
      <p className="text-sm text-texto-suave">El cambio aplica desde hoy; tu racha anterior no se modifica.</p>
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      <Boton type="submit" cargando={guardando}>
        Guardar
      </Boton>
    </form>
  );
}
