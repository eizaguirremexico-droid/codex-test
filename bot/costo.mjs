// Estima lo que cuesta el bot con TU config actual.
//
//   node bot/costo.mjs          conversación de 8 mensajes del cliente
//   node bot/costo.mjs 15       de 15 mensajes
//
// Mide el prompt de verdad, así que el número sube conforme llenas config.js.

import { modelo } from "./config.js";
import { sistema } from "./prompt.js";
import { herramientas } from "./agente.js";

// USD por millón de tokens.
const PRECIOS = {
  "claude-opus-5": { entrada: 5, salida: 25, razona: 200 },
  "claude-sonnet-5": { entrada: 2, salida: 10, razona: 200 },
  "claude-haiku-4-5": { entrada: 1, salida: 5, razona: 0 },
};

const SPOT = 16.96;        // USD/MXN, 27 de agosto de 2026
const PRESUPUESTO = 18.0;  // + el spread del banco por cobrarte en dólares

// El español ronda 3.6 caracteres por token. Es una aproximación: para el número
// exacto hay que usar el endpoint count_tokens de la API.
const tokens = (texto) => Math.ceil(texto.length / 3.6);

const MSG_CLIENTE = 35;   // "buenas, cuánto cuesta el servicio X?"
const MSG_BOT = 70;       // tres o cuatro líneas
const VUELTA_TOOL = 180;  // el bloque tool_use + su resultado
const VUELTAS_TOOL = 2;   // registrar_lead y, si acaso, pasar_a_humano

const simular = (mensajesDelCliente, cache) => {
  const prefijo = tokens(sistema) + tokens(JSON.stringify(herramientas));
  const topeHistorial = (modelo.memoria / 2) * (MSG_CLIENTE + MSG_BOT);

  let entrada = 0;
  let salida = 0;
  let historial = 0;
  let peticiones = 0;

  for (let turno = 1; turno <= mensajesDelCliente; turno++) {
    historial = Math.min(historial + MSG_CLIENTE, topeHistorial);

    // Una vuelta de herramienta es una petición extra: el prefijo otra vez.
    const vueltas = turno <= VUELTAS_TOOL ? 2 : 1;
    for (let v = 0; v < vueltas; v++) {
      // El prefijo se cachea; el historial cambia en cada petición y no.
      const costoPrefijo = !cache ? prefijo : peticiones === 0 ? prefijo * 1.25 : prefijo * 0.1;
      entrada += costoPrefijo + historial + v * VUELTA_TOOL;
      salida += (v === 0 && vueltas > 1 ? 60 : MSG_BOT) + PRECIOS[modelo.id].razona;
      peticiones++;
    }

    historial = Math.min(historial + MSG_BOT, topeHistorial);
  }

  const p = PRECIOS[modelo.id];
  return {
    usd: (entrada / 1e6) * p.entrada + (salida / 1e6) * p.salida,
    peticiones,
    prefijo,
  };
};

const n = Number(process.argv[2]) || 8;
const frio = simular(n, false);
const caliente = simular(n, true);

const pesos = (usd, tipo) => "$" + (usd * tipo).toFixed(2);
const mes = (usd, tipo) => "$" + Math.round(usd * tipo).toLocaleString("es-MX");

console.log(`
Modelo: ${modelo.id}
Prompt de sistema + herramientas: ${frio.prefijo} tokens, reenviados en cada petición
Conversación: ${n} mensajes del cliente → ${frio.peticiones} peticiones a la API
`);

if (frio.prefijo < 1024) {
  console.log("⚠️  El prefijo no llega a 1024 tokens, así que el caché nunca entra.");
  console.log("   Con el config lleno de verdad sí entra, y baja el extremo barato.\n");
}

console.log("                     en frío        con caché");
console.log(`por conversación     ${pesos(frio.usd, PRESUPUESTO).padEnd(15)}${pesos(caliente.usd, PRESUPUESTO)}`);
console.log(`100 al mes           ${mes(frio.usd * 100, PRESUPUESTO).padEnd(15)}${mes(caliente.usd * 100, PRESUPUESTO)}`);
console.log(`500 al mes           ${mes(frio.usd * 500, PRESUPUESTO).padEnd(15)}${mes(caliente.usd * 500, PRESUPUESTO)}`);
console.log(`\n(MXN a ${PRESUPUESTO}/USD. Spot de referencia: ${SPOT}. En dólares: $${frio.usd.toFixed(3)} – $${caliente.usd.toFixed(3)} por conversación.)`);
