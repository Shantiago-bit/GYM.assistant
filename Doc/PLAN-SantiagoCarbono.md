# Proyecto Gym Assistant — Segunda versión del documento

## 1. Qué se entrega

Este documento presenta la segunda versión del proyecto, corregida y ampliada respecto a la entrega inicial. Aquí se define con mayor precisión qué se va a construir, qué se descarta por ahora y por qué se toman determinadas decisiones técnicas.

La intención ya no es un producto genérico o una idea demasiado ambiciosa. La propuesta se centra en un MVP real y ejecutable: una aplicación web para entrenadores y usuarios que quieren registrar su progreso en ejercicios y recibir una recomendación objetiva de la siguiente carga o meta de repeticiones basada en sobrecarga progresiva.

El proyecto se entrega como una solución ligera, clara y funcional, pensada para desarrollarse con TypeScript + Next.js, con una lógica de negocio enfocada en la progresión real del entrenamiento y una experiencia de usuario limpia, minimalista y centrada en la acción.

---

## 2. Qué se corrigió respecto a la primera versión

La primera versión tenía varios problemas de enfoque:

- Estaba más orientada a una idea aspiracional que a un alcance realista.
- Mezclaba conceptos de producto sin diferenciar qué era MVP y qué era mejora futura.
- Incluía funciones que no eran necesarias para validar la propuesta.
- No estaba claro qué tecnología se usaba y por qué esa decisión era la más adecuada para este caso.

En esta segunda versión se ajusta el alcance de la siguiente manera:

1. Se mantiene el problema central: ayuda a planificar progresión de entrenamiento de forma objetiva.
2. Se reducen las ambiciones del producto: no se construye un sistema completo de nutrición, coaching o gestión institucional.
3. Se definen niveles de prioridad: funcionalidad principal, funcionalidad complementaria y funcionalidades futuras.
4. Se especifican decisiones técnicas concretas con su justificación y su contexto de uso.

---

## 3. Alcance ajustado: lo que sí se va a construir

### 3.1 Objetivo del producto

Gym Assistant es una aplicación para registrar ejercicios, probar una línea base inicial y obtener una recomendación de progreso para la siguiente sesión.

La idea principal es simple:

- el usuario registra una prueba inicial de un ejercicio;
- el sistema identifica su punto de partida real;
- el usuario registra la sesión aplicada;
- el sistema calcula si debe subir peso, subir repeticiones o mantenerse.

### 3.2 Casos de uso principales

1. Registrar un ejercicio con su tipo:
   - peso libre o máquina;
   - calistenia/bodyweight.
2. Definir una prueba inicial según el tipo de ejercicio.
3. Registrar repeticiones y peso en cada serie de una sesión.
4. Consultar la recomendación de la siguiente sesión.
5. Revisar un histórico de progreso.

### 3.3 Qué pasa a ser fuera de alcance del MVP

Se descarta intencionalmente lo siguiente para esta versión:

- autenticación real con usuarios y roles complejos;
- bases de datos relacionales con migraciones;
- multiusuario con permisos administrativos;
- notificaciones o recordatorios por correo o SMS;
- integraciones con wearables o apps externas;
- análisis de nutrición o composición corporal;
- generación automática de rutinas por inteligencia artificial;
- gestión de entrenadores, clientes y planes de entrenamiento completos.

Esto no significa que no sean valiosos, pero sí que no son parte del núcleo de valor del MVP y podrían añadirse más adelante según el crecimiento del producto.

---

## 4. Qué va a resolver el sistema

El sistema ayuda a reemplazar la memoria por una lógica basada en datos reales.

### Problema actual

El entrenamiento suele basarse en lo que “se recuerda” de la última vez. Eso genera varios errores:

- subir carga sin evidencia;
- estancarse por no tener una referencia clara;
- no saber si el objetivo de la próxima sesión debe cambiar en peso o en repeticiones;
- tratar iguales ejercicios con peso y calistenia aunque requieran reglas distintas.

### Solución propuesta

El sistema calcula el progreso a partir de la última sesión y del punto de partida real, aplicando una lógica de sobrecarga progresiva.

Reglas básicas:

- Si todas las series superan el rango de repeticiones objetivo, se sube la carga.
- Si solo se cumple el objetivo mínimo, se aumenta la meta de repeticiones.
- Si se falla el objetivo, se mantiene la carga actual.
- En calistenia, la progresión se evalúa principalmente por repeticiones y por la necesidad de una variante más difícil, sin un peso que aumentar.

---

## 5. Modelo de dominio

El sistema maneja tres entidades principales:

### Ejercicio

- nombre
- tipo: peso o calistenia
- prueba inicial
- rango objetivo
- peso o nivel de referencia
- meta actual

### Sesión

- fecha
- lista de ejercicios ejecutados
- registros de repeticiones obtenidas

### Serie

- número de serie
- ejercicio asociado
- repeticiones realizadas
- peso usado (si aplica)

Este modelo es suficiente para representar el problema real sin introducir complejidad técnica innecesaria en esta etapa.

---

## 6. Decisiones técnicas y por qué

### 6.1 Tecnologías elegidas

#### Next.js con TypeScript

Se eligió Next.js por las siguientes razones:

- permite crear una aplicación web moderna con buen rendimiento;
- soporta arquitectura basada en App Router;
- tiene buen equilibrio entre rapidez de desarrollo y mantenibilidad;
- facilita la implementación de páginas, componentes y lógica de negocio dentro del mismo stack.

TypeScript se eligió porque el producto requiere lógica de entrenamiento con reglas claras y cálculos repetibles. Esto ayuda a reducir errores, mejorar la legibilidad y hacer más segura la evolución del sistema.

#### Tailwind CSS

Se eligió Tailwind para la capa visual porque:

- acelera el diseño de interfaces limpias y consistentes;
- permite mantener una estética minimalista y enfocada;
- reduce la necesidad de construir CSS complejo desde cero;
- funciona muy bien con un MVP visual simple pero atractivo.

#### Vitest

Se utiliza Vitest para pruebas de la lógica de progresión, ya que es una herramienta muy eficaz para JavaScript/TypeScript y resulta apropiada para validar reglas de negocio sin un entorno pesado.

#### Persistencia inicial en JSON

Para el MVP, la capa de persistencia se gestiona con archivos JSON en la carpeta de datos del proyecto, en lugar de una base de datos relacional.

Esto tiene sentido porque:

- el proyecto está en una etapa de validación;
- el alcance no requiere aún alta concurrencia ni gestión compleja de usuarios;
- la lógica de negocio es más importante que la infraestructura persistente;
- permite iterar rápido sin bloquear el desarrollo con migraciones y configuración de base de datos.

Esta decisión se considera temporal, pero suficiente para demostrar el valor del producto y dejar la base lista para una evolución posterior.

### 6.2 Por qué no se eligió una solución más compleja desde el inicio

No se construyó una arquitectura con backend completo, base de datos relacional e identidad desde el comienzo porque eso aumentaría:

- tiempo de desarrollo;
- riesgo técnico;
- complejidad de despliegue;
- fricción para validar el producto con un MVP funcional.

En fases posteriores, si el producto crece, sí podría añadirse una base de datos más robusta, un backend API y autenticación real. Pero para esta etapa, la prioridad es validar la lógica del entrenamiento y la experiencia del usuario.

---

## 7. Arquitectura planteada para la versión funcional

### Frontend

- Next.js App Router
- componentes React
- páginas para home, login, dashboard y seguimiento
- diseño minimalista con paleta de verdes y elementos visuales simples

### Lógica de negocio

- funciones para registrar prueba inicial
- función para evaluar progreso de una sesión
- reglas de doble progresión y mantenimiento
- lógica para ejercicios con peso y calistenia

### Persistencia

- estructura en data/
- almacenamiento local o JSON según el entorno de desarrollo
- posibilidad de evolucionar a API o DB más adelante

### Pruebas

- pruebas unitarias sobre la lógica de progresión
- validación de reglas específicas por escenarios reales

---

## 8. Alcance funcional real del MVP

### Módulo mínimo viable

El MVP deberá entregar, al menos, lo siguiente:

- registro de un ejercicio con prueba inicial;
- cálculo del rango objetivo según el tipo de ejercicio;
- registro de una sesión con series y repeticiones;
- cálculo del siguiente objetivo;
- apoyo para peso y calistenia;
- historial básico de sesión y progreso.

### Funcionalidades deseables, no prioritarias

- comparativa de progreso por ejercicio;
- visualización de tendencias con pequeñas estadísticas;
- interfaz con tarjetas y botones claros;
- soporte para más de un ejercicio por entrenamiento;
- panel de resumen semanal o mensual.

Estas funcionalidades se incorporan después de que el núcleo del sistema esté funcionando y validado.

---

## 9. Riesgos y cómo se mitigan

### Riesgo 1: sobre-ingeniería

Se mitiga reduciendo el alcance a una lógica clara y un MVP defensible.

### Riesgo 2: construir una experiencia visual que no refleje el producto real

Se mitiga dejando de lado la idea de “landing page bonita” como objetivo principal y enfatizando la utilidad del producto.

### Riesgo 3: definir reglas ambiguas

Se mitiga con una lógica explícita, pruebas unitarias y un modelo consistente de progreso.

### Riesgo 4: usar tecnología más compleja de la necesaria

Se mitiga con una arquitectura en capas ligera: frontend + lógica + almacenamiento simple.

---

## 10. Conclusión

La segunda versión del proyecto deja claro que el producto no es un generador de rutinas completo ni un sistema de fitness genérico. El enfoque real es un asistente práctico para la progresión del entrenamiento, con reglas transparentes y datos de sesión para mejorar el rendimiento sin improvisar.

La decisión de usar Next.js + TypeScript + Tailwind + Vitest + persistencia JSON responde a una necesidad concreta: construir un producto útil, validable y extensible, sin caer en una solución demasiado grande o inestable para una fase inicial.

Este documento corrige el problema de la versión anterior: ahora el proyecto está alineado con lo que realmente se va a construir, con su alcance definido, su tecnología justificada y su lógica de negocio clara.

---

## 11. Estado de entrega

- Versión: segunda versión del documento del proyecto
- Estado: corregida, ampliada y ajustada al alcance real
- Objetivo: dejar un documento claro para desarrollo, validación y evolución del producto
- Entregable final: documento Markdown en formato de proyecto, listo para presentar en la plataforma
