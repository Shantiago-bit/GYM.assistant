-- M1: tablas de Gym Assistant

CREATE TABLE IF NOT EXISTS ejercicios (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(120)  NOT NULL,
  tipo              VARCHAR(12)   NOT NULL,                 -- 'peso' | 'calistenia' (RN-01)
  rango_min         SMALLINT      NOT NULL,                 -- rango objetivo (RN-05)
  rango_max         SMALLINT      NOT NULL,
  peso_ref_gramos   INTEGER,                                -- solo en peso (RN-02); gramos (RN-11)
  nivel             VARCHAR(80),                            -- solo en calistenia (variante)
  meta_reps         SMALLINT      NOT NULL,                 -- meta de reps actual
  archivado         BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ejercicios_nombre_minimo CHECK (char_length(btrim(nombre)) >= 1),       -- RN-03
  CONSTRAINT ejercicios_tipo_valido   CHECK (tipo IN ('peso', 'calistenia')),         -- RN-01
  CONSTRAINT ejercicios_rango_valido  CHECK (rango_min >= 1 AND rango_max >= rango_min),  -- RN-05
  CONSTRAINT ejercicios_meta_valida   CHECK (meta_reps >= rango_min AND meta_reps <= rango_max),
  CONSTRAINT ejercicios_peso_segun_tipo CHECK (
    (tipo = 'peso' AND peso_ref_gramos IS NOT NULL AND peso_ref_gramos >= 0) OR
    (tipo = 'calistenia' AND peso_ref_gramos IS NULL))      -- RN-02
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ejercicios_nombre ON ejercicios (lower(btrim(nombre)));  -- RN-03
CREATE INDEX IF NOT EXISTS idx_ejercicios_archivado ON ejercicios (archivado);

CREATE TABLE IF NOT EXISTS sesiones (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id   UUID          NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,  -- RN-12
  fecha          DATE          NOT NULL,
  es_prueba      BOOLEAN       NOT NULL DEFAULT false,      -- true en la primera (prueba inicial, RN-04)
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT sesiones_fecha_no_futura CHECK (fecha <= CURRENT_DATE + 1)  -- margen de zona horaria
);
CREATE INDEX IF NOT EXISTS idx_sesiones_ejercicio ON sesiones (ejercicio_id, fecha DESC, created_at DESC);
-- Una sola prueba inicial por ejercicio:
CREATE UNIQUE INDEX IF NOT EXISTS ux_sesiones_prueba_por_ejercicio
  ON sesiones (ejercicio_id) WHERE es_prueba = true;        -- RN-04

CREATE TABLE IF NOT EXISTS series (
  id            BIGSERIAL     PRIMARY KEY,
  sesion_id     UUID          NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  numero        SMALLINT      NOT NULL,
  reps          SMALLINT      NOT NULL,
  peso_gramos   INTEGER,                                    -- null en calistenia
  CONSTRAINT series_numero_positivo CHECK (numero >= 1),
  CONSTRAINT series_reps_no_neg     CHECK (reps >= 0),      -- RN-08
  CONSTRAINT series_peso_no_neg     CHECK (peso_gramos IS NULL OR peso_gramos >= 0),  -- RN-11
  CONSTRAINT series_unica_por_sesion UNIQUE (sesion_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_series_sesion ON series (sesion_id, numero);

CREATE OR REPLACE FUNCTION gym_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ejercicios_updated_at ON ejercicios;
CREATE TRIGGER trg_ejercicios_updated_at BEFORE UPDATE ON ejercicios
  FOR EACH ROW EXECUTE FUNCTION gym_actualizar_updated_at();
