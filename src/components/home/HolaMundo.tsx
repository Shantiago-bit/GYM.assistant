'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '24/7', label: 'Disponibilidad' },
  { value: '120+', label: 'Clientes activos' },
  { value: '96%', label: 'Satisfacción' },
];

const features = [
  {
    title: 'Seguimiento inteligente',
    description: 'Monitorea progreso, rutinas y metas con paneles claros y accionables.',
  },
  {
    title: 'Entrenamiento guiado',
    description: 'Diseña planes de trabajo para cada persona y optimiza cada sesión.',
  },
  {
    title: 'Gestión del gimnasio',
    description: 'Centraliza reservas, clientes, pagos y rendimiento en un solo lugar.',
  },
];

export function HolaMundo() {
  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden px-6 py-16 sm:px-8 lg:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.25),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_20%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.82),rgba(15,23,42,0.7),rgba(3,7,18,0.9))]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 shadow-lg shadow-emerald-900/20"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Fit Tech Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl"
          >
            Tu gimnasio,
            <span className="mt-3 block bg-gradient-to-r from-emerald-300 via-lime-200 to-green-400 bg-clip-text text-transparent">
              más inteligente.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 max-w-xl text-lg leading-8 text-slate-300"
          >
            Organiza entrenamientos, controla progreso físico y mejora la experiencia del cliente con una plataforma moderna pensada para fitness.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8 flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20"
            >
              Comenzar ahora
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-emerald-500/10"
            >
              Ver funcionalidades
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-10 grid gap-4 sm:grid-cols-3"
          >
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{item.value}</div>
                <div className="mt-1 text-sm text-slate-300">{item.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-emerald-400/30 via-transparent to-lime-300/20 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Panel</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Gym Assistant</h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                En línea
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Meta semanal</span>
                  <span className="text-sm font-medium text-emerald-300">82%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '82%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
                  <p className="text-sm text-slate-400">Sesiones hoy</p>
                  <p className="mt-2 text-3xl font-bold text-white">18</p>
                  <p className="mt-2 text-xs text-emerald-300">+6% vs ayer</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
                  <p className="text-sm text-slate-400">Calorías</p>
                  <p className="mt-2 text-3xl font-bold text-white">1.4k</p>
                  <p className="mt-2 text-xs text-sky-300">Meta del día</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Próxima clase</p>
                    <p className="mt-1 text-lg font-semibold text-white">HIIT Premium</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-sm font-medium text-emerald-300">
                    18:30
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div id="features" className="absolute bottom-8 left-1/2 z-10 w-[min(1100px,90%)] -translate-x-1/2">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.12 }}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-300">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
