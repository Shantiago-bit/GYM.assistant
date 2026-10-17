import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables públicas de Supabase en .env.local.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
