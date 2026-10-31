-- M2: vista con la última sesión y cierre de acceso público

CREATE OR REPLACE VIEW v_ejercicios
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

ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE series     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ejercicios, sesiones, series FROM anon, authenticated;
REVOKE ALL ON v_ejercicios FROM anon, authenticated;
