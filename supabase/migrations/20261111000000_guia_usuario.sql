-- M8: estado de la guía de bienvenida y de los primeros pasos por cuenta

CREATE TABLE guia_usuario (
  usuario_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bienvenida_vista_en    TIMESTAMPTZ NULL,
  guia_completada_en     TIMESTAMPTZ NULL,
  primeros_pasos_ocultos BOOLEAN NOT NULL DEFAULT false,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Igual que las demás tablas del gimnasio: solo se accede desde el servidor.
ALTER TABLE guia_usuario ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON guia_usuario FROM anon, authenticated;
