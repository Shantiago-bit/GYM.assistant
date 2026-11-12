-- M12: registro de envíos de correo (sin contenido) y límite de reenvíos de confirmación por conexión.
-- Igual que el resto: RLS activo sin políticas y sin permisos para anon ni authenticated; solo el servidor accede.

-- Nunca se guardan el asunto, el HTML, los enlaces ni los tokens: solo qué se intentó y qué pasó.
CREATE TABLE registro_correos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo                 TEXT NOT NULL CHECK (tipo IN (
                         'confirmacion', 'reenvio_confirmacion', 'recuperacion', 'autorizacion_tutor',
                         'reenvio_tutor', 'confirmacion_tras_autorizacion', 'prueba')),
  -- SHA-256 del correo normalizado con un secreto del servidor; la máscara sirve para leerlo sin exponerlo.
  destinatario_hash    TEXT NOT NULL,
  destinatario_mascara TEXT NOT NULL,
  usuario_id           UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resultado            TEXT NOT NULL CHECK (resultado IN ('aceptado', 'rechazado', 'error', 'omitido')),
  motivo_omision       TEXT NULL CHECK (motivo_omision IN (
                         'cuenta_confirmada', 'reenvio_reciente', 'menor_pendiente', 'menor_rechazado')),
  proveedor            TEXT NULL CHECK (proveedor IN ('gmail', 'resend')),
  id_mensaje           TEXT NULL,
  error                TEXT NULL CHECK (error IS NULL OR char_length(error) <= 500),
  duracion_ms          INT NULL CHECK (duracion_ms IS NULL OR duracion_ms >= 0),
  CONSTRAINT registro_correos_motivo_si_omitido CHECK ((resultado = 'omitido') = (motivo_omision IS NOT NULL))
);
CREATE INDEX idx_registro_correos_destinatario ON registro_correos (destinatario_hash, creado_en DESC);
CREATE INDEX idx_registro_correos_creado ON registro_correos (creado_en);

-- Reenvíos de confirmación pedidos por conexión (hash de la IP), en ventanas de una hora.
CREATE TABLE limites_reenvio (
  clave          TEXT PRIMARY KEY,
  ventana_desde  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cantidad       INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0)
);

ALTER TABLE registro_correos ENABLE ROW LEVEL SECURITY;
ALTER TABLE limites_reenvio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON registro_correos, limites_reenvio FROM anon, authenticated;
