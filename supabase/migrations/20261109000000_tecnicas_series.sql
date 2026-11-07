-- M6: técnicas por serie (aproximación, AMRAP, rest-pause, myo-reps, drop set) y sus mini series

ALTER TABLE series
  ADD COLUMN tipo_serie VARCHAR(16) NOT NULL DEFAULT 'normal',
  ADD COLUMN extras JSONB,
  ADD CONSTRAINT series_tipo_valido CHECK (
    tipo_serie IN ('normal', 'aproximacion', 'amrap', 'rest_pause', 'myo_reps', 'drop_set')
  ),
  -- Mini series: [{"reps": 3, "pesoGramos": 40000}, ...]. Solo en las técnicas que las usan.
  ADD CONSTRAINT series_extras_validas CHECK (
    extras IS NULL
    OR (jsonb_typeof(extras) = 'array' AND tipo_serie IN ('rest_pause', 'myo_reps', 'drop_set'))
  );
