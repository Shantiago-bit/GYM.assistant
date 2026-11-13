'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Termino } from '@/components/ui/Termino';
import { kgAGramos } from '@/lib/formato';
import { BotonRestaurar } from '@/components/gym/BotonRestaurar';
import { enfocarPrimerError } from '@/components/gym/FormularioSeries';
import { enviarJson } from '@/lib/http/cliente';
import {
  ENFOQUES,
  rangoPorTipo,
  validarEjercicio,
  type Enfoque,
  type TipoEjercicio,
} from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { metodosPara, metodoValido, type Metodo } from '@/lib/reglas/metodos';
import { valoresSencillos } from '@/lib/reglas/modo';
import { GLOSARIO } from '@/lib/textos/glosario';
import { esquemaEjercicio } from '@/lib/validacion/esquemas';

const aNumero = (texto: string) => (texto.trim() === '' ? undefined : Number(texto.replace(',', '.')));

export type CampoEjercicio = 'nombre' | 'pesoRefKg' | 'nivel' | 'rangoMin' | 'rangoMax';
export type ErroresEjercicio = Partial<Record<CampoEjercicio, string>>;

// Revisa cada campo y devuelve un mensaje que dice cómo arreglarlo. En el modo sencillo el peso es opcional.
export function validarFormularioEjercicio(
  d: { nombre: string; tipo: TipoEjercicio; pesoRefKg: string; nivel: string; rangoMin: string; rangoMax: string },
  avanzado: boolean,
): ErroresEjercicio {
  const errores: ErroresEjercicio = {};
  const nombre = d.nombre.trim();
  if (nombre === '') errores.nombre = 'Escribe el nombre del ejercicio, por ejemplo Press de banca.';
  else if (nombre.length > 120) errores.nombre = 'El nombre admite hasta 120 caracteres: acórtalo.';

  if (d.tipo === 'peso') {
    const peso = aNumero(d.pesoRefKg);
    if (peso === undefined) {
      if (avanzado) errores.pesoRefKg = 'Escribe el peso con el que empiezas, en kilos; por ejemplo 40.';
    } else if (!Number.isFinite(peso) || peso < 0 || peso > 2000) {
      errores.pesoRefKg = 'El peso va de 0 a 2000 kg; por ejemplo 40 o 42,5.';
    }
  } else if (d.nivel.trim().length > 80) {
    errores.nivel = 'La versión admite hasta 80 caracteres: acórtala.';
  }

  const min = aNumero(d.rangoMin);
  const max = aNumero(d.rangoMax);
  const entero = (valor: number | undefined) => valor !== undefined && Number.isInteger(valor) && valor >= 1 && valor <= 1000;
  if (!entero(min)) errores.rangoMin = 'Escribe las repeticiones mínimas: un número entero de 1 o más, por ejemplo 8.';
  if (!entero(max)) errores.rangoMax = 'Escribe las repeticiones máximas: un número entero de 1 o más, por ejemplo 12.';
  if (entero(min) && entero(max) && min! > max!)
    errores.rangoMin = `El mínimo (${min}) no puede ser mayor que el máximo (${max}): bájalo o sube el máximo.`;
  return errores;
}

const CLASES_TARJETA_OPCION = (activo: boolean) =>
  `block min-h-11 cursor-pointer rounded-gym border p-3 transition focus-within:ring-2 focus-within:ring-primario ${
    activo ? 'border-primario bg-primario-suave' : 'border-borde bg-superficie hover:border-primario'
  }`;

// Grupo de opciones como tarjetas (un radio oculto por tarjeta, que es lo que recibe el foco).
function OpcionesTarjeta<T extends string>({
  leyenda,
  nombre,
  valor,
  opciones,
  onCambio,
  columnas = '',
}: {
  leyenda: ReactNode;
  nombre: string;
  valor: T;
  opciones: { valor: T; texto: string; descripcion: string }[];
  onCambio: (valor: T) => void;
  columnas?: string;
}) {
  const idGrupo = useId();
  return (
    <fieldset>
      <legend className="mb-1 flex items-center text-sm font-medium text-texto">{leyenda}</legend>
      <div className={`grid gap-2 ${columnas}`}>
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          return (
            <label key={opcion.valor} className={CLASES_TARJETA_OPCION(activo)}>
              <input
                type="radio"
                name={nombre}
                value={opcion.valor}
                checked={activo}
                onChange={() => onCambio(opcion.valor)}
                className="sr-only"
                aria-labelledby={`${idGrupo}-${opcion.valor}`}
                aria-describedby={`${idGrupo}-${opcion.valor}-descripcion`}
              />
              <span id={`${idGrupo}-${opcion.valor}`} className="block text-sm font-semibold text-texto">
                {opcion.texto}
              </span>
              <span id={`${idGrupo}-${opcion.valor}-descripcion`} className="block text-sm tabular-nums text-texto-suave">
                {opcion.descripcion}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// En calistenia solo están los métodos que no reparten el peso entre series.
export function SelectorMetodo({
  tipo,
  metodo,
  onCambio,
  avanzado = false,
}: {
  tipo: TipoEjercicio;
  metodo: Metodo;
  onCambio: (metodo: Metodo) => void;
  avanzado?: boolean;
}) {
  return (
    <OpcionesTarjeta
      leyenda={avanzado ? <Termino id="metodo" /> : 'Cómo repartes el peso'}
      nombre="metodo"
      valor={metodo}
      onCambio={onCambio}
      columnas="sm:grid-cols-2"
      opciones={metodosPara(tipo).map((opcion) => ({
        valor: opcion.valor,
        texto: avanzado ? opcion.texto : GLOSARIO[opcion.valor].llano,
        descripcion: avanzado ? opcion.descripcion : GLOSARIO[opcion.valor].explicacion,
      }))}
    />
  );
}

// Tarjetas seleccionables: cada enfoque muestra su descripción y el rango que sugiere.
export function SelectorEnfoque({
  tipo,
  enfoque,
  onCambio,
  apilado = false,
  avanzado = false,
}: {
  tipo: TipoEjercicio;
  enfoque: Enfoque;
  onCambio: (enfoque: Enfoque) => void;
  apilado?: boolean;
  avanzado?: boolean;
}) {
  return (
    <OpcionesTarjeta
      leyenda={avanzado ? <Termino id="enfoque" /> : '¿Qué buscas con este ejercicio?'}
      nombre="enfoque"
      valor={enfoque}
      onCambio={onCambio}
      columnas={apilado ? '' : 'sm:grid-cols-3'}
      opciones={ENFOQUES.map((opcion) => {
        const [min, max] = rangoPorTipo(tipo, opcion.valor);
        return {
          valor: opcion.valor,
          texto: avanzado ? opcion.texto : GLOSARIO[opcion.valor].llano,
          descripcion: avanzado ? `${min}–${max} reps · ${opcion.descripcion}` : `De ${min} a ${max} repeticiones.`,
        };
      })}
    />
  );
}

const OPCIONES_TIPO: { valor: TipoEjercicio; texto: string; descripcion: string }[] = [
  { valor: 'peso', texto: 'Con peso', descripcion: 'Barra, mancuernas o máquina. Cuando progresas, subes el peso.' },
  {
    valor: 'calistenia',
    texto: 'Con tu cuerpo',
    descripcion: 'Flexiones, dominadas, sentadillas sin barra. Cuando progresas, pasas a una versión más difícil.',
  },
];

export function FormularioEjercicio({ avanzado = false }: { avanzado?: boolean }) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEjercicio>('peso');
  const [enfoque, setEnfoque] = useState<Enfoque>('hipertrofia');
  const [metodo, setMetodo] = useState<Metodo>('rectas');
  const [pesoRefKg, setPesoRefKg] = useState('');
  const [nivel, setNivel] = useState('');
  const [rangoMin, setRangoMin] = useState(String(rangoPorTipo('peso')[0]));
  const [rangoMax, setRangoMax] = useState(String(rangoPorTipo('peso')[1]));
  const [error, setError] = useState('');
  const [errores, setErrores] = useState<ErroresEjercicio>({});
  const [intento, setIntento] = useState(0);
  // En el modo sencillo, "Opciones avanzadas" se abre sola si un error está adentro.
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  // Id del ejercicio archivado con el mismo nombre, para ofrecer restaurarlo en lugar de crear otro.
  const [archivadoId, setArchivadoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (intento > 0) enfocarPrimerError(formulario.current);
  }, [intento]);

  // Al corregir un campo, su error desaparece.
  const quitarError = (campo: CampoEjercicio) =>
    setErrores(({ [campo]: _quitado, ...resto }) => resto);

  // Cambiar el tipo o el enfoque aplica el rango sugerido; después se puede ajustar a mano.
  const aplicarRango = (nuevoTipo: TipoEjercicio, nuevoEnfoque: Enfoque) => {
    const [min, max] = rangoPorTipo(nuevoTipo, nuevoEnfoque);
    setTipo(nuevoTipo);
    setEnfoque(nuevoEnfoque);
    setRangoMin(String(min));
    setRangoMax(String(max));
    if (!metodoValido(nuevoTipo, metodo)) setMetodo('rectas');
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setArchivadoId(null);

    const encontrados = validarFormularioEjercicio({ nombre, tipo, pesoRefKg, nivel, rangoMin, rangoMax }, avanzado);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      if (encontrados.pesoRefKg || encontrados.nivel || encontrados.rangoMin || encontrados.rangoMax) setOpcionesAbiertas(true);
      setIntento((valor) => valor + 1);
      return;
    }

    // En el modo sencillo el peso de partida es opcional: si queda vacío, lo fija la primera medición.
    const pesoEscrito = aNumero(pesoRefKg);
    const pesoInicial = pesoEscrito ?? (avanzado ? undefined : valoresSencillos(tipo).pesoRefKg);

    const validacion = esquemaEjercicio.safeParse({
      nombre,
      tipo,
      enfoque,
      metodo,
      pesoRefKg: tipo === 'peso' ? pesoInicial : undefined,
      nivel: tipo === 'calistenia' ? nivel : undefined,
      rangoMin: aNumero(rangoMin),
      rangoMax: aNumero(rangoMax),
    });

    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message ?? 'Revisa los datos del ejercicio.');
      return;
    }

    const datos = validacion.data;

    try {
      validarEjercicio({
        nombre: datos.nombre,
        tipo: datos.tipo,
        pesoRefGramos: datos.pesoRefKg === undefined ? null : kgAGramos(datos.pesoRefKg),
        ...(datos.rangoMin === undefined ? {} : { rangoMin: datos.rangoMin }),
        ...(datos.rangoMax === undefined ? {} : { rangoMax: datos.rangoMax }),
      });
    } catch (causa) {
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revisa los datos del ejercicio.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson<{ id: string }>('/api/gym/ejercicios', datos);

    if (!respuesta.ok) {
      // Un nombre repetido se marca en el campo del nombre.
      if (respuesta.codigo === 'EJERCICIO_DUPLICADO' || respuesta.codigo === 'EJERCICIO_ARCHIVADO') {
        setErrores({ nombre: respuesta.codigo === 'EJERCICIO_DUPLICADO' ? 'Ya tienes un ejercicio con ese nombre: usa otro.' : respuesta.mensaje });
        setIntento((valor) => valor + 1);
      }
      setError(respuesta.codigo === 'EJERCICIO_DUPLICADO' ? '' : respuesta.mensaje);
      const detalles = respuesta.detalles as { id?: unknown } | null | undefined;
      if (respuesta.codigo === 'EJERCICIO_ARCHIVADO' && typeof detalles?.id === 'string') {
        setArchivadoId(detalles.id);
      }
      setGuardando(false);
      return;
    }

    router.push(`/gym/ejercicios/${respuesta.datos.id}/prueba`);
    router.refresh();
  };

  // Enfoque, método, punto de partida y repeticiones: a la vista en el modo avanzado; en el sencillo, dentro
  // de "Opciones avanzadas (opcional)", cerrado y con los valores por defecto.
  const opciones = (
    <>
      <div data-guia="crear-enfoque">
        <SelectorEnfoque
          tipo={tipo}
          enfoque={enfoque}
          onCambio={(nuevoEnfoque) => aplicarRango(tipo, nuevoEnfoque)}
          avanzado={avanzado}
        />
      </div>

      <div data-guia="crear-metodo">
        <SelectorMetodo tipo={tipo} metodo={metodo} onCambio={setMetodo} avanzado={avanzado} />
      </div>

      <div data-guia="crear-referencia">
        {tipo === 'peso' ? (
          <Campo
            etiqueta={
              avanzado
                ? metodo === 'rectas' || metodo === 'cluster'
                  ? 'Peso de referencia inicial (kg)'
                  : 'Peso de la serie más pesada (kg)'
                : 'Peso con el que empiezas (kg)'
            }
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={pesoRefKg}
            onChange={(evento) => {
              setPesoRefKg(evento.target.value);
              quitarError('pesoRefKg');
            }}
            error={errores.pesoRefKg}
            required={avanzado}
            ayuda={avanzado ? undefined : 'Opcional. Si lo dejas vacío, lo tomamos de tu primera medición.'}
          />
        ) : (
          <Campo
            etiqueta={avanzado ? 'Nivel o variante' : 'Versión del ejercicio'}
            value={nivel}
            onChange={(evento) => {
              setNivel(evento.target.value);
              quitarError('nivel');
            }}
            error={errores.nivel}
            maxLength={80}
            ayuda="Opcional. Por ejemplo, dominada estricta o flexiones con rodillas apoyadas."
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3" data-guia="crear-rango">
        <Campo
          etiqueta={avanzado ? 'Rango mínimo (reps)' : 'Repeticiones mínimas'}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={rangoMin}
          onChange={(evento) => {
            setRangoMin(evento.target.value);
            quitarError('rangoMin');
          }}
          error={errores.rangoMin}
        />
        <Campo
          etiqueta={avanzado ? 'Rango máximo (reps)' : 'Repeticiones máximas'}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={rangoMax}
          onChange={(evento) => {
            setRangoMax(evento.target.value);
            quitarError('rangoMax');
            quitarError('rangoMin');
          }}
          error={errores.rangoMax}
        />
      </div>
    </>
  );

  return (
    <form ref={formulario} onSubmit={enviar} className="space-y-4" noValidate>
      {/* Los div con data-guia marcan los campos para la guía interactiva; no tienen estilos. */}
      <div data-guia="crear-nombre">
        <Campo
          etiqueta="Nombre"
          value={nombre}
          onChange={(evento) => {
            setNombre(evento.target.value);
            quitarError('nombre');
          }}
          error={errores.nombre}
          maxLength={120}
          required
          ayuda="Por ejemplo, Press de banca o Sentadilla."
        />
      </div>

      <div data-guia="crear-tipo">
        <OpcionesTarjeta
          leyenda="¿Con peso o con tu cuerpo?"
          nombre="tipo"
          valor={tipo}
          onCambio={(nuevoTipo) => aplicarRango(nuevoTipo, enfoque)}
          columnas="sm:grid-cols-2"
          opciones={OPCIONES_TIPO}
        />
      </div>

      {avanzado ? (
        opciones
      ) : (
        <details
          className="rounded-gym border border-borde bg-fondo px-3 py-1"
          open={opcionesAbiertas}
          onToggle={(evento) => setOpcionesAbiertas(evento.currentTarget.open)}
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-texto">
            Opciones avanzadas (opcional)
          </summary>
          <div className="space-y-4 pb-3 pt-2">
            <p className="text-sm text-texto-suave">
              Si no cambias nada, el ejercicio busca ganar músculo, con el mismo peso en todas las series y de{' '}
              {rangoPorTipo(tipo)[0]} a {rangoPorTipo(tipo)[1]} repeticiones.
            </p>
            {opciones}
          </div>
        </details>
      )}

      {error ? (
        <Aviso tipo="error">
          {error}
          {archivadoId ? (
            <span className="mt-2 flex">
              <BotonRestaurar id={archivadoId} destino={`/gym/ejercicios/${archivadoId}`} variante="secundario" />
            </span>
          ) : null}
        </Aviso>
      ) : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto" data-guia="crear-guardar">
        Guardar ejercicio
      </Boton>
    </form>
  );
}
