-- M10: quita las columnas de la guía anterior (modal de bienvenida, página /gym/guia y primeros pasos).
-- Se aplica después de desplegar el tour interactivo (M9), que ya no las usa.

ALTER TABLE guia_usuario
  DROP COLUMN IF EXISTS bienvenida_vista_en,
  DROP COLUMN IF EXISTS guia_completada_en,
  DROP COLUMN IF EXISTS primeros_pasos_ocultos,
  DROP COLUMN IF EXISTS creado_en;
