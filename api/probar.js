// Pantalla de pruebas: platicar con el bot real desde el navegador, sin WhatsApp.
//
// Apagada mientras no exista PROBAR_TOKEN, para que nadie tope con ella por
// accidente y te gaste los créditos. Con el token puesto, la URL es:
//
//   https://tu-dominio.vercel.app/probar#EL-TOKEN
//
// Cuando el bot ya esté en WhatsApp, borra la variable y la puerta se cierra.

import { responder } from "../bot/agente.js";

const autorizado = (request) => {
  const esperado = process.env.PROBAR_TOKEN;
  if (!esperado) return false;
  const dado = request.headers.get("x-probar-token") ?? "";
  // Comparación de largo constante para no filtrar el token a base de medir tiempos.
  if (dado.length !== esperado.length) return false;
  let diferencia = 0;
  for (let i = 0; i < esperado.length; i++) diferencia |= dado.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diferencia === 0;
};

export async function POST(request) {
  if (!autorizado(request)) {
    return new Response(JSON.stringify({ error: "no autorizado" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "cuerpo inválido" }), { status: 400 });
  }

  const texto = String(cuerpo?.texto ?? "").trim().slice(0, 2000);
  // El "teléfono" es solo la llave de la conversación; lo pone el navegador.
  const sesion = String(cuerpo?.sesion ?? "").replace(/\D/g, "").slice(0, 15);
  if (!texto || !sesion) {
    return new Response(JSON.stringify({ error: "falta texto o sesión" }), { status: 400 });
  }

  try {
    const { respuesta, escalado } = await responder({
      telefono: `prueba${sesion}`,
      texto,
      nombre: cuerpo?.nombre ?? null,
    });
    return new Response(JSON.stringify({ respuesta, escalado }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("falló la prueba:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
