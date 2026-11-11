-- M11: perfil de cada cuenta, autorizaciones de tutores, intentos de registro y bucket de fotos.
-- Igual que las tablas del gimnasio: RLS activo sin políticas y sin permisos para anon ni authenticated.
-- Solo el servidor accede, siempre filtrando por la cuenta de la sesión.

CREATE TABLE perfiles (
  usuario_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 60),
  apodo             TEXT NULL CHECK (apodo IS NULL OR char_length(btrim(apodo)) BETWEEN 2 AND 30),
  fecha_nacimiento  DATE NOT NULL CHECK (fecha_nacimiento > DATE '1900-01-01'),
  genero            TEXT NOT NULL CHECK (genero IN ('hombre', 'mujer', 'otro', 'prefiero_no_decir')),
  avatar_ruta       TEXT NULL,
  autorizacion      TEXT NOT NULL DEFAULT 'no_requerida'
                    CHECK (autorizacion IN ('no_requerida', 'pendiente', 'aprobada', 'rechazada')),
  cumple_visto_anio INT NULL,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo se guarda el hash del token, como en la recuperación de contraseña.
CREATE TABLE autorizaciones_tutor (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correo_tutor  TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  vence_en      TIMESTAMPTZ NOT NULL,
  respondida_en TIMESTAMPTZ NULL,
  decision      TEXT NULL CHECK (decision IN ('aprobada', 'rechazada')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_autorizaciones_tutor_usuario ON autorizaciones_tutor (usuario_id, creado_en DESC);

-- clave: hash SHA-256 de la IP con un secreto del servidor. Nunca se guarda la IP.
CREATE TABLE registro_intentos (
  clave              TEXT PRIMARY KEY,
  intentos_ofensivos INT NOT NULL DEFAULT 0 CHECK (intentos_ofensivos >= 0),
  bloqueado_hasta    TIMESTAMPTZ NULL,
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE autorizaciones_tutor ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_intentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON perfiles, autorizaciones_tutor, registro_intentos FROM anon, authenticated;

-- Bucket privado para las fotos de perfil ({usuario_id}/avatar.webp). Solo el servidor sube, borra y firma
-- URLs, con la service role. Si el proyecto no tiene Storage, se crea a mano (ver README).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('avatares', 'avatares', false, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
