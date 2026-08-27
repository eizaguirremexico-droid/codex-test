// ─────────────────────────────────────────────────────────────────────────────
// ESTE ES EL ÚNICO ARCHIVO QUE EDITAS.
// Todo lo que el bot sabe de tu negocio vive aquí. Lo demás es plomería.
// Entre más concreto seas, menos veces va a decir "déjame confirmarlo".
// ─────────────────────────────────────────────────────────────────────────────

export const negocio = {
  nombre: "TU NEGOCIO",

  // Una o dos frases. Qué vendes y a quién.
  queEs: "DESCRIBE AQUÍ QUÉ VENDES Y A QUIÉN LE VENDES.",

  // Cómo quieres que suene. El bot lo va a imitar.
  tono: "Cercano y directo, de tú. Español de México. Mensajes cortos, como se escribe en WhatsApp.",

  ubicacion: "CALLE, COLONIA, CIUDAD. O 'solo en línea' / 'vamos a domicilio en X zona'.",
  horarios: "Lunes a viernes 9:00–18:00, sábado 10:00–14:00. Domingo cerrado.",

  // Precios. Si no quieres publicarlos, pon rangos o "se cotiza" y explica de qué depende.
  precios: [
    "SERVICIO O PRODUCTO 1 — $X",
    "SERVICIO O PRODUCTO 2 — desde $X, depende de Y",
  ],

  // Reglas duras. El bot no se sale de aquí.
  politicas: [
    "Formas de pago: efectivo, transferencia y tarjeta.",
    "Anticipo de 50% para apartar.",
    "Cancelaciones con 24 horas de anticipación.",
  ],

  // Las preguntas que más te repiten. Saca 10 de tu WhatsApp actual.
  faq: [
    { p: "¿Hacen envíos?", r: "RESPUESTA." },
    { p: "¿Cuánto tardan?", r: "RESPUESTA." },
    { p: "¿Aceptan tarjeta?", r: "RESPUESTA." },
  ],
};

export const calificacion = {
  // Lo que necesitas saber antes de meterte tú al chat.
  // El bot las hace de a poco, en la conversación, no como formulario.
  queAveriguar: [
    "Qué necesita exactamente",
    "Para cuándo lo necesita",
    "En qué zona o ciudad está",
    "Si ya tiene presupuesto en mente",
  ],

  // Cuándo sí vale tu tiempo.
  calificaSi: "Sabe qué quiere, lo necesita en los próximos 30 días y está en tu zona de servicio.",

  // Cuándo no. El bot lo atiende bien y lo despide bien, pero no te lo pasa.
  noCalificaSi: "Solo está curioseando precios, queda fuera de tu zona, o pide algo que no vendes.",
};

export const escalamiento = {
  // Tu WhatsApp, formato internacional sin + ni espacios. Aquí te llegan los avisos.
  whatsappDueno: "521XXXXXXXXXX",

  // Si el cliente escribe algo de esta lista, el bot se sale y te lo pasa de inmediato.
  palabrasClave: ["asesor", "humano", "persona", "hablar con alguien", "queja", "reclamo"],

  // Cuando un chat pasa a humano, el bot se calla en ese número por estas horas
  // para no interrumpirte mientras atiendes.
  horasEnSilencio: 12,

  // Lo que el cliente ve al momento de la transferencia.
  mensajeDeTransferencia: "Va, dame un momento que ya te contacta alguien del equipo. 🙌",
};

export const modelo = {
  // Claude Opus 5. Alternativas: "claude-sonnet-5" (~2.5x más barato) o
  // "claude-haiku-4-5" (~6.6x más barato, suficiente para preguntas frecuentes).
  // Cambia solo esta línea: lo demás se ajusta al modelo que elijas.
  id: "claude-opus-5",

  // Cuánto piensa antes de responder. "low" es lo correcto para WhatsApp:
  // rápido y barato. Súbelo a "medium" si notas que califica mal.
  // Los modelos que no razonan (Haiku 4.5) lo ignoran.
  esfuerzo: "low",

  // Cuántos mensajes de la conversación recuerda.
  memoria: 20,
};

// No todos los modelos aceptan los mismos parámetros. Mandarle `effort` a
// Haiku 4.5 devuelve un 400, así que aquí queda registrado qué acepta cada uno
// y el agente arma la petición en consecuencia.
const capacidades = {
  "claude-opus-5": { esfuerzo: true, respaldoPorRechazo: true },
  "claude-sonnet-5": { esfuerzo: true, respaldoPorRechazo: false },
  "claude-haiku-4-5": { esfuerzo: false, respaldoPorRechazo: false },
};

// Un modelo desconocido se trata como el mínimo común: nada de extras.
export const capacidadesDelModelo = capacidades[modelo.id] ?? {
  esfuerzo: false,
  respaldoPorRechazo: false,
};
