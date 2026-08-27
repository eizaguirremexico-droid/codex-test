// Sin número de avisos, los pedidos por cotizar solo quedan guardados.
// Esto los saca a la pantalla.
//
//   node bot/leads.mjs         los últimos 20
//   node bot/leads.mjs 100     los últimos 100
//
// Necesita KV_REST_API_URL y KV_REST_API_TOKEN en el entorno.

import { calificacion } from "./config.js";
import { persistente } from "./store.js";

if (!persistente) {
  console.error("Falta configurar KV_REST_API_URL y KV_REST_API_TOKEN.");
  console.error("Sin eso los leads no se guardan en ningún lado.");
  process.exit(1);
}

const cuantos = Number(process.argv[2]) || 20;

const res = await fetch(process.env.KV_REST_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(["LRANGE", "wa:leads", -cuantos, -1]),
});

if (!res.ok) {
  console.error(`KV ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const leads = ((await res.json()).result ?? []).map((x) => JSON.parse(x)).reverse();

if (leads.length === 0) {
  console.log("Todavía no hay ningún lead registrado.");
  process.exit(0);
}

const fecha = (iso) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

for (const lead of leads) {
  console.log(`\n${lead.califica ? "🟢" : "⚪"} ${lead.nombre || "Sin nombre"} · ${fecha(lead.fecha)}`);
  console.log(`   wa.me/${lead.telefono}`);
  for (const d of calificacion.datos) {
    console.log(`   ${d.campo.padEnd(8)} ${lead[d.campo] || "—"}`);
  }
  console.log(`   ${lead.porque}`);
}

const buenos = leads.filter((l) => l.califica).length;
console.log(`\n${leads.length} en total, ${buenos} que valen la pena.`);
