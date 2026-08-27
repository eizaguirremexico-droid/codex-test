import { responder } from "../bot/agente.js";
import * as store from "../bot/store.js";
import { escalamiento } from "../bot/config.js";
import { acusarRecibo, descargarImagen, enviar, extraerEco, extraerMensaje, firmaValida } from "../bot/whatsapp.js";

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
    const payload = JSON.parse(crudo);
    const eco = extraerEco(payload);
    if (eco) {
      await tomoElHumano(eco);
    } else {
      const mensaje = extraerMensaje(payload);
      if (mensaje) await atender(mensaje);
    }
  } catch (error) {
    console.error("fallo procesando el webhook:", error);
  }

  return new Response("ok", { status: 200 });
}

// El dueño contestó a mano desde la app. El bot se hace a un lado solo, sin que
// nadie tenga que avisarle: es una conversación entre dos personas ahora.
const tomoElHumano = async ({ id, cliente }) => {
  if (await store.get(`wa:propio:${id}`)) return; // era un mensaje del bot, no del dueño
  await store.set(`wa:pausa:${cliente}`, 1, escalamiento.horasEnSilencio * 3600);
};

// Manda y anota los ids, para que un eco de nuestro propio mensaje no se
// confunda con el dueño escribiendo a mano desde la app.
const responderAlCliente = async (to, texto) => {
  for (const id of await enviar(to, texto)) {
    await store.set(`wa:propio:${id}`, 1, 3600);
  }
};

const atender = async (mensaje) => {
  if (!(await store.primeraVez(`wa:msg:${mensaje.id}`))) return; // reintento de Meta
  if (await store.get(`wa:pausa:${mensaje.de}`)) return; // un humano está atendiendo este chat

  try {
    await acusarRecibo(mensaje.id);
  } catch (error) {
    console.error("no se pudo marcar como leído:", error.message);
  }

  // Las imágenes se abren y se le enseñan al modelo. Lo demás (PDF, audio,
  // video, sticker) solo se anuncia: el prompt le dice que eso se escala.
  let imagen = null;
  let texto = mensaje.texto.trim();

  if (mensaje.media) {
    try {
      imagen = await descargarImagen(mensaje.media);
    } catch (error) {
      console.error("no se pudo bajar la imagen:", error.message);
    }
  }

  if (!imagen && mensaje.tipo !== "text") {
    const que = mensaje.archivo ? `el archivo "${mensaje.archivo}"` : `algo de tipo ${mensaje.tipo}`;
    texto = `[el cliente mandó ${que}, que no puedes abrir]${texto ? ` Escribió: ${texto}` : ""}`;
  }

  if (!imagen && !texto) return;

  const { respuesta } = await responder({
    telefono: mensaje.de,
    texto,
    imagen,
    nombre: mensaje.nombre,
  });

  await responderAlCliente(mensaje.de, respuesta);
};
