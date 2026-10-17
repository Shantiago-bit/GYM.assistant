# Gym Assistant

Proyecto base fullstack TypeScript con Next.js, Tailwind y un motor de persistencia JSON.

## Supabase

El inicio de sesión utiliza Supabase Auth. Configura
`NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL` y
`NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY` en `.env.local`.
Después de iniciar sesión, se puede cambiar la contraseña desde «Cambiar
contraseña» en la pantalla de login o entrando a `/account/password`. Si aún no
hay una sesión activa, el login regresa a la pantalla de cambio de contraseña
después de autenticarte. Para confirmar el cambio, la pantalla solicita la
contraseña actual y autentica de nuevo la cuenta antes de guardar la nueva. El
formulario solo se habilita con una sesión válida.
La migración `supabase/migrations/20261017000000_create_users.sql` crea
`public.users`, vinculada a `auth.users`, con políticas RLS para que cada
persona autenticada solo pueda consultar o actualizar su propio perfil.
Nunca expongas la clave `service_role` ni la clave secreta en variables
`NEXT_PUBLIC_*`.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Vitest
- Framer Motion

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run type-check
npm run test
```

## Estado

- Fase 0 implementada: scaffolding, home Hola Mundo, API /api/health y configuración base.

## Estructura principal

```bash
src/
  app/
  components/
  test/

data/
```
