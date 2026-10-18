import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
const supabaseServiceKey = process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type Usuario = {
  id: string;
  email: string | null;
};

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const emailLimpio = email.trim().toLowerCase();

  if (!emailLimpio) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', emailLimpio)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Usuario | null;
}

export async function contarSolicitudesRecuperacion(usuarioId: string): Promise<number> {
  const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .gte('creado_en', haceQuinceMinutos);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function invalidarTokensPendientesPorUsuario(
  usuarioId: string,
  excluirTokenId?: string,
): Promise<void> {
  const ahora = new Date().toISOString();
  let consulta = supabaseAdmin
    .from('restablecimientos_contrasena')
    .update({ usado_en: new Date().toISOString() })
    .eq('usuario_id', usuarioId)
    .is('usado_en', null)
    .gt('expira_en', ahora);

  if (excluirTokenId) {
    consulta = consulta.neq('id', excluirTokenId);
  }

  const { error } = await consulta;

  if (error) {
    throw error;
  }
}

export async function crearTokenRecuperacion(
  usuarioId: string,
  tokenHash: string,
  expiraEn: string,
): Promise<{ id: string; usuario_id: string; token_hash: string; expira_en: string }> {
  const { data, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .insert({
      usuario_id: usuarioId,
      token_hash: tokenHash,
      expira_en: expiraEn,
    })
    .select('id, usuario_id, token_hash, expira_en')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function buscarTokenVigentePorHash(tokenHash: string) {
  const { data, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('usado_en', null)
    .gt('expira_en', 'now()')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function marcarTokenComoUsado(tokenId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .update({ usado_en: new Date().toISOString() })
    .eq('id', tokenId);

  if (error) {
    throw error;
  }
}

export async function actualizarContrasena(usuarioId: string, nuevaContrasena: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    password: nuevaContrasena,
  });

  if (error) {
    throw error;
  }
}
