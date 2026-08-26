import crypto from "node:crypto";

const VERSION = "v23.0";
const base = () => `https://graph.facebook.com/${VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;

const graph = async (cuerpo) => {
  const res = await fetch(`${base()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
  return res.json();
};

// WhatsApp corta en 4096 caracteres. Partimos por párrafo antes de que lo haga él.
const partir = (texto, limite = 4000) => {
  if (texto.length <= limite) return [texto];
  const trozos = [];
  let actual = "";
  for (const parrafo of texto.split("\n")) {
    if ((actual + "\n" + parrafo).length > limite) {
      if (actual) trozos.push(actual);
      actual = parrafo.slice(0, limite);
    } else {
      actual = actual ? `${actual}\n${parrafo}` : parrafo;
    }
  }
  if (actual) trozos.push(actual);
  return trozos;
};

export const enviar = async (to, texto) => {
  for (const trozo of partir(texto)) {
    await graph({ to, type: "text", text: { preview_url: false, body: trozo } });
  }
};

// Palomita azul + "escribiendo…". El cliente ve que algo pasa mientras el modelo piensa.
export const acusarRecibo = async (messageId) => {
  await graph({ status: "read", message_id: messageId, typing_indicator: { type: "text" } });
};

// Meta firma el cuerpo crudo con tu app secret. Sin esto, cualquiera que
// descubra tu URL puede hacerle decir lo que quiera a tu bot.
export const firmaValida = (crudo, cabecera) => {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) return false;
  if (!cabecera?.startsWith("sha256=")) return false;
  const esperada = "sha256=" + crypto.createHmac("sha256", secreto).update(crudo, "utf8").digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(cabecera);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Del payload de Meta saca lo único que nos importa: un mensaje entrante.
export const extraerMensaje = (payload) => {
  const valor = payload?.entry?.[0]?.changes?.[0]?.value;
  const mensaje = valor?.messages?.[0];
  if (!mensaje) return null; // acuses de entrega, cambios de estado, etc.
  return {
    id: mensaje.id,
    de: mensaje.from,
    tipo: mensaje.type,
    texto: mensaje.text?.body ?? mensaje.button?.text ?? mensaje.interactive?.list_reply?.title ?? "",
    nombre: valor?.contacts?.[0]?.profile?.name ?? null,
  };
};
