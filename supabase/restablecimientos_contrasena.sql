create table if not exists public.restablecimientos_contrasena (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expira_en timestamptz not null,
  usado_en timestamptz null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_restablecimientos_contrasena_usuario_id
on public.restablecimientos_contrasena (usuario_id);

alter table public.restablecimientos_contrasena enable row level security;

revoke all on table public.restablecimientos_contrasena from anon, authenticated;
grant all on table public.restablecimientos_contrasena to service_role;
