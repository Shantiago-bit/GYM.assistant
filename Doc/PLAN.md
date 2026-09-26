# Plan de Proyecto de Software — Generador de Rutinas con Sobrecarga Progresiva

## 1. La situación actual

Hoy el entrenamiento (combinando pesas de gimnasio y calistenia) no se registra en ningún sistema formal: las series, repeticiones y pesos usados en cada sesión se recuerdan de forma aproximada. Como consecuencia, la decisión de cuánto peso levantar o cuántas repeticiones hacer en la siguiente sesión se toma también de memoria, sin un criterio objetivo basado en el rendimiento real de la sesión anterior.

## 2. El problema

Sin un registro preciso, no hay forma de aplicar sobrecarga progresiva de manera consistente: se corre el riesgo de estancarse usando siempre el mismo peso/repeticiones por no saber con certeza qué se logró la última vez, o de subir la dificultad antes de tiempo (aumentando el riesgo de lesión) o después de tiempo (frenando el progreso). Además, al combinar pesas y calistenia, cada tipo de ejercicio necesita un criterio de progreso distinto, y hoy no hay ninguno definido.

Esto le pasa directamente a la persona que entrena, quien es su propio planificador de rutina.

## 3. Qué hará el sistema

1. Registrar un ejercicio a partir de una **prueba inicial**: para ejercicios con peso, el peso con el que actualmente se logra el mínimo de repeticiones deseado; para calistenia, el máximo de repeticiones que se logra hoy en un solo intento.
2. Calcular el rango de trabajo de repeticiones de cada ejercicio a partir de esa prueba inicial, en vez de usar un rango fijo genérico.
3. Registrar una sesión de entrenamiento con las series realizadas de cada ejercicio (repeticiones logradas y peso usado).
4. Calcular automáticamente el objetivo de la siguiente sesión para cada ejercicio, aplicando doble progresión.
5. Detectar cuando un ejercicio con peso alcanza el tope de su rango de repeticiones en todas sus series y aumentar el peso para la siguiente sesión.
6. Detectar cuando no se completa el mínimo de repeticiones objetivo y mantener el mismo peso/objetivo sin retroceder.
7. Mostrar el historial de progreso de un ejercicio a lo largo del tiempo (peso y repeticiones por sesión).

## 4. Entradas, procesos y salidas

| Funcionalidad | Entradas | Proceso | Salidas |
|---|---|---|---|
| Registrar ejercicio (con prueba inicial) | nombre, tipo (peso/calistenia), margen_repeticiones, y según tipo: peso_probado + repeticiones_min deseado (peso) o repeticiones_maximas_probadas (calistenia) | para tipo "peso": guarda peso_actual = peso_probado y objetivo_repeticiones = repeticiones_min; para tipo "calistenia": calcula repeticiones_min = repeticiones_maximas_probadas y repeticiones_max = repeticiones_min + margen_repeticiones | ejercicio guardado con su rango de trabajo ya calculado a partir de la prueba |
| Registrar sesión | fecha, lista de (ejercicio_id, número de serie, repeticiones logradas, peso usado si aplica) | guarda cada serie asociada a la sesión y al ejercicio | sesión guardada con todas sus series |
| Calcular progresión | ejercicio_id, resultados de la última sesión para ese ejercicio | evalúa las reglas 1-3 de la sección 6 sobre todas las series de la última sesión | nuevo objetivo_repeticiones y/o nuevo peso_actual para la siguiente sesión |
| Consultar historial | ejercicio_id | recopila todas las sesiones donde aparece ese ejercicio, ordenadas por fecha | lista cronológica de peso y repeticiones logradas por sesión |

## 5. Datos que se maneja

**Ejercicio**
- id (entero, autogenerado)
- nombre (texto)
- tipo (texto: "peso" o "calistenia")
- repeticiones_maximas_probadas (entero, solo para tipo "calistenia" — resultado de la prueba inicial)
- peso_probado (decimal, solo para tipo "peso" — resultado de la prueba inicial)
- margen_repeticiones (entero, cuántas repeticiones por encima del punto de partida define el tope del rango; por defecto 4)
- repeticiones_min (entero, calculado: repeticiones_maximas_probadas para calistenia, o el repeticiones_min deseado indicado al probar el peso)
- repeticiones_max (entero, calculado: repeticiones_min + margen_repeticiones)
- objetivo_repeticiones (entero, inicia igual a repeticiones_min)
- peso_actual (decimal, nulo si tipo es "calistenia"; inicia igual a peso_probado)
- incremento_peso (decimal, nulo si tipo es "calistenia")

**Sesión**
- id (entero, autogenerado)
- fecha (fecha)

**Serie**
- id (entero, autogenerado)
- sesión_id (entero, referencia a Sesión)
- ejercicio_id (entero, referencia a Ejercicio)
- número_serie (entero, ej. 1, 2, 3)
- repeticiones_logradas (entero)
- peso_usado (decimal, nulo si el ejercicio es de tipo "calistenia")

## 6. Reglas del sistema

1. **Prueba inicial define el punto de partida**: para calistenia, `repeticiones_min = repeticiones_maximas_probadas` (el tope real medido) y `repeticiones_max = repeticiones_min + margen_repeticiones`; para ejercicios con peso, `peso_actual = peso_probado` y `objetivo_repeticiones = repeticiones_min` indicado al hacer la prueba. Ningún ejercicio arranca con un rango genérico no relacionado con la capacidad real medida.
2. **Subir peso**: si en una sesión **todas las series** de un ejercicio de tipo "peso" logran `repeticiones_logradas >= repeticiones_max`, entonces para la siguiente sesión: `peso_actual += incremento_peso` y `objetivo_repeticiones` vuelve a `repeticiones_min`.
3. **Subir repeticiones**: si todas las series logran `repeticiones_logradas >= objetivo_repeticiones` pero al menos una serie no llega a `repeticiones_max`, entonces para la siguiente sesión `objetivo_repeticiones += 1` (sin superar `repeticiones_max`) y el peso (o, en calistenia, la dificultad) se mantiene igual.
4. **Mantener**: si en al menos una serie `repeticiones_logradas < objetivo_repeticiones`, el peso y el objetivo de repeticiones de la siguiente sesión quedan **exactamente iguales** a los de la sesión actual — el sistema nunca baja el peso ni las repeticiones automáticamente.
5. Para ejercicios de tipo "calistenia" (sin `peso_actual`), aplican solo las reglas de repeticiones (reglas 3 y 4); la regla 2 no aplica porque no hay peso que subir — al llegar a `repeticiones_max` en todas las series, el sistema muestra un aviso de "considerar variante más difícil" en vez de modificar un peso.
6. Una sesión debe tener el **mismo número de series** para un ejercicio que el que tuvo su sesión anterior; si se registra un número distinto de series, el sistema usa igualmente todas las series registradas para evaluar las reglas 2-4 (una serie de más que también cumple el objetivo no perjudica; una de menos se evalúa con las series que sí existen).
7. El `margen_repeticiones` por defecto es **4** si no se especifica uno distinto al registrar el ejercicio (por ejemplo, para un ejercicio de calistenia con tope probado de 3 repeticiones, el rango de trabajo queda en 3-7).

## 7. Qué queda fuera

- Generación automática de rutinas completas desde cero (qué ejercicios hacer cada día) — el usuario define sus propios ejercicios.
- Cálculo de calorías o nutrición.
- Videos o instrucciones de técnica por ejercicio.
- Múltiples usuarios o entrenadores gestionando rutinas de terceros.
- Detección automática de lesiones o fatiga a partir de los datos.
- Integración con wearables o relojes inteligentes.

## 8. Módulo mínimo y funcionalidades opcionales

**Módulo mínimo** (resuelve el problema central y se puede mostrar funcionando):
- Registrar ejercicio con prueba inicial (regla 1)
- Registrar sesión
- Calcular progresión (reglas 2-4)

**Funcionalidades opcionales** (se construyen si el tiempo alcanza):
- Manejo especial de calistenia (regla 5, aviso de variante más difícil)
- Consultar historial de progreso
