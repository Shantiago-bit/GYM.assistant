-- M14: preferencia de modo avanzado (métodos de series, RIR y técnicas a la vista).
-- Las cuentas nuevas empiezan en el modo sencillo; la persona lo cambia desde su perfil.
ALTER TABLE perfiles ADD COLUMN modo_avanzado BOOLEAN NOT NULL DEFAULT false;

-- Cuentas existentes que ya usan opciones avanzadas: quedan en el modo avanzado para no quitarles nada.
-- Cuenta como uso avanzado tener algún ejercicio (activo o archivado) con un método distinto de "rectas",
-- o alguna serie con una técnica distinta de "normal" (la aproximación incluida) o con el RIR anotado.
UPDATE perfiles p
SET modo_avanzado = true
WHERE EXISTS (
    SELECT 1 FROM ejercicios e
    WHERE e.usuario_id = p.usuario_id AND e.metodo <> 'rectas'
  )
  OR EXISTS (
    SELECT 1
    FROM ejercicios e
    JOIN sesiones s ON s.ejercicio_id = e.id
    JOIN series x ON x.sesion_id = s.id
    WHERE e.usuario_id = p.usuario_id
      AND (x.tipo_serie <> 'normal' OR x.rir IS NOT NULL)
  );
