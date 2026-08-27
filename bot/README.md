# Bot de WhatsApp — Felpuditos

Explica que los stickers se cotizan por pieza, saca los tres datos con los que sí
se puede cotizar (cuántas, de qué tamaño, en qué acabado) y te pasa el chat con
todo junto para que solo mandes el precio.

```
api/whatsapp.js       el endpoint que llama Meta
bot/config.js         ← tus datos (el único archivo que editas)
bot/prompt.js         arma las instrucciones a partir del config
bot/agente.js         el ciclo con Claude y sus dos herramientas
bot/whatsapp.js       enviar, firmar y leer los mensajes de Meta
bot/store.js          memoria de cada conversación
bot/costo.mjs         estima el gasto con tu config
bot/smoke.mjs         prueba local, sin tocar ninguna API real
```

## Qué hace en una conversación

1. Marca el mensaje como leído y muestra «escribiendo…».
2. Responde con lo que esté en `config.js`. Nada más: si no lo sabe, lo escala.
3. Va sacando qué quiere el cliente y para cuándo, sin sonar a formulario.
4. Cuando ya puede decidir, llama a `registrar_lead`. Si califica, te llega el
   aviso a tu WhatsApp con el `wa.me/` para entrar directo.
5. Si pide una persona, se queja, quiere pagar, o pregunta algo fuera de tus
   datos, llama a `pasar_a_humano`: te avisa y se calla en ese chat 12 horas
   para no interrumpirte.

## Montarlo

**1. Llena `bot/config.js`.** Es lo que define si el bot sirve o no. Precios,
horarios, políticas y tus 10 preguntas frecuentes reales — sácalas de tu WhatsApp
de hoy.

**2. Da de alta el número en Meta.** En [developers.facebook.com](https://developers.facebook.com)
crea una app de tipo Business, agrega el producto WhatsApp y anota el
`Phone Number ID`. El número de prueba sirve para probar; para producción hay
que verificar el negocio.

**3. Variables de entorno** (en Vercel: Project → Settings → Environment Variables)

| Variable | De dónde sale |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `WHATSAPP_TOKEN` | Token permanente de un usuario de sistema en Meta Business |
| `WHATSAPP_PHONE_NUMBER_ID` | Panel de la app → WhatsApp → API Setup |
| `WHATSAPP_APP_SECRET` | Panel de la app → Configuración → Básica |
| `WHATSAPP_VERIFY_TOKEN` | Lo inventas tú; lo repites al configurar el webhook |
| `KV_REST_API_URL` y `KV_REST_API_TOKEN` | Vercel → Storage → crear KV |

Sin KV el bot funciona, pero cada arranque en frío olvida todo y vuelve a
preguntar lo mismo. Configúralo antes de dárselo a un cliente real.

**4. Despliega y conecta el webhook.**

```bash
npx vercel --prod
```

En Meta → WhatsApp → Configuration → Webhook:
- Callback URL: `https://TU-DOMINIO.vercel.app/api/whatsapp`
- Verify token: el mismo `WHATSAPP_VERIFY_TOKEN`
- Suscríbete al campo **messages**

## Probarlo sin gastar

```bash
npm install
node bot/smoke.mjs
```

Simula 25 casos con las dos APIs interceptadas: firma inválida, reintentos de
Meta, llamada a herramienta, escalamiento, audios, acuses de entrega y el cambio
de modelo. No manda un solo mensaje ni gasta un token.

## Costo

**Qué cuenta como una conversación:** un cliente escribiendo dentro de la ventana
de 24 horas. Lo que se cobra son los mensajes **del cliente** — cada uno dispara
una petición a la API. Las respuestas del bot no cuentan aparte, van dentro de esa
misma petición.

Con **Haiku 4.5** y el config de Felpuditos ya lleno (2,178 tokens de prompt),
en pesos a 18 MXN/USD:

| Mensajes del cliente | Por conversación | 100 al mes | 500 al mes |
|---|---|---|---|
| 3 — pregunta y se va | $0.11 – $0.24 | $11 – $24 | $55 – $120 |
| 5 — duda resuelta | $0.15 – $0.35 | $15 – $35 | $75 – $175 |
| **8 — con los datos para cotizar** | **$0.21 – $0.52** | **$21 – $52** | **$107 – $260** |
| 12 — cliente platicador | $0.33 – $0.77 | $33 – $77 | $165 – $385 |
| 20 — se alargó | $0.56 – $1.29 | $56 – $129 | $280 – $645 |

Ocho es lo típico: el cliente pregunta el precio, el bot le explica que se cotiza
por pieza, le da una referencia, y de ahí salen cantidad, tamaño y acabado. Un
cliente que solo pregunta el mínimo se va en tres.

El rango es el cacheo: barato con caché caliente (varias conversaciones dentro de
la misma ventana de 5 minutos), caro en frío. A volumen bajo cuenta con el caro.

Con Opus 5 multiplica por ~7; con Sonnet 5, por ~2.7.

### Sácale el número a tu propio config

```bash
node bot/costo.mjs        # conversación de 8 mensajes
node bot/costo.mjs 15     # de 15
```

Mide el prompt real, así que el número **sube conforme creces `config.js`**. Cada
acabado, política o pregunta frecuente que agregues se reenvía en cada petición.
Corre el script después de editarlo.

Lo que domina no es la respuesta, es el prompt de sistema: se reenvía íntegro en
cada petición. Ahí es donde recortar si quieres bajar el costo.

WhatsApp no cobra las conversaciones que inicia el cliente; Vercel y el KV entran
en el plan gratis. Anthropic te factura en dólares.

**Para cambiar de modelo** edita `modelo.id` en `bot/config.js`. Solo esa línea:
`capacidades` en ese mismo archivo se encarga de que la petición se arme con lo
que ese modelo acepta (Haiku 4.5, por ejemplo, devuelve un 400 si le mandas
`effort`). Un modelo que no esté en esa tabla se trata como el mínimo común y
funciona igual.

## Lo que el bot NO sabe (y por eso te lo pasa)

No están en `config.js`, así que ante cualquiera de estas el bot escala en vez de
inventar. Si quieres que las conteste solo, agrégalas al config:

- Facturación
- Si diseñan desde cero o solo imprimen lo que el cliente manda
- Devoluciones, reimpresiones o qué pasa si el sticker sale mal
- Troqueles o formas especiales
- Pedidos fuera de México
- Tiempos de producción concretos (a propósito: dependen del pedido)
- Cualquier precio que no sea una de las cuatro referencias de 100 piezas

## Cosas que conviene saber

- **La respuesta se genera antes de contestarle a Meta.** Tarda entre 2 y 5
  segundos, que está dentro de lo que Meta tolera. Si algún día se pone lento,
  el siguiente paso es `waitUntil` de `@vercel/functions`: contestas 200 al
  instante y procesas después.
- **La ventana de 24 horas.** WhatsApp solo te deja escribir libremente dentro de
  las 24 horas siguientes al último mensaje del cliente. Por eso la memoria
  caduca justo a las 24 horas: pasada la ventana, esa conversación ya no existe.
- **Los leads se guardan en KV** bajo la llave `wa:leads`. El aviso a tu WhatsApp
  es el canal principal; la lista es el respaldo.
- **Todo webhook se responde con 200**, incluso si algo truena por dentro. Si
  devolvieras un error, Meta reintentaría el mismo mensaje en bucle.
