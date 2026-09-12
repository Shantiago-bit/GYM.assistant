'use client';

import { motion } from 'framer-motion';

export function HolaMundo() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.18),_transparent_35%)]" />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="text-7xl font-extrabold tracking-tighter sm:text-8xl md:text-9xl"
        >
          Hola
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="mt-2 text-7xl font-extrabold tracking-tighter text-emerald-400 sm:text-8xl md:text-9xl"
        >
          Mundo
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 1.0, ease: 'easeInOut' }}
          className="mt-6 h-px w-40 origin-left bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl"
        >
          Gym Assistant está listo para arrancar con una base fullstack en TypeScript y una experiencia moderna.
        </motion.p>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 1.6, stiffness: 260, damping: 20 }}
          className="mt-8 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300"
        >
          TypeScript • Next.js • Tailwind
        </motion.div>
      </motion.div>
    </section>
  );
}
