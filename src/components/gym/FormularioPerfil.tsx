'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { OPCIONES_GENERO } from '@/lib/config/gym';
import { enviarJson } from '@/lib/http/cliente';

const OPCIONES = OPCIONES_GENERO.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto }));

interface DatosEditables {
  nombre: string;
  apodo: string | null;
  genero: string;
}

// Nombre, apodo y género. Los nombres pasan por el mismo filtro que en el registro, sin contar intentos.
export function FormularioPerfil({ inicial }: { inicial: DatosEditables }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial.nombre);
  const [apodo, setApodo] = useState(inicial.apodo ?? '');
  const [genero, setGenero] = useState(inicial.genero);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setAviso(null);
    if (nombre.trim().length < 2) {
      setAviso({ texto: 'El nombre debe tener al menos 2 caracteres.', tipo: 'error' });
      return;
    }
    setGuardando(true);
    const respuesta = await enviarJson<DatosEditables>(
      '/api/gym/perfil',
      { nombre: nombre.trim(), apodo: apodo.trim() || undefined, genero },
      'PATCH',
    );
    setGuardando(false);
    if (!respuesta.ok) {
      setAviso({ texto: respuesta.mensaje, tipo: 'error' });
      return;
    }
    setAviso({ texto: 'Datos guardados.', tipo: 'exito' });
    router.refresh();
  };

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate aria-label="Tus datos">
      <Campo etiqueta="Nombre" value={nombre} maxLength={60} autoComplete="name" onChange={(e) => setNombre(e.target.value)} />
      <Campo
        etiqueta="¿Cómo quieres que te llamemos?"
        value={apodo}
        maxLength={30}
        autoComplete="nickname"
        ayuda="Opcional. Si lo dejas vacío, usaremos tu primer nombre."
        onChange={(e) => setApodo(e.target.value)}
      />
      <Selector etiqueta="Género" opciones={OPCIONES} value={genero} onChange={(e) => setGenero(e.target.value)} />
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      <Boton type="submit" cargando={guardando}>
        Guardar cambios
      </Boton>
    </form>
  );
}
