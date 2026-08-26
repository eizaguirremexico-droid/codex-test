// Memoria de las conversaciones, por número de teléfono.
//
// Si defines KV_REST_API_URL y KV_REST_API_TOKEN (Vercel KV / Upstash Redis),
// usa eso. Si no, cae a memoria del proceso: sirve para probar, pero cada
// invocación fría de la función arranca en blanco y el bot repite preguntas.
// En producción configura KV.

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
export const persistente = Boolean(url && token);

const local = new Map();

const redis = async (comando) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(comando),
  });
  if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
};

const vigente = (entrada) => entrada && (!entrada.expira || entrada.expira > Date.now());

export const get = async (clave) => {
  if (!persistente) {
    const entrada = local.get(clave);
    if (!vigente(entrada)) {
      local.delete(clave);
      return null;
    }
    return entrada.valor;
  }
  const crudo = await redis(["GET", clave]);
  return crudo ? JSON.parse(crudo) : null;
};

export const set = async (clave, valor, segundos) => {
  if (!persistente) {
    local.set(clave, { valor, expira: segundos ? Date.now() + segundos * 1000 : null });
    return;
  }
  const comando = ["SET", clave, JSON.stringify(valor)];
  if (segundos) comando.push("EX", String(segundos));
  await redis(comando);
};

// Devuelve true la primera vez que ve esta clave. Meta reintenta los webhooks,
// y sin esto el cliente recibe la misma respuesta dos o tres veces.
export const primeraVez = async (clave, segundos = 3600) => {
  if (!persistente) {
    if (vigente(local.get(clave))) return false;
    local.set(clave, { valor: 1, expira: Date.now() + segundos * 1000 });
    return true;
  }
  return (await redis(["SET", clave, "1", "NX", "EX", String(segundos)])) === "OK";
};

export const guardarLead = async (lead) => {
  if (!persistente) return;
  await redis(["RPUSH", "wa:leads", JSON.stringify(lead)]);
};
