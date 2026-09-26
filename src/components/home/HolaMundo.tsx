'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '3', label: 'ejercicios activos' },
  { value: '8-12', label: 'rango objetivo' },
  { value: '92%', label: 'progreso' },
];

const exercises = [
  {
    name: 'Press de banca',
    type: 'Peso',
    current: '60 kg',
    target: '8-12 reps',
    next: '+2.5 kg',
    status: 'Listo',
  },
  {
    name: 'Sentadilla',
    type: 'Peso',
    current: '80 kg',
    target: '6-10 reps',
    next: '+2.5 kg',
    status: 'Subir',
  },
  {
    name: 'Dominadas',
    type: 'Calistenia',
    current: '12 reps',
    target: '12-16 reps',
    next: 'Más difícil',
    status: 'Mantener',
  },
];

const rules = [
  'La prueba inicial marca tu línea base real.',
  'Si completas el rango máximo, sube peso.',
  'Si solo cumples el mínimo, sube la meta de repeticiones.',
  'Si fallas, mantén la carga actual.',
];

export function HolaMundo() {
  return (
    <section className="relative isolate overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm shadow-emerald-200/50"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Gym Assistant
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-4xl font-black tracking-[-0.06em] text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Entrena con un plan
              <span className="mt-2 block bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 bg-clip-text text-transparent">
                que se adapta a ti.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg"
            >
              Registra tu prueba inicial, sigue cada sesión y recibe la próxima meta basada en peso,
              repeticiones y rendimiento real.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              <a
                href="#plan"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25"
              >
                Ver plan
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Iniciar sesión
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-8 grid gap-3 sm:grid-cols-3"
            >
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-emerald-100 bg-white/70 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.03)] backdrop-blur-sm"
                >
                  <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-emerald-200/60 via-white/20 to-lime-200/60 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.10)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Resumen</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Progreso semanal</h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  3 activos
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {exercises.map((exercise) => (
                  <div
                    key={exercise.name}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{exercise.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          {exercise.type}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        {exercise.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div className="rounded-xl bg-white/85 p-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Peso</div>
                        <div className="mt-1 font-semibold text-slate-900">{exercise.current}</div>
                      </div>
                      <div className="rounded-xl bg-white/85 p-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Meta</div>
                        <div className="mt-1 font-semibold text-slate-900">{exercise.target}</div>
                      </div>
                      <div className="rounded-xl bg-white/85 p-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Siguiente</div>
                        <div className="mt-1 font-semibold text-slate-900">{exercise.next}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div id="plan" className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.03)] backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Base del plan
            </p>
            <h3 className="mt-3 text-2xl font-bold text-slate-900">
              Un inicio claro y medible
            </h3>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Ejercicio</span>
                <span className="text-sm font-semibold text-emerald-700">Press de banca</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">Tipo</span>
                <span className="text-sm font-medium text-slate-900">Peso</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">Peso de prueba</span>
                <span className="text-sm font-medium text-slate-900">60 kg</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">Objetivo</span>
                <span className="text-sm font-medium text-slate-900">8 reps</span>
              </div>
            </div>
          </div>

          <div id="reglas" className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-lime-50 p-5 shadow-[0_14px_35px_rgba(34,197,94,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Reglas clave
            </p>
            <ul className="mt-5 space-y-3">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
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
