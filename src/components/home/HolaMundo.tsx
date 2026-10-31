'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { clasesBoton } from '@/components/ui/Boton';
import { Insignia } from '@/components/ui/Insignia';

// Datos de ejemplo: la versión final usará datos reales de los usuarios activos.
const stats = [
  { value: '3', label: 'ejercicios activos' },
  { value: '8-12', label: 'rango objetivo' },
  { value: '92%', label: 'progreso' },
];

const exercises = [
  {
    name: 'Press de banca',
    type: 'peso',
    current: '60 kg',
    target: '8-12 reps',
    next: '+2,5 kg',
    status: 'Listo',
  },
  {
    name: 'Sentadilla',
    type: 'peso',
    current: '80 kg',
    target: '6-10 reps',
    next: '+2,5 kg',
    status: 'Subir',
  },
  {
    name: 'Dominadas',
    type: 'calistenia',
    current: '12 reps',
    target: '12-16 reps',
    next: 'Más difícil',
    status: 'Mantener',
  },
] as const;

const planDetails = [
  { label: 'Tipo', value: 'Peso' },
  { label: 'Peso de prueba', value: '60 kg' },
  { label: 'Objetivo', value: '8 reps' },
];

const rules = [
  'La prueba inicial marca tu línea base real.',
  'Si completas el rango máximo, sube peso.',
  'Si solo cumples el mínimo, sube la meta de repeticiones.',
  'Si fallas, mantén la carga actual.',
];

const CLASES_TARJETA = 'rounded-2xl border border-borde bg-superficie shadow-sm';
const CLASES_ETIQUETA = 'text-xs font-semibold uppercase tracking-wider text-primario';

export function HolaMundo() {
  return (
    <section className="relative isolate px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-gym bg-primario text-lg font-bold text-white"
          >
            G
          </span>
          <span className="text-lg font-bold text-texto">Gym Assistant</span>
        </header>

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-texto sm:text-5xl lg:text-6xl">
              Entrena con un plan
              <span className="mt-1 block text-primario">que se adapta a ti.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-texto-suave sm:text-lg">
              Registra tu prueba inicial, sigue cada sesión y recibe la próxima meta basada en peso,
              repeticiones y rendimiento real.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <Link href="/registro" className={clasesBoton()}>
                Crear cuenta
              </Link>
              <Link href="/login" className={clasesBoton('secundario')}>
                Iniciar sesión
              </Link>
              <a
                href="#plan"
                className="col-span-2 rounded py-2 text-center text-sm font-semibold text-primario underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario sm:ml-2"
              >
                Ver plan
              </a>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.label} className={`${CLASES_TARJETA} p-3 sm:p-4`}>
                  <dd className="text-xl font-bold tabular-nums text-texto sm:text-2xl">
                    {item.value}
                  </dd>
                  <dt className="mt-1 text-xs leading-4 text-texto-suave sm:text-sm">{item.label}</dt>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className={`${CLASES_TARJETA} p-4 sm:p-5`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-borde pb-4">
              <div>
                <p className={CLASES_ETIQUETA}>Resumen</p>
                <h2 className="mt-1 text-xl font-semibold text-texto">Progreso semanal</h2>
              </div>
              <Insignia tono="subir">3 activos</Insignia>
            </div>

            <ul className="divide-y divide-borde">
              {exercises.map((exercise) => (
                <li key={exercise.name} className="py-4 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-texto">{exercise.name}</p>
                    <div className="flex gap-2">
                      <InsigniaTipo tipo={exercise.type} />
                      <Insignia tono={exercise.status === 'Mantener' ? 'mantener' : 'subir'}>
                        {exercise.status}
                      </Insignia>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-texto-suave">Actual</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-texto">{exercise.current}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-texto-suave">Meta</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-texto">{exercise.target}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-texto-suave">Siguiente</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-texto">{exercise.next}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div id="plan" className="mt-10 grid scroll-mt-6 gap-5 lg:mt-14 lg:grid-cols-2">
          <div className={`${CLASES_TARJETA} p-5 sm:p-6`}>
            <p className={CLASES_ETIQUETA}>Base del plan</p>
            <h3 className="mt-2 text-2xl font-bold text-texto">Un inicio claro y medible</h3>
            <dl className="mt-5 divide-y divide-borde rounded-gym bg-fondo px-4">
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <dt className="text-texto-suave">Ejercicio</dt>
                <dd className="font-semibold text-primario">Press de banca</dd>
              </div>
              {planDetails.map((detail) => (
                <div key={detail.label} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <dt className="text-texto-suave">{detail.label}</dt>
                  <dd className="font-medium tabular-nums text-texto">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            id="reglas"
            className="rounded-2xl border border-borde bg-primario-suave p-5 shadow-sm sm:p-6"
          >
            <p className={CLASES_ETIQUETA}>Reglas clave</p>
            <ul className="mt-5 space-y-4">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-6 text-texto">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primario text-[10px] font-bold text-white"
                  >
                    ✓
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
