import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

// La sesión se guarda en cookies para que el servidor pueda leerla (src/lib/auth/sesion.ts).
export const supabase =
  supabaseUrl && supabaseKey ? createBrowserClient(supabaseUrl, supabaseKey) : null;
