-- M3: cada ejercicio pertenece a una cuenta

-- La vista usa e.*: hay que recrearla para que incluya la columna nueva.
DROP VIEW v_ejercicios;

ALTER TABLE ejercicios
  ADD COLUMN usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- El nombre pasa a ser único por cuenta. Se conserva el nombre del índice (sección 9.4 del plan).
DROP INDEX ux_ejercicios_nombre;
CREATE UNIQUE INDEX ux_ejercicios_nombre ON ejercicios (usuario_id, lower(btrim(nombre)));

-- Con RESTRICT no se podría eliminar una cuenta que tenga sesiones. La aplicación sigue sin borrar sesiones (RN-12).
ALTER TABLE sesiones
  DROP CONSTRAINT sesiones_ejercicio_id_fkey,
  ADD CONSTRAINT sesiones_ejercicio_id_fkey
    FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id) ON DELETE CASCADE;

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
