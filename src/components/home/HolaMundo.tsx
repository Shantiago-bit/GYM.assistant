'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '24/7', label: 'Disponibilidad' },
  { value: '120+', label: 'Usuarios activos' },
  { value: '96%', label: 'Satisfacción' },
];

const features = [
  {
    title: 'Seguimiento claro',
    description: 'Monitorea tu progreso, metas y hábitos con un panel ordenado y fácil de entender.',
  },
  {
    title: 'Entrenamiento guiado',
    description: 'Diseña rutinas personalizadas y mantén cada sesión enfocada en resultados reales.',
  },
  {
    title: 'Gestión simple',
    description: 'Centraliza reservas, clientes, pagos y rendimiento en un solo lugar.',
  },
];

const highlightPills = ['Rutinas', 'Clases', 'Progreso', 'Nutrición'];

export function HolaMundo() {
  return (
    <section className="relative isolate overflow-hidden px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
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
              className="text-5xl font-black tracking-[-0.06em] text-slate-900 sm:text-6xl lg:text-7xl"
            >
              Haz de cada sesión
              <span className="mt-3 block bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 bg-clip-text text-transparent">
                un paso hacia tu mejor versión.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-6 max-w-xl text-lg leading-8 text-slate-600"
            >
              Una experiencia moderna para gestionar entrenamientos, mejorar el rendimiento y acompañar a cada persona en su evolución física.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-emerald-500/25"
              >
                Comenzar ahora
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white/70 px-6 py-3 text-sm font-semibold text-emerald-900 backdrop-blur-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Ver funciones
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              {highlightPills.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium tracking-[0.08em] text-emerald-800 uppercase"
                >
                  {item}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-10 grid gap-4 sm:grid-cols-3"
            >
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-emerald-100 bg-white/70 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.04)] backdrop-blur-sm"
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

            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-white/80 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Panel</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Gym Assistant</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  En línea
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Meta semanal</span>
                    <span className="text-sm font-semibold text-emerald-700">82%</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '82%' }}
                      transition={{ duration: 1, delay: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Sesiones hoy</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">18</p>
                    <p className="mt-2 text-xs text-emerald-700">+6% vs. ayer</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Calorías</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">1.4k</p>
                    <p className="mt-2 text-xs text-emerald-700">Meta del día</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Próxima clase</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">HIIT Premium</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                      18:30
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    12 asistentes confirmados
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div id="features" className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 + index * 0.12 }}
              className="rounded-3xl border border-emerald-100 bg-white/75 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-700">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
