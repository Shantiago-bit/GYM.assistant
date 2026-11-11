'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { OPCIONES_GENERO } from '@/lib/config/gym';
import { enviarJson } from '@/lib/http/cliente';
import { supabase } from '@/lib/supabase';

const OPCIONES = [
  { valor: '', texto: 'Elige una opción' },
  ...OPCIONES_GENERO.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto })),
];

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

// Para cuentas creadas antes del registro en dos pasos. Un nombre rechazado solo pide cambiarlo.
export function FormularioCompletarPerfil() {
  const router = useRouter();
  const [datos, setDatos] = useState({ nombre: '', apodo: '', fechaNacimiento: '', genero: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo: keyof typeof datos) => (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDatos((actuales) => ({ ...actuales, [campo]: evento.target.value }));

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    if (datos.nombre.trim().length < 2) return setError('Escribe tu nombre (al menos 2 letras).');
    if (!datos.fechaNacimiento) return setError('Indica tu fecha de nacimiento.');
    if (datos.fechaNacimiento > hoy()) return setError('La fecha de nacimiento no puede ser futura.');
    if (!datos.genero) return setError('Elige una opción de género.');

    setGuardando(true);
    const respuesta = await enviarJson('/api/gym/perfil', {
      nombre: datos.nombre.trim(),
      apodo: datos.apodo.trim() || undefined,
      fechaNacimiento: datos.fechaNacimiento,
      genero: datos.genero,
    });
    if (!respuesta.ok) {
      setGuardando(false);
      setError(respuesta.mensaje);
      return;
    }
    router.replace('/gym');
    router.refresh();
  };

  const cerrarSesion = async () => {
    await supabase?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate aria-label="Completa tu perfil">
      <Campo etiqueta="Nombre" value={datos.nombre} maxLength={60} autoComplete="name" onChange={cambiar('nombre')} />
      <Campo
        etiqueta="¿Cómo quieres que te llamemos?"
        value={datos.apodo}
        maxLength={30}
        autoComplete="nickname"
        ayuda="Opcional. Si lo dejas vacío, usaremos tu primer nombre."
        onChange={cambiar('apodo')}
      />
      <Campo
        etiqueta="Fecha de nacimiento"
        type="date"
        min="1900-01-02"
        max={hoy()}
        autoComplete="bday"
        value={datos.fechaNacimiento}
        ayuda="No podrás cambiarla después desde la app."
        onChange={cambiar('fechaNacimiento')}
      />
      <Selector etiqueta="Género" opciones={OPCIONES} value={datos.genero} onChange={cambiar('genero')} />
      <p className="text-sm text-texto-suave">
        Usamos estos datos para saludarte y adaptar los consejos a tu edad. Más detalles en la{' '}
        <Link href="/privacidad" className="font-medium text-primario underline underline-offset-4">
          política de privacidad
        </Link>
        .
      </p>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" cargando={guardando}>
          Guardar y continuar
        </Boton>
        <Boton variante="fantasma" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </div>
    </form>
  );
}
