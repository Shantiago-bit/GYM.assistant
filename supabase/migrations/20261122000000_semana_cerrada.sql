-- M16: "Tu semana" (resumen de la semana anterior en el inicio). Guarda el lunes de la semana cuya tarjeta cerró
-- la persona: la tarjeta no vuelve a salir hasta el lunes siguiente. Nula: nunca la cerró.
ALTER TABLE perfiles ADD COLUMN semana_cerrada DATE NULL;
