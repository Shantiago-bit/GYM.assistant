'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ReenviarConfirmacion } from '@/components/auth/ReenviarConfirmacion';
import { SelectorDias } from '@/components/ui/SelectorDias';
import { MAX_REENVIOS_TUTOR_DIA, OPCIONES_GENERO } from '@/lib/config/gym';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAMPO =
  'w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const ETIQUETA = 'mb-2 block text-sm font-medium text-slate-700';
const BOTON =
  'w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-700 disabled:shadow-none';

interface Respuesta<T> {
  ok: boolean;
  datos?: T;
  error?: { codigo: string; mensaje: string };
}

type Mensaje = { texto: string; tipo: 'error' | 'exito' } | null;

const PERFIL_VACIO = { nombre: '', apodo: '', fechaNacimiento: '', genero: '' };
const CUENTA_VACIA = { email: '', password: '', confirmacion: '', correoTutor: '' };

// Fecha de hoy en Colombia, para que el calendario no ofrezca fechas futuras.
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

async function enviar<T>(url: string, cuerpo: unknown): Promise<{ estado: number; cuerpo: Respuesta<T> }> {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: (await respuesta.json()) as Respuesta<T> };
}

export function RegistroForm() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [perfil, setPerfil] = useState(PERFIL_VACIO);
  // Días de entrenamiento (ISO, 1 = lunes). Ninguno preseleccionado.
  const [dias, setDias] = useState<number[]>([]);
  const [errorDias, setErrorDias] = useState('');
  // Errores del paso 1, junto a cada campo (aria-invalid y aria-describedby); el foco va al primero.
  const [errores1, setErrores1] = useState<Partial<Record<'nombre' | 'fechaNacimiento' | 'genero', string>>>({});
  const [cuenta, setCuenta] = useState(CUENTA_VACIA);
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [enviando, setEnviando] = useState(false);
  // Correo del menor recién registrado, para ofrecer "Reenviar al tutor" (aún no puede iniciar sesión).
  const [esperaTutor, setEsperaTutor] = useState<string | null>(null);
  // Correo del adulto recién registrado, para ofrecer "Reenviar enlace" si la confirmación tarda.
  const [esperaConfirmacion, setEsperaConfirmacion] = useState<string | null>(null);
  const [reenvios, setReenvios] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);

  const cambiarPerfil = (campo: keyof typeof PERFIL_VACIO) => (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPerfil((actual) => ({ ...actual, [campo]: evento.target.value }));
    setErrores1(({ [campo as 'nombre']: _quitado, ...resto }) => resto);
  };
  const cambiarCuenta = (campo: keyof typeof CUENTA_VACIA) => (evento: React.ChangeEvent<HTMLInputElement>) =>
    setCuenta((actual) => ({ ...actual, [campo]: evento.target.value }));

  const irAPaso = (destino: 1 | 2) => {
    setPaso(destino);
    // Lleva el foco al título del paso para que los lectores de pantalla anuncien el cambio.
    requestAnimationFrame(() => titulo.current?.focus());
  };

  // Tras el quinto nombre rechazado, el servidor cancela el registro: se borra todo lo escrito.
  const cancelarRegistro = (texto: string) => {
    setPerfil(PERFIL_VACIO);
    setDias([]);
    setCuenta(CUENTA_VACIA);
    setRequiereAutorizacion(false);
    setMensaje({ texto, tipo: 'error' });
    irAPaso(1);
  };

  const datosPerfil = () => ({
    nombre: perfil.nombre.trim(),
    apodo: perfil.apodo.trim() || undefined,
    fechaNacimiento: perfil.fechaNacimiento,
    genero: perfil.genero,
    dias,
  });

  const continuar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setMensaje(null);

    const encontrados: typeof errores1 = {};
    if (perfil.nombre.trim().length < 2) encontrados.nombre = 'Escribe tu nombre, con al menos 2 letras.';
    if (!perfil.fechaNacimiento) encontrados.fechaNacimiento = 'Escribe tu fecha de nacimiento (día, mes y año).';
    else if (perfil.fechaNacimiento > hoy()) encontrados.fechaNacimiento = 'La fecha de nacimiento no puede ser futura: revisa el año.';
    if (!perfil.genero) encontrados.genero = 'Elige una opción de género; puedes elegir "Prefiero no decirlo".';
    const sinDias = dias.length === 0;
    setErrores1(encontrados);
    setErrorDias(sinDias ? 'Elige al menos un día' : '');
    if (Object.keys(encontrados).length > 0 || sinDias) {
      // El foco va al primer campo con error (los días, si es el único).
      requestAnimationFrame(() =>
        (document.querySelector<HTMLElement>('form [aria-invalid="true"]') ??
          (sinDias ? document.querySelector<HTMLElement>('form [aria-pressed]') : null)
        )?.focus(),
      );
      return;
    }

    setEnviando(true);
    try {
      const { estado, cuerpo } = await enviar<{ requiereAutorizacion: boolean }>('/api/auth/registro/perfil', datosPerfil());
      if (estado === 429) {
        cancelarRegistro(cuerpo.error?.mensaje ?? 'Se canceló la creación de la cuenta.');
        return;
      }
      if (!cuerpo.ok || !cuerpo.datos) {
        setMensaje({ texto: cuerpo.error?.mensaje ?? 'Revisa tus datos.', tipo: 'error' });
        return;
      }
      setRequiereAutorizacion(cuerpo.datos.requiereAutorizacion);
      irAPaso(2);
    } catch {
      setMensaje({ texto: 'No se pudo conectar con el servicio de registro. Inténtalo de nuevo.', tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  const crearCuenta = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setMensaje(null);

    const correo = cuenta.email.trim().toLowerCase();
    const correoTutor = cuenta.correoTutor.trim().toLowerCase();
    if (!EMAIL_REGEX.test(correo)) {
      setMensaje({ texto: 'Introduce un correo válido.', tipo: 'error' });
      return;
    }
    if (cuenta.password.length < 8) {
      setMensaje({ texto: 'La contraseña debe tener al menos 8 caracteres.', tipo: 'error' });
      return;
    }
    if (cuenta.password !== cuenta.confirmacion) {
      setMensaje({ texto: 'Las contraseñas no coinciden.', tipo: 'error' });
      return;
    }
    if (requiereAutorizacion) {
      if (!EMAIL_REGEX.test(correoTutor)) {
        setMensaje({ texto: 'Escribe un correo válido de tu mamá, papá o tutor.', tipo: 'error' });
        return;
      }
      if (correoTutor === correo) {
        setMensaje({ texto: 'El correo de tu tutor debe ser distinto al tuyo.', tipo: 'error' });
        return;
      }
    }

    // La app crea la cuenta y envía la confirmación con su propia plantilla (ver /api/auth/registro).
    setEnviando(true);
    try {
      const { estado, cuerpo } = await enviar<{ mensaje: string; requiereAutorizacion?: boolean }>('/api/auth/registro', {
        perfil: datosPerfil(),
        email: correo,
        password: cuenta.password,
        ...(requiereAutorizacion ? { correoTutor } : {}),
      });
      if (estado === 429) {
        cancelarRegistro(cuerpo.error?.mensaje ?? 'Se canceló la creación de la cuenta.');
        return;
      }
      if (!cuerpo.ok) {
        // Si el servidor rechaza algo del paso 1, se vuelve allí para corregirlo.
        if (estado === 422 || estado === 403) {
          irAPaso(1);
        }
        setMensaje({ texto: cuerpo.error?.mensaje ?? 'No se pudo crear la cuenta. Inténtalo de nuevo.', tipo: 'error' });
        return;
      }
      setCuenta((actual) => ({ ...actual, password: '', confirmacion: '' }));
      setEsperaTutor(cuerpo.datos?.requiereAutorizacion ? correo : null);
      setEsperaConfirmacion(cuerpo.datos?.requiereAutorizacion ? null : correo);
      setMensaje({
        texto: cuerpo.datos?.mensaje ?? 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.',
        tipo: 'exito',
      });
    } catch {
      setMensaje({ texto: 'No se pudo conectar con el servicio de registro. Inténtalo de nuevo.', tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  const reenviarAlTutor = async () => {
    if (!esperaTutor) return;
    setEnviando(true);
    try {
      const { cuerpo } = await enviar<{ mensaje: string }>('/api/auth/registro/reenviar-tutor', { email: esperaTutor });
      setReenvios((actual) => actual + 1);
      setMensaje({ texto: cuerpo.datos?.mensaje ?? cuerpo.error?.mensaje ?? 'Listo.', tipo: cuerpo.ok ? 'exito' : 'error' });
    } catch {
      setMensaje({ texto: 'No se pudo conectar. Inténtalo de nuevo.', tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  const aviso = mensaje ? (
    <p
      className={`text-sm font-medium ${mensaje.tipo === 'exito' ? 'text-emerald-700' : 'text-red-600'}`}
      role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
    >
      {mensaje.texto}
    </p>
  ) : null;

  const encabezado = (
    <div className="mb-1">
      <p className="text-sm font-semibold text-emerald-700">Paso {paso} de 2</p>
      <h2 ref={titulo} tabIndex={-1} className="mt-1 text-xl font-bold text-slate-900 outline-none">
        {paso === 1 ? 'Cuéntanos de ti' : 'Tu cuenta'}
      </h2>
      <div className="mt-3 flex gap-2" aria-hidden="true">
        <span className="h-1.5 flex-1 rounded-full bg-emerald-500" />
        <span className={`h-1.5 flex-1 rounded-full ${paso === 2 ? 'bg-emerald-500' : 'bg-emerald-100'}`} />
      </div>
    </div>
  );

  const pie = (
    <p className="text-center text-sm text-slate-600">
      ¿Ya tienes cuenta?{' '}
      <Link href="/login" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
        Inicia sesión
      </Link>
    </p>
  );

  if (paso === 1) {
    return (
      <form onSubmit={continuar} className="w-full space-y-5" noValidate aria-label="Cuéntanos de ti">
        {encabezado}
        <p className="text-sm text-slate-600">
          Usamos tu nombre para saludarte y tu fecha de nacimiento para calcular tu edad y adaptar los consejos. No
          compartimos tus datos. Más detalles en la{' '}
          <Link href="/privacidad" className="font-medium text-emerald-700 underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>

        <div>
          <label htmlFor="registro-nombre" className={ETIQUETA}>
            Nombre
          </label>
          <input
            id="registro-nombre"
            aria-invalid={Boolean(errores1.nombre)}
            aria-describedby={errores1.nombre ? 'registro-nombre-error' : undefined}
            autoComplete="name"
            required
            maxLength={60}
            value={perfil.nombre}
            onChange={cambiarPerfil('nombre')}
            placeholder="Tu nombre"
            className={CAMPO}
          />
          {errores1.nombre ? (
            <p id="registro-nombre-error" className="mt-2 text-sm font-medium text-red-700">
              {errores1.nombre}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="registro-apodo" className={ETIQUETA}>
            ¿Cómo quieres que te llamemos?
          </label>
          <input
            id="registro-apodo"
            autoComplete="nickname"
            maxLength={30}
            value={perfil.apodo}
            onChange={cambiarPerfil('apodo')}
            className={CAMPO}
            aria-describedby="registro-apodo-ayuda"
          />
          <p id="registro-apodo-ayuda" className="mt-2 text-sm text-slate-600">
            Opcional. Si lo dejas vacío, usaremos tu primer nombre.
          </p>
        </div>

        <div>
          <label htmlFor="registro-nacimiento" className={ETIQUETA}>
            Fecha de nacimiento
          </label>
          <input
            id="registro-nacimiento"
            aria-invalid={Boolean(errores1.fechaNacimiento)}
            aria-describedby={errores1.fechaNacimiento ? 'registro-nacimiento-error' : undefined}
            type="date"
            autoComplete="bday"
            required
            min="1900-01-02"
            max={hoy()}
            value={perfil.fechaNacimiento}
            onChange={cambiarPerfil('fechaNacimiento')}
            className={CAMPO}
          />
          {errores1.fechaNacimiento ? (
            <p id="registro-nacimiento-error" className="mt-2 text-sm font-medium text-red-700">
              {errores1.fechaNacimiento}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="registro-genero" className={ETIQUETA}>
            Género
          </label>
          <select
            id="registro-genero"
            required
            value={perfil.genero}
            onChange={cambiarPerfil('genero')}
            className={CAMPO}
            aria-invalid={Boolean(errores1.genero)}
            aria-describedby={errores1.genero ? 'registro-genero-error' : undefined}
          >
            <option value="" disabled>
              Elige una opción
            </option>
            {OPCIONES_GENERO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </select>
          {errores1.genero ? (
            <p id="registro-genero-error" className="mt-2 text-sm font-medium text-red-700">
              {errores1.genero}
            </p>
          ) : null}
        </div>

        <SelectorDias
          valor={dias}
          alCambiar={(nuevos) => {
            setDias(nuevos);
            if (nuevos.length) setErrorDias('');
          }}
          error={errorDias || undefined}
        />

        {aviso}

        <button type="submit" disabled={enviando} className={BOTON}>
          {enviando ? 'Revisando...' : 'Continuar'}
        </button>
        {pie}
      </form>
    );
  }

  return (
    <form onSubmit={crearCuenta} className="w-full space-y-5" noValidate aria-label="Tu cuenta">
      {encabezado}

      <div>
        <label htmlFor="registro-email" className={ETIQUETA}>
          Correo electrónico
        </label>
        <input
          id="registro-email"
          type="email"
          autoComplete="email"
          required
          value={cuenta.email}
          onChange={cambiarCuenta('email')}
          placeholder="nombre@ejemplo.com"
          className={CAMPO}
        />
      </div>

      <div>
        <label htmlFor="registro-password" className={ETIQUETA}>
          Contraseña
        </label>
        <input
          id="registro-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={cuenta.password}
          onChange={cambiarCuenta('password')}
          className={CAMPO}
          aria-describedby="registro-password-hint"
        />
        <p id="registro-password-hint" className="mt-2 text-sm text-slate-600">
          Mínimo 8 caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="registro-confirmacion" className={ETIQUETA}>
          Confirmar contraseña
        </label>
        <input
          id="registro-confirmacion"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={cuenta.confirmacion}
          onChange={cambiarCuenta('confirmacion')}
          className={CAMPO}
        />
      </div>

      {requiereAutorizacion ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <label htmlFor="registro-tutor" className={ETIQUETA}>
            Correo de tu mamá, papá o tutor
          </label>
          <input
            id="registro-tutor"
            type="email"
            autoComplete="off"
            required
            value={cuenta.correoTutor}
            onChange={cambiarCuenta('correoTutor')}
            className={CAMPO}
            aria-describedby="registro-tutor-ayuda"
          />
          <p id="registro-tutor-ayuda" className="mt-2 text-sm text-slate-600">
            Le enviaremos un correo para que autorice tu cuenta. Podrás entrar cuando acepte.
          </p>
        </div>
      ) : null}

      {aviso}

      {esperaConfirmacion ? <ReenviarConfirmacion key={esperaConfirmacion} correo={esperaConfirmacion} /> : null}

      {esperaTutor ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-600">
          <p>¿Tu tutor no recibió el correo? Pídele que revise el spam o reenvíalo (hasta {MAX_REENVIOS_TUTOR_DIA} veces por día).</p>
          <button
            type="button"
            onClick={() => void reenviarAlTutor()}
            disabled={enviando || reenvios >= MAX_REENVIOS_TUTOR_DIA}
            className="mt-3 rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:border-slate-200 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-700 disabled:shadow-none"
          >
            Reenviar al tutor
          </button>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setMensaje(null);
            setEsperaTutor(null);
            setEsperaConfirmacion(null);
            irAPaso(1);
          }}
          disabled={enviando}
          className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-base font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:border-slate-200 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-700 disabled:shadow-none"
        >
          Atrás
        </button>
        <button type="submit" disabled={enviando} className={BOTON}>
          {enviando ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </div>
      {pie}
    </form>
  );
}
