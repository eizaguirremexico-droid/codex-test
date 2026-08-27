// Platica con el bot desde la terminal, como si fueras un cliente.
// No toca WhatsApp: no manda mensajes, no necesita Meta, no necesita Vercel.
// Es exactamente el mismo código que va a correr en producción.
//
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node bot/chat.mjs
//
//   /nuevo   empieza una conversación desde cero
//   /salir   termina

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { modelo, negocio } from "./config.js";
import { responder } from "./agente.js";
import { persistente } from "./store.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(`
Falta la llave de Anthropic.

1. Entra a console.anthropic.com y crea una cuenta
2. Ve a API Keys → Create Key y cópiala
3. Corre esto en la terminal:

   export ANTHROPIC_API_KEY=sk-ant-...
   node bot/chat.mjs

Una plática de prueba cuesta centavos.
`);
  process.exit(1);
}

// Los precios que cobra Anthropic, en dólares por millón de tokens.
const PRECIOS = {
  "claude-opus-5": { entrada: 5, salida: 25 },
  "claude-sonnet-5": { entrada: 2, salida: 10 },
  "claude-haiku-4-5": { entrada: 1, salida: 5 },
};
const MXN = 18;

const gasto = (uso) => {
  const p = PRECIOS[modelo.id] ?? { entrada: 0, salida: 0 };
  const entrada = uso.entrada + uso.cacheEscrito * 1.25 + uso.cacheLeido * 0.1;
  return ((entrada / 1e6) * p.entrada + (uso.salida / 1e6) * p.salida) * MXN;
};

const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const verde = (t) => `\x1b[32m${t}\x1b[0m`;

console.log(`
Estás escribiéndole a ${negocio.nombre} como si fueras un cliente.
Modelo: ${modelo.id}${persistente ? "" : gris("  ·  memoria solo en este proceso (sin KV)")}

${gris("/nuevo para empezar de cero  ·  /salir para terminar")}
`);

const rl = readline.createInterface({ input: stdin, output: stdout });

// Ctrl+D o entrada por tubería: cierra limpio en vez de quedarse colgado.
const cerrado = new Promise((listo) => rl.on("close", () => listo(null)));
const preguntar = async (prompt) => Promise.race([rl.question(prompt), cerrado]);

// Cada "conversación" es un teléfono distinto para el bot.
let telefono = `521555${Date.now()}`.slice(0, 13);
let acumulado = 0;
let mensajes = 0;

while (true) {
  const entrada = await preguntar("\x1b[1mtú:\x1b[0m ");
  if (entrada === null) break;
  const texto = entrada.trim();
  if (!texto) continue;

  if (texto === "/salir") break;
  if (texto === "/nuevo") {
    telefono = `521555${Date.now()}`.slice(0, 13);
    mensajes = 0;
    console.log(gris("\n— conversación nueva —\n"));
    continue;
  }

  try {
    const { respuesta, escalado, uso } = await responder({
      telefono,
      texto,
      nombre: mensajes === 0 ? "Cliente de prueba" : null,
    });
    mensajes++;
    acumulado += gasto(uso);

    console.log(`\n${verde("bot:")} ${respuesta}`);
    console.log(gris(`     ${escalado ? "· se hizo a un lado, aquí entraría un humano · " : ""}$${acumulado.toFixed(2)} MXN en ${mensajes} mensaje${mensajes === 1 ? "" : "s"}\n`));
  } catch (error) {
    console.error(`\n\x1b[31mtronó:\x1b[0m ${error.message}\n`);
  }
}

rl.close();
console.log(gris(`\nEsta plática costó $${acumulado.toFixed(2)} MXN.\n`));
