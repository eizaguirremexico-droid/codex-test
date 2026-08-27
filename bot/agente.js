import Anthropic from "@anthropic-ai/sdk";
import { negocio, calificacion, escalamiento, modelo, capacidadesDelModelo } from "./config.js";
import { sistema, palabraDeEscape } from "./prompt.js";
import * as store from "./store.js";
import { enviar } from "./whatsapp.js";

const claude = new Anthropic();

// El esquema de registrar_lead sale de calificacion.datos, para que agregar o
// quitar un dato en config.js sea suficiente: ni el esquema ni el aviso que te
// llega hay que tocarlos aquí.
const camposDelLead = Object.fromEntries(
  calificacion.datos.map((d) => [d.campo, { type: "string", description: d.descripcion }])
);

export const herramientas = [
  {
    name: "registrar_lead",
    description:
      "Registra al cliente en cuanto sepas qué quiere. Úsala una sola vez por conversación, sin esperar a tener todos los datos.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del cliente si lo dio, si no cadena vacía" },
        ...camposDelLead,
        califica: { type: "boolean", description: "true si cumple los criterios de calificación" },
        porque: { type: "string", description: "Una frase explicando por qué sí o por qué no" },
      },
      required: ["nombre", ...calificacion.datos.map((d) => d.campo), "califica", "porque"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "pasar_a_humano",
    description:
      "Saca la conversación del bot y avisa al dueño. Úsala cuando ya tengas los datos para cotizar, cuando el cliente pida una persona, cuando quiera pagar, o cuando pregunte algo que no está en tus datos.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Por qué lo estás pasando, en pocas palabras" },
        resumen: { type: "string", description: "Resumen de la conversación para que el dueño entre al día" },
      },
      required: ["motivo", "resumen"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const avisarAlDueno = async (texto) => {
  // Sin número configurado el aviso va a los logs. En Vercel queda en el
  // registro de la función; probando en local, en la terminal.
  if (!escalamiento.whatsappDueno || escalamiento.whatsappDueno.includes("X")) {
    console.log(`\n[aviso al dueño]\n${texto}\n`);
    return;
  }
  try {
    await enviar(escalamiento.whatsappDueno, texto);
  } catch (error) {
    console.error("no se pudo avisar al dueño:", error.message);
  }
};

const ejecutar = async (nombre, entrada, contexto) => {
  if (nombre === "registrar_lead") {
    const lead = { ...entrada, telefono: contexto.telefono, fecha: new Date().toISOString() };
    await store.guardarLead(lead);
    if (entrada.califica) {
      const detalle = calificacion.datos
        .map((d) => `${d.campo}: ${entrada[d.campo] || "no dijo"}`)
        .join("\n");
      await avisarAlDueno(
        `🟢 Pedido por cotizar\n\n` +
          `${entrada.nombre || "Sin nombre"} · wa.me/${contexto.telefono}\n\n` +
          `${detalle}\n\n${entrada.porque}`
      );
    }
    return "Registrado. Sigue atendiendo al cliente con normalidad.";
  }

  if (nombre === "pasar_a_humano") {
    contexto.escalado = true;
    await store.set(`wa:pausa:${contexto.telefono}`, 1, escalamiento.horasEnSilencio * 3600);
    await avisarAlDueno(
      `🔴 Te toca entrar\n\n` +
        `wa.me/${contexto.telefono}\n` +
        `Motivo: ${entrada.motivo}\n\n${entrada.resumen}\n\n` +
        `(El bot se queda callado con este número ${escalamiento.horasEnSilencio} horas.)`
    );
    return "Listo, ya se avisó. Despídete en una línea y no sigas la conversación.";
  }

  return "Esa herramienta no existe.";
};

export const responder = async ({ telefono, texto, nombre }) => {
  const clave = `wa:hist:${telefono}`;
  const historial = (await store.get(clave)) ?? [];
  const contexto = { telefono, escalado: false };
  const uso = { entrada: 0, salida: 0, cacheLeido: 0, cacheEscrito: 0 };

  // Si pide una persona con todas sus letras, no hay nada que pensar:
  // lo pasamos sin gastar una llamada al modelo.
  if (palabraDeEscape(texto)) {
    await ejecutar("pasar_a_humano", { motivo: "lo pidió el cliente", resumen: texto }, contexto);
    await store.set(clave, [...historial, { role: "user", content: texto }].slice(-modelo.memoria), 24 * 3600);
    return { respuesta: escalamiento.mensajeDeTransferencia, escalado: true, uso };
  }

  const primerContacto = historial.length === 0 && nombre ? `[El contacto se llama ${nombre}]\n` : "";
  const mensajes = [...historial, { role: "user", content: `${primerContacto}${texto}` }];

  let respuesta = "";

  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const salida = await claude.beta.messages.create({
      model: modelo.id,
      max_tokens: 1024,
      // El orden de estas claves no importa para el caché (se serializa aparte),
      // pero el prompt de sistema sí tiene que ser idéntico byte a byte.
      ...(capacidadesDelModelo.esfuerzo ? { output_config: { effort: modelo.esfuerzo } } : {}),
      // Si un clasificador de seguridad rechaza el turno, el servidor lo reintenta
      // en otro modelo en vez de dejar al cliente sin respuesta.
      ...(capacidadesDelModelo.respaldoPorRechazo
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
        : {}),
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      tools: herramientas,
      messages: mensajes,
    });

    uso.entrada += salida.usage?.input_tokens ?? 0;
    uso.salida += salida.usage?.output_tokens ?? 0;
    uso.cacheLeido += salida.usage?.cache_read_input_tokens ?? 0;
    uso.cacheEscrito += salida.usage?.cache_creation_input_tokens ?? 0;

    if (salida.stop_reason === "refusal") {
      await ejecutar("pasar_a_humano", { motivo: "el modelo no pudo responder", resumen: texto }, contexto);
      respuesta = escalamiento.mensajeDeTransferencia;
      contexto.escalado = true;
      break;
    }

    respuesta = salida.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const llamadas = salida.content.filter((b) => b.type === "tool_use");
    if (llamadas.length === 0) break;

    mensajes.push({ role: "assistant", content: salida.content });
    const resultados = [];
    for (const llamada of llamadas) {
      resultados.push({
        type: "tool_result",
        tool_use_id: llamada.id,
        content: await ejecutar(llamada.name, llamada.input, contexto),
      });
    }
    mensajes.push({ role: "user", content: resultados });
  }

  if (!respuesta) {
    respuesta = contexto.escalado
      ? escalamiento.mensajeDeTransferencia
      : `Déjame confirmarlo y te digo. Mientras, cualquier otra duda de ${negocio.nombre} aquí ando.`;
  }

  // Solo texto en el historial: los bloques de herramienta no aportan nada al
  // siguiente turno y sí gastan contexto en cada mensaje que llegue.
  const nuevo = [
    ...historial,
    { role: "user", content: texto },
    { role: "assistant", content: respuesta },
  ].slice(-modelo.memoria);

  // 24 horas es la ventana en la que WhatsApp te deja responder libre de costo.
  // Pasada esa ventana la conversación está muerta de todos modos.
  await store.set(clave, nuevo, 24 * 3600);

  return { respuesta, escalado: contexto.escalado, uso };
};
