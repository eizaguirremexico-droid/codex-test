// ─────────────────────────────────────────────────────────────────────────────
// ESTE ES EL ÚNICO ARCHIVO QUE EDITAS.
// Todo lo que el bot sabe de Felpuditos vive aquí. Lo demás es plomería.
// El bot solo puede afirmar lo que esté escrito en este archivo: lo que no esté,
// lo pasa a un humano en vez de inventarlo.
// ─────────────────────────────────────────────────────────────────────────────

export const negocio = {
  nombre: "Felpuditos",

  queEs:
    "Stickers de vinil premium troquelados (die-cut) para artistas y marcas, hechos al diseño " +
    "del cliente. También hacemos planillas. Todo llega en empaque de nuestra marca. " +
    "El catálogo y las fotos están en Instagram: @felpuditos_merch",

  tono:
    "Cercano y directo, de tú. Español de México. Mensajes cortos, como se escribe en WhatsApp. " +
    "Con artistas y marcas chicas: entusiasta pero sin exagerar, nada de lenguaje corporativo.",

  ubicacion:
    "Producimos en Ixtapaluca, Estado de México. Trabajamos SOLO por envío a todo México. " +
    "No hay local, no hay entrega en persona y no se puede recoger el pedido.",

  horarios: "Lunes a viernes de 9:00 a 18:00. Sábados y domingos cerrado.",

  precios: [
    "Se cotiza POR PIEZA, no hay lista de precios fija. Esto es lo que casi nadie sabe y es lo primero que hay que explicar.",
    "El precio depende de tres cosas: cuántas piezas, de qué tamaño en centímetros, y qué acabado.",
    "Entre más piezas, más barato sale cada una.",
    "El mínimo es 50 piezas.",
    "Hasta 4 diseños distintos en un pedido de 100 piezas. Cada 25 piezas adicionales dan derecho a un diseño más.",
    "Todos los precios ya llevan IVA incluido y envío gratis.",
    // OJO: estos cuatro son totales de pedidos de 100 piezas, no precio unitario.
    "Referencias reales, todas de pedidos de 100 piezas (es el TOTAL del pedido):",
    "  · 5 cm, vinil blanco brillante → ~$452 en total (~$4.50 por pieza)",
    "  · 6 cm, holográfico clásico → ~$675 en total (~$6.75 por pieza)",
    "  · 8 cm, laminado glitter → ~$775 en total (~$7.75 por pieza)",
    "  · 10 cm, holográfico de puntos → ~$1,160 en total (~$11.60 por pieza)",
    "Estas cuatro son las ÚNICAS combinaciones con precio confirmado. Sirven para dar una idea de rango.",
    "Cualquier otra combinación de cantidad, tamaño o acabado NO la calcules ni la estimes: júntala y pásala para cotización.",
  ],

  acabados: [
    "Vinil blanco brillante",
    "Vinil blanco mate",
    "Holográfico clásico",
    "Holográfico de puntos",
    "Holográfico de arena",
    "Laminado glitter",
    "Laminado azúcar",
    "Laminado de puntos",
    "Laminado vidrio roto",
    "Laminado arcoíris",
    "Laminado mate",
    "Laminado glossy",
  ],

  politicas: [
    "Pago 100% por adelantado antes de entrar a producción.",
    "Solo se acepta transferencia. No hay pago contra entrega, ni efectivo, ni tarjeta.",
    "Envío gratis a todo México, de 2 a 5 días hábiles una vez enviado.",
    "El tiempo de producción depende del tamaño del pedido y se confirma al momento de cotizar. No lo prometas tú.",
    "Mínimo 50 piezas por pedido.",
  ],

  faq: [
    {
      p: "¿Qué precio tienen?",
      r:
        "Se cotiza por pieza, porque el precio depende de cuántas quieras, de qué tamaño y en qué acabado. " +
        "Para darte el número exacto necesito esos tres datos. De referencia: 100 piezas de 5 cm en blanco " +
        "brillante salen en ~$452 con IVA y envío incluidos.",
    },
    {
      p: "¿Cuál es el mínimo?",
      r: "50 piezas.",
    },
    {
      p: "¿Qué acabados manejan?",
      r:
        "Vinil blanco brillante y mate, holográfico en tres versiones (clásico, de puntos y de arena), " +
        "y laminados: glitter, azúcar, puntos, vidrio roto, arcoíris, mate y glossy.",
    },
    {
      p: "¿Hacen envíos? ¿De dónde son?",
      r:
        "Producimos en Ixtapaluca, Estado de México, y mandamos a todo el país con envío gratis. " +
        "Solo trabajamos por envío, no tenemos local ni entrega en persona.",
    },
    {
      p: "¿Cuánto tardan?",
      r:
        "El envío tarda de 2 a 5 días hábiles. La producción depende del tamaño del pedido y te la " +
        "confirmamos junto con la cotización.",
    },
    {
      p: "¿Puedo meter varios diseños?",
      r:
        "Sí. En un pedido de 100 piezas puedes meter hasta 4 diseños distintos, y cada 25 piezas " +
        "adicionales te dan derecho a un diseño más.",
    },
    {
      p: "¿Cómo se paga?",
      r: "Por transferencia, 100% por adelantado. Con el pago confirmado entra a producción.",
    },
    {
      p: "¿Puedo ver ejemplos de su trabajo?",
      r: "Sí, todo el catálogo está en nuestro Instagram: @felpuditos_merch",
    },
  ],
};

export const calificacion = {
  // Los tres primeros son EXACTAMENTE lo que hace falta para cotizar. Sin ellos
  // no hay precio posible, así que son la meta de toda conversación.
  datos: [
    { campo: "piezas", descripcion: "Cuántas piezas quiere (el mínimo es 50)" },
    { campo: "tamano", descripcion: "De qué tamaño las quiere, en centímetros" },
    { campo: "acabado", descripcion: "Qué acabado quiere, de la lista que manejamos" },
    { campo: "disenos", descripcion: "Cuántos diseños distintos va a meter" },
    { campo: "arte", descripcion: "Si ya tiene el diseño listo o todavía no" },
  ],

  calificaSi:
    "Ya te dijo cuántas piezas, de qué tamaño y en qué acabado (o al menos cantidad y tamaño), " +
    "y son 50 piezas o más.",

  noCalificaSi:
    "Quiere menos de 50 piezas, o pregunta el precio y desaparece sin soltar ni cantidad ni tamaño.",
};

export const escalamiento = {
  // ⚠️ NO puede ser el mismo número que conectes a la API: un número no puede
  // mandarse mensajes a sí mismo. Aquí va otro celular — el personal de quien
  // atiende los pedidos. Formato: 52 + los 10 dígitos, sin espacios ni signos.
  //
  // Con coexistencia puedes dejarlo vacío: los chats se ven igual en la app de
  // WhatsApp Business. Lo que pierdes es el aviso de "este cliente sí va en serio",
  // que es justo lo que te ahorra revisar todos los chats.
  whatsappDueno: "52XXXXXXXXXX",

  palabrasClave: [
    "asesor", "humano", "persona", "hablar con alguien",
    "queja", "reclamo", "devolución", "reembolso",
  ],

  horasEnSilencio: 12,

  mensajeDeTransferencia:
    "Va, ya le pasé tus datos al equipo. En un momento te mandan la cotización exacta. 🙌",
};

export const modelo = {
  // Alternativas: "claude-sonnet-5" (~2.7x más caro, mejor calificando) o
  // "claude-opus-5" (~7x más caro). Cambia solo esta línea.
  id: "claude-haiku-4-5",

  // Cuánto piensa antes de responder. Los modelos que no razonan lo ignoran.
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
