-- M9: estado de la guía interactiva (tour) por recorrido. Reemplaza el formato de la guía anterior.
-- recorridos: { "<id>": { "estado": "pendiente" | "en_curso" | "completado" | "saltado", "paso": n } }
-- Las columnas de la guía anterior se quitan en una migración posterior, ya desplegado el código nuevo,
-- para que el sitio no deje de funcionar entre esta migración y el despliegue.

ALTER TABLE guia_usuario
  ADD COLUMN oferta_vista_en TIMESTAMPTZ NULL,
  ADD COLUMN recorridos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD CONSTRAINT guia_recorridos_objeto CHECK (jsonb_typeof(recorridos) = 'object');
