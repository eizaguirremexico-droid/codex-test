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

// Devuelve los ids de lo que mandó, para poder reconocer después nuestros
// propios mensajes cuando la app de WhatsApp Business nos los haga eco.
export const enviar = async (to, texto) => {
  const ids = [];
  for (const trozo of partir(texto)) {
    const res = await graph({ to, type: "text", text: { preview_url: false, body: trozo } });
    for (const m of res.messages ?? []) ids.push(m.id);
  }
  return ids;
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

// Formatos que el modelo puede ver. Lo que llegue en otro formato se trata como
// archivo suelto: no se abre, se le avisa al modelo que llegó y él escala.
const VISIBLES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const TOPE_BYTES = 3.5 * 1024 * 1024;

// Bajar una imagen son dos viajes: primero Meta da una URL temporal, luego se
// descarga con el mismo token. Devuelve null si no se puede mostrar al modelo.
export const descargarImagen = async (mediaId) => {
  const meta = await fetch(`https://graph.facebook.com/${VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!meta.ok) throw new Error(`WhatsApp media ${meta.status}: ${await meta.text()}`);
  const { url, mime_type, file_size } = await meta.json();

  if (!VISIBLES.includes(mime_type)) return null;
  if (file_size > TOPE_BYTES) return null;

  const bin = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!bin.ok) throw new Error(`WhatsApp media descarga ${bin.status}`);

  const datos = Buffer.from(await bin.arrayBuffer()).toString("base64");
  return { mime: mime_type, datos };
};

// En coexistencia, lo que el dueño escribe a mano desde la app de WhatsApp
// Business llega aquí como eco. Es la señal más limpia de "ya entró un humano".
// En un eco, `from` es el número del negocio y `to` el del cliente.
export const extraerEco = (payload) => {
  const eco = payload?.entry?.[0]?.changes?.[0]?.value?.message_echoes?.[0];
  if (!eco) return null;
  return { id: eco.id, cliente: eco.to };
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
    texto:
      mensaje.text?.body ??
      mensaje.image?.caption ??
      mensaje.document?.caption ??
      mensaje.video?.caption ??
      mensaje.button?.text ??
      mensaje.interactive?.list_reply?.title ??
      "",
    // El id del archivo, cuando viene uno. Solo las imágenes se abren.
    media: mensaje.image?.id ?? null,
    archivo: mensaje.document?.filename ?? null,
    nombre: valor?.contacts?.[0]?.profile?.name ?? null,
  };
};
