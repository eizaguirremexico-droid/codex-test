import crypto from "node:crypto";

process.env.WHATSAPP_APP_SECRET = "secreto";
process.env.WHATSAPP_VERIFY_TOKEN = "verifica";
process.env.WHATSAPP_TOKEN = "token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
process.env.ANTHROPIC_API_KEY = "sk-test";

const enviados = [];
let turnos = 0;
let peticionClaude = null;
let cabecerasClaude = null;

const real = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("graph.facebook.com")) {
    enviados.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
  }
  if (u.includes("api.anthropic.com")) {
    turnos++;
    peticionClaude = JSON.parse(init.body);
    cabecerasClaude = new Headers(init.headers);
    const cuerpo = turnos === 1
      ? { content: [{ type: "tool_use", id: "tu_1", name: "registrar_lead", input: { nombre: "Ana", piezas: "100", tamano: "5 cm", acabado: "holográfico clásico", disenos: "2", arte: "ya lo tiene", califica: true, porque: "sabe qué quiere y pasa del mínimo" } }], stop_reason: "tool_use" }
      : { content: [{ type: "text", text: "Claro, te cotizo hoy mismo." }], stop_reason: "end_turn" };
    return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5", usage: { input_tokens: 1, output_tokens: 1 }, ...cuerpo }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  return real(url, init);
};

const { escalamiento, modelo, capacidadesDelModelo } = await import("./config.js");
escalamiento.whatsappDueno = "5215550000000"; // el placeholder trae "X" y el guardia lo bloquea

const { GET, POST } = await import("../api/whatsapp.js");

const post = (payload) => {
  const crudo = JSON.stringify(payload);
  const firma = "sha256=" + crypto.createHmac("sha256", "secreto").update(crudo, "utf8").digest("hex");
  return POST(new Request("https://x/api/whatsapp", { method: "POST", body: crudo, headers: { "x-hub-signature-256": firma } }));
};

const entrante = (id, texto, de = "5215551234567") => ({
  entry: [{ changes: [{ value: { contacts: [{ profile: { name: "Ana" } }], messages: [{ id, from: de, type: "text", text: { body: texto } }] } }] }],
});

const ok = (etiqueta, cond) => console.log(`${cond ? "✅" : "❌"} ${etiqueta}`);

// 1. verificación del webhook
const v = GET(new Request("https://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=reto"));
ok("verificación devuelve el challenge", v.status === 200 && (await v.text()) === "reto");
ok("verificación con token malo da 403",
  GET(new Request("https://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=nel&hub.challenge=reto")).status === 403);

// 2. firma inválida
const mala = await POST(new Request("https://x/api/whatsapp", { method: "POST", body: "{}", headers: { "x-hub-signature-256": "sha256=00" } }));
ok("firma inválida da 401", mala.status === 401);

// 3. conversación normal, con llamada a herramienta
let r = await post(entrante("wamid.1", "hola, cuánto cuesta?"));
ok("responde 200", r.status === 200);
ok("marca leído y escribiendo", enviados.some((m) => m.status === "read" && m.typing_indicator));
ok("contesta al cliente", enviados.some((m) => m.to === "5215551234567" && m.text?.body.includes("cotizo")));
ok("avisa al dueño del pedido por cotizar", enviados.some((m) => m.text?.body.includes("Pedido por cotizar")));
ok("el aviso trae los datos de la cotización", enviados.some((m) =>
  ["100", "5 cm", "holográfico clásico"].every((d) => m.text?.body.includes(d))));

ok("usa el modelo del config", peticionClaude.model === modelo.id);
ok("cachea el prompt de sistema", peticionClaude.system?.[0]?.cache_control?.type === "ephemeral");
ok("declara las dos herramientas", peticionClaude.tools?.length === 2);

// 4. reintento de Meta con el mismo id
const antes = enviados.length;
await post(entrante("wamid.1", "hola, cuánto cuesta?"));
ok("ignora el mensaje repetido", enviados.length === antes);

// 5. palabra de escape
enviados.length = 0;
const turnosAntes = turnos;
await post(entrante("wamid.2", "quiero hablar con un asesor"));
ok("escala sin llamar al modelo", turnos === turnosAntes);
ok("le avisa al dueño", enviados.some((m) => m.text?.body.includes("Te toca entrar")));
ok("le responde al cliente", enviados.some((m) => m.to === "5215551234567" && m.text?.body === escalamiento.mensajeDeTransferencia));

// 6. el bot se calla mientras el humano atiende
enviados.length = 0;
await post(entrante("wamid.3", "sigo esperando"));
ok("no contesta durante la pausa", enviados.length === 0);

// 7. mensaje no textual
enviados.length = 0;
await post({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.4", from: "5215559999999", type: "audio" }] } }] }] });
ok("pide texto ante un audio", enviados.some((m) => m.text?.body.includes("texto")));

// 8. eventos que no son mensajes
enviados.length = 0;
r = await post({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }] } }] }] });
ok("ignora los acuses de entrega", r.status === 200 && enviados.length === 0);

// 9. la petición se arma según lo que acepte cada modelo
const conModelo = async (id, esfuerzo, respaldo, wamid, telefono) => {
  modelo.id = id;
  capacidadesDelModelo.esfuerzo = esfuerzo;
  capacidadesDelModelo.respaldoPorRechazo = respaldo;
  enviados.length = 0;
  turnos = 1; // salta la vuelta de herramienta: aquí solo miramos la petición
  await post(entrante(wamid, "a qué hora abren?", telefono));
};

await conModelo("claude-opus-5", true, true, "wamid.5", "5215557777777");
ok("Opus manda el esfuerzo", peticionClaude.output_config?.effort === "low");
ok("Opus manda el fallback", peticionClaude.fallbacks === "default");
ok("Opus manda la beta", cabecerasClaude.get("anthropic-beta")?.includes("server-side-fallback-2026-07-01"));

await conModelo("claude-haiku-4-5", false, false, "wamid.6", "5215558888888");
ok("Haiku usa el modelo nuevo", peticionClaude.model === "claude-haiku-4-5");
ok("Haiku omite el esfuerzo", peticionClaude.output_config === undefined);
ok("Haiku omite el fallback", peticionClaude.fallbacks === undefined);
ok("Haiku no manda la beta", !cabecerasClaude.get("anthropic-beta")?.includes("server-side-fallback"));
ok("Haiku sigue contestando", enviados.some((m) => m.text?.body.includes("cotizo")));

// 10. coexistencia: el dueño contesta a mano desde la app de WhatsApp Business
modelo.id = "claude-haiku-4-5";
const eco = (id, cliente) => ({
  entry: [{ changes: [{ field: "smb_message_echoes", value: { message_echoes: [{ id, from: "5215572171088", to: cliente, type: "text", text: { body: "yo te cotizo, dame 5" } }] } }] }],
});

enviados.length = 0;
await post(eco("wamid.eco1", "5215551111111"));
await post(entrante("wamid.7", "gracias!", "5215551111111"));
ok("el bot se calla si el dueño ya contestó a mano", enviados.length === 0);

// Un eco de lo que mandó el propio bot no debe callarlo.
enviados.length = 0;
turnos = 1;
await post(entrante("wamid.8", "cuál es el mínimo?", "5215552222222"));
const idPropio = "wamid.out"; // el que devuelve la API falsa al enviar
await post(eco(idPropio, "5215552222222"));
enviados.length = 0;
turnos = 1;
await post(entrante("wamid.9", "y de qué tamaños?", "5215552222222"));
ok("el eco de su propio mensaje no lo calla", enviados.length > 0);

// 11. sin número de avisos, el bot no le escribe a nadie más
escalamiento.whatsappDueno = "";
enviados.length = 0;
turnos = 0;
await post(entrante("wamid.10", "quiero 100 stickers de 5 cm", "5215553333333"));
ok("sin avisos, solo le escribe al cliente",
  enviados.filter((m) => m.text).every((m) => m.to === "5215553333333"));
ok("sin avisos, el cliente sí recibe respuesta",
  enviados.some((m) => m.to === "5215553333333" && m.text));
