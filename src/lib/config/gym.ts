export const RANGO_PESO: [number, number] = [8, 12];        // rango objetivo por defecto, peso (RN-05)
export const RANGO_CALISTENIA: [number, number] = [8, 15];  // rango objetivo por defecto, calistenia

// Rango sugerido según el enfoque; hipertrofia coincide con los rangos por defecto.
export const RANGOS_POR_ENFOQUE = {
  fuerza: { peso: [3, 5], calistenia: [3, 6] },
  hipertrofia: { peso: RANGO_PESO, calistenia: RANGO_CALISTENIA },
  resistencia: { peso: [15, 20], calistenia: [15, 25] },
} as const satisfies Record<string, Record<string, readonly [number, number]>>;

export const RIR_SALTO_DOBLE = 3;      // RIR mínimo en todas las series para duplicar el incremento
export const REDUCCION_DESCARGA = 0.1; // bajar 10 % tras dos sesiones seguidas bajo el mínimo
export const INCREMENTO_PESO_GRAMOS = 2500;                 // 2,5 kg (RN-06)
export const INCREMENTO_PESO_ALTO_GRAMOS = 5000;            // 5 kg desde el umbral (RN-06)
export const UMBRAL_PESO_ALTO_GRAMOS = 50000;               // 50 kg
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 500;

// Chat con CHRONO (Groq, plan gratuito): el plan limita los tokens por minuto de toda la app, así que se
// acota lo que se envía en cada pedido además de los mensajes por cuenta y día.
export const CHAT_MODELO = 'openai/gpt-oss-120b'; // GROQ_MODELO lo cambia si Groq lo retira
export const CHAT_LIMITE_DIARIO = 40;          // mensajes por cuenta y día (CHAT_LIMITE_DIARIO lo cambia)
export const CHAT_MAX_MENSAJES = 12;           // historial que se envía en cada pedido
export const CHAT_MAX_CARACTERES = 2000;       // largo máximo de un mensaje de la persona
export const CHAT_MAX_VUELTAS = 6;             // consultas a herramientas por respuesta
export const CHAT_MAX_SESIONES = 5;            // sesiones por ejercicio que ve el asistente

// Perfil y registro.
// La Ley 1581 de 2012 de Colombia exige la autorización del representante legal para tratar datos de
// menores de 18 años. Por debajo de esta edad se pide la autorización de la mamá, el papá o el tutor;
// se puede subir a 18 sin tocar nada más.
export const EDAD_MINIMA_SIN_AUTORIZACION = 12;
export const EDAD_MINIMA_REGISTRO = 8;          // por debajo no se crea la cuenta, ni con autorización
export const MAX_INTENTOS_NOMBRE_OFENSIVO = 5;  // al llegar aquí se cancela el registro
export const BLOQUEO_REGISTRO_MINUTOS = 30;
export const VIGENCIA_AUTORIZACION_DIAS = 7;
export const MAX_REENVIOS_TUTOR_DIA = 3;
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;  // 2 MB
export const FOTO_LADO_PX = 512;
export const DIAS_PR_NUEVO = 7;                 // un récord de los últimos 7 días se marca "Nuevo"

// Opciones de género del perfil (los valores coinciden con la columna perfiles.genero).
export const OPCIONES_GENERO = [
  { valor: 'hombre', texto: 'Hombre' },
  { valor: 'mujer', texto: 'Mujer' },
  { valor: 'otro', texto: 'Otro' },
  { valor: 'prefiero_no_decir', texto: 'Prefiero no decirlo' },
] as const;

// Correo: retención del registro de envíos y reenvíos de la confirmación.
export const DIAS_RETENCION_REGISTRO_CORREOS = 30;
export const MAX_REENVIOS_CONFIRMACION_HORA = 5; // por conexión (hash de la IP)
export const ESPERA_REENVIO_SEGUNDOS = 60;       // entre dos reenvíos a una misma cuenta
