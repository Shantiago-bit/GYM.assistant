-- M13: días de entrenamiento elegidos por la persona (historial de cambios) para la racha.
-- Igual que el resto: RLS activo sin políticas y sin permisos para anon ni authenticated.

-- Días ISO (1 = lunes … 7 = domingo): de 1 a 7 elementos, cada uno entre 1 y 7, sin repetidos.
CREATE FUNCTION dias_semana_validos(dias SMALLINT[]) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT cardinality(dias) BETWEEN 1 AND 7
     AND dias <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]
     AND cardinality(dias) = (SELECT count(DISTINCT d) FROM unnest(dias) AS d)
$$;

-- Historial: cada cambio es una fila vigente desde ese día (un cambio el mismo día actualiza la fila), así
-- cada fecha pasada se evalúa con los días que tenía la persona entonces.
CREATE TABLE dias_entrenamiento (
  usuario_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dias          SMALLINT[] NOT NULL CHECK (dias_semana_validos(dias)),
  vigente_desde DATE NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, vigente_desde)
);

ALTER TABLE dias_entrenamiento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dias_entrenamiento FROM anon, authenticated;
REVOKE ALL ON FUNCTION dias_semana_validos(SMALLINT[]) FROM anon, authenticated, PUBLIC;

-- Cuentas existentes: lunes a sábado (lo que contaba la racha hasta ahora) desde la creación de su perfil,
-- para que su racha no cambie.
INSERT INTO dias_entrenamiento (usuario_id, dias, vigente_desde)
SELECT usuario_id, ARRAY[1, 2, 3, 4, 5, 6]::SMALLINT[], (creado_en AT TIME ZONE 'America/Bogota')::date
FROM perfiles
ON CONFLICT DO NOTHING;

-- Aviso "Ahora puedes elegir qué días entrenas": se muestra una vez a las cuentas que recibieron los días por
-- defecto. Va en perfiles (y no en guia_usuario) porque es un dato del perfil, existe para toda cuenta que entra
-- a /gym y se escribe en la misma tabla que los días. Las cuentas nuevas eligen sus días al registrarse.
ALTER TABLE perfiles ADD COLUMN aviso_dias_visto BOOLEAN NOT NULL DEFAULT true;
UPDATE perfiles SET aviso_dias_visto = false;
