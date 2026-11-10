-- M7: mensajes enviados al chat por cuenta y día, para el límite diario

CREATE TABLE chat_uso (
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  mensajes   INTEGER NOT NULL DEFAULT 0 CHECK (mensajes >= 0),
  PRIMARY KEY (usuario_id, fecha)
);

-- Igual que las demás tablas del gimnasio: solo se accede desde el servidor.
ALTER TABLE chat_uso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chat_uso FROM anon, authenticated;
