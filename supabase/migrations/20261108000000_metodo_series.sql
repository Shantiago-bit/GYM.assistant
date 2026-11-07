-- M5: método de series por ejercicio (series rectas, principal + descarga, pirámides, cluster)

-- La vista usa e.*: hay que recrearla para que incluya la columna nueva.
DROP VIEW v_ejercicios;

ALTER TABLE ejercicios
  ADD COLUMN metodo VARCHAR(24) NOT NULL DEFAULT 'rectas',
  ADD CONSTRAINT ejercicios_metodo_valido CHECK (
    metodo IN ('rectas', 'principal_descarga', 'piramide_invertida', 'piramide_ascendente', 'cluster')
  ),
  -- Los métodos que reparten el peso entre series solo tienen sentido con peso.
  ADD CONSTRAINT ejercicios_metodo_segun_tipo CHECK (
    tipo = 'peso' OR metodo IN ('rectas', 'cluster')
  );

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
