'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { EDAD_MINIMA_REGISTRO, EDAD_MINIMA_SIN_AUTORIZACION, OPCIONES_GENERO } from '@/lib/config/gym';
import { enviarJson } from '@/lib/http/cliente';
import { calcularEdad } from '@/lib/reglas/perfil';
import { supabase } from '@/lib/supabase';

const OPCIONES = [
  { valor: '', texto: 'Elige una opción' },
  ...OPCIONES_GENERO.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto })),
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

// Para cuentas creadas antes del registro en dos pasos. Un nombre rechazado solo pide cambiarlo. Si la fecha
// es de un menor de 12, pide el correo del tutor y la cuenta queda esperando su autorización.
export function FormularioCompletarPerfil() {
  const router = useRouter();
  const [datos, setDatos] = useState({ nombre: '', apodo: '', fechaNacimiento: '', genero: '', correoTutor: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo: keyof typeof datos) => (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDatos((actuales) => ({ ...actuales, [campo]: evento.target.value }));

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaNacimiento) && datos.fechaNacimiento <= hoy();
  const edad = fechaValida ? calcularEdad(datos.fechaNacimiento, hoy()) : null;
  const pideTutor = edad !== null && edad >= EDAD_MINIMA_REGISTRO && edad < EDAD_MINIMA_SIN_AUTORIZACION;

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    if (datos.nombre.trim().length < 2) return setError('Escribe tu nombre (al menos 2 letras).');
    if (!datos.fechaNacimiento) return setError('Indica tu fecha de nacimiento.');
    if (datos.fechaNacimiento > hoy()) return setError('La fecha de nacimiento no puede ser futura.');
    if (!datos.genero) return setError('Elige una opción de género.');
    if (pideTutor && !EMAIL_REGEX.test(datos.correoTutor.trim())) {
      return setError('Escribe un correo válido de tu mamá, papá o tutor.');
    }

    setGuardando(true);
    const respuesta = await enviarJson('/api/gym/perfil', {
      nombre: datos.nombre.trim(),
      apodo: datos.apodo.trim() || undefined,
      fechaNacimiento: datos.fechaNacimiento,
      genero: datos.genero,
      ...(pideTutor ? { correoTutor: datos.correoTutor.trim().toLowerCase() } : {}),
    });
    if (!respuesta.ok) {
      setGuardando(false);
      setError(respuesta.mensaje);
      return;
    }
    // Si quedó pendiente, el layout lleva a "Esperando autorización".
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
      {pideTutor ? (
        <Campo
          etiqueta="Correo de tu mamá, papá o tutor"
          type="email"
          autoComplete="off"
          value={datos.correoTutor}
          ayuda="Le enviaremos un correo para que autorice tu cuenta. Podrás seguir cuando acepte."
          onChange={cambiar('correoTutor')}
        />
      ) : null}
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
