import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
