-- M4: enfoque de entrenamiento por ejercicio y RIR (repeticiones en reserva) por serie

-- La vista usa e.*: hay que recrearla para que incluya la columna nueva.
DROP VIEW v_ejercicios;

ALTER TABLE ejercicios
  ADD COLUMN enfoque VARCHAR(12) NOT NULL DEFAULT 'hipertrofia',
  ADD CONSTRAINT ejercicios_enfoque_valido
    CHECK (enfoque IN ('fuerza', 'hipertrofia', 'resistencia'));

-- Los ejercicios existentes reciben el enfoque que corresponde a su rango.
UPDATE ejercicios SET enfoque = 'fuerza' WHERE rango_max <= 6;
UPDATE ejercicios SET enfoque = 'resistencia' WHERE rango_min >= 15;

ALTER TABLE series
  ADD COLUMN rir SMALLINT,
  ADD CONSTRAINT series_rir_valido CHECK (rir IS NULL OR rir BETWEEN 0 AND 10);

CREATE VIEW v_ejercicios
WITH (security_invoker = true) AS
SELECT
  e.*,
  us.id          AS ultima_sesion_id,
  us.fecha       AS ultima_fecha,
  (SELECT COUNT(*) FROM sesiones s WHERE s.ejercicio_id = e.id) AS total_sesiones
FROM ejercicios e
LEFT JOIN LATERAL (
  SELECT s.id, s.fecha
  FROM sesiones s
  WHERE s.ejercicio_id = e.id
  ORDER BY s.fecha DESC, s.created_at DESC
  LIMIT 1
) us ON true;

REVOKE ALL ON v_ejercicios FROM anon, authenticated;
