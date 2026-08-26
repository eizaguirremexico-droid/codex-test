import { responder } from "../bot/agente.js";
import * as store from "../bot/store.js";
import { acusarRecibo, enviar, extraerMensaje, firmaValida } from "../bot/whatsapp.js";

// Meta llama esto una sola vez, al dar de alta el webhook en el panel.
export function GET(request) {
  const params = new URL(request.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === esperado) {
    return new Response(params.get("hub.challenge"), { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(request) {
  const crudo = await request.text();

  if (!firmaValida(crudo, request.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  // A partir de aquí siempre devolvemos 200. Un error nuestro no debe hacer que
  // Meta reintente el mismo mensaje en bucle.
  try {
    const mensaje = extraerMensaje(JSON.parse(crudo));
    if (mensaje) await atender(mensaje);
  } catch (error) {
    console.error("fallo procesando el webhook:", error);
  }

  return new Response("ok", { status: 200 });
}

const atender = async (mensaje) => {
  if (!(await store.primeraVez(`wa:msg:${mensaje.id}`))) return; // reintento de Meta
  if (await store.get(`wa:pausa:${mensaje.de}`)) return; // un humano está atendiendo este chat

  try {
    await acusarRecibo(mensaje.id);
  } catch (error) {
    console.error("no se pudo marcar como leído:", error.message);
  }

  if (mensaje.tipo !== "text" || !mensaje.texto.trim()) {
    await enviar(mensaje.de, "Por ahora solo puedo leer mensajes de texto. ¿Me lo escribes?");
    return;
  }

  const { respuesta } = await responder({
    telefono: mensaje.de,
    texto: mensaje.texto.trim(),
    nombre: mensaje.nombre,
  });

  await enviar(mensaje.de, respuesta);
};
