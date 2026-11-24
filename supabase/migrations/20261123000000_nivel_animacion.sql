-- M17: preferencia "Animaciones" del perfil. Solo cambia cómo se mueve la app, no los datos de entrenamiento.
-- nivel_animacion: completas (por defecto), suaves o minimas. vibracion: vibración breve al guardar una sesión.
ALTER TABLE perfiles
  ADD COLUMN nivel_animacion TEXT NOT NULL DEFAULT 'completas'
    CONSTRAINT perfiles_nivel_animacion_valido CHECK (nivel_animacion IN ('completas', 'suaves', 'minimas')),
  ADD COLUMN vibracion BOOLEAN NOT NULL DEFAULT true;
