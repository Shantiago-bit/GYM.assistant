-- M15: administración de la plataforma (panel /admin, Parte 1).
-- administradores: quién administra y con qué rol ('admin' puede actuar, 'lectura' solo ver). Nadie se vuelve
--   administrador desde la interfaz: solo con npm run admin:asignar.
-- auditoria_admin: cada acción y cada acceso a datos de una persona. Solo se inserta; se borra a los 365 días
--   (tarea Cron). detalle nunca lleva datos personales.
-- metas_admin: metas configurables del panel (por ahora, personas activas al mes).
-- Las tres, como las demás tablas del servidor: RLS activo, sin políticas y sin permisos para anon ni
-- authenticated.

CREATE TABLE administradores (
  usuario_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'lectura')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_por  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE auditoria_admin (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL cuando la acción viene de un script (admin:asignar, admin:quitar) o el administrador ya no existe.
  admin_id             UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accion               TEXT NOT NULL CHECK (accion IN (
                         'ver_usuario', 'suspender', 'reactivar', 'eliminar_cuenta', 'reenviar_confirmacion',
                         'reenviar_tutor', 'exportar_csv', 'asignar_admin', 'quitar_admin',
                         'enviar_correo_prueba', 'cambiar_meta')),
  objetivo_usuario_id  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  detalle              JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lista de la auditoría por fecha y por administrador (/admin/auditoria) y limpieza por antigüedad.
CREATE INDEX idx_auditoria_admin_creado ON auditoria_admin (creado_en DESC);
CREATE INDEX idx_auditoria_admin_admin ON auditoria_admin (admin_id, creado_en DESC);

-- Solo inserción, también para quien tenga la clave de servicio: se rechaza cualquier UPDATE salvo el que hacen
-- las claves foráneas al eliminar una cuenta (poner admin_id u objetivo_usuario_id en NULL), y cualquier DELETE
-- de un registro con menos de 365 días.
CREATE OR REPLACE FUNCTION auditoria_admin_solo_insercion()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id = OLD.id
       AND NEW.accion = OLD.accion
       AND NEW.detalle = OLD.detalle
       AND NEW.creado_en = OLD.creado_en
       AND (NEW.admin_id IS NOT DISTINCT FROM OLD.admin_id OR NEW.admin_id IS NULL)
       AND (NEW.objetivo_usuario_id IS NOT DISTINCT FROM OLD.objetivo_usuario_id OR NEW.objetivo_usuario_id IS NULL)
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'auditoria_admin es solo de inserción';
  END IF;

  IF OLD.creado_en < now() - interval '365 days' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'auditoria_admin: solo se borran registros de más de 365 días';
END;
$$;

CREATE TRIGGER trg_auditoria_admin_solo_insercion
  BEFORE UPDATE OR DELETE ON auditoria_admin
  FOR EACH ROW EXECUTE FUNCTION auditoria_admin_solo_insercion();

CREATE TABLE metas_admin (
  clave            TEXT PRIMARY KEY CHECK (clave IN ('personas_activas_mes')),
  valor            INTEGER NOT NULL CHECK (valor BETWEEN 1 AND 1000000),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_admin ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON administradores FROM anon, authenticated;
REVOKE ALL ON auditoria_admin FROM anon, authenticated;
REVOKE ALL ON metas_admin FROM anon, authenticated;
REVOKE ALL ON FUNCTION auditoria_admin_solo_insercion() FROM PUBLIC, anon, authenticated;

-- Índices para las estadísticas del panel, que agregan sobre TODAS las cuentas por fecha:
-- * sesiones: los índices existentes empiezan por ejercicio_id (consultas de una persona). Contar sesiones o
--   personas activas por día o por mes recorre un rango de fechas: este índice evita leer la tabla entera, e
--   INCLUDE (ejercicio_id) permite unir con ejercicios sin volver a la tabla.
CREATE INDEX idx_sesiones_fecha ON sesiones (fecha) INCLUDE (ejercicio_id);
-- * chat_uso: la llave primaria es (usuario_id, fecha); los mensajes por mes de toda la app filtran solo por
--   fecha.
CREATE INDEX idx_chat_uso_fecha ON chat_uso (fecha);
