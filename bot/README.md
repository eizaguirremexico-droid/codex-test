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
bot/leads.mjs         lista los pedidos por cotizar que ha juntado
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

**2. Da de alta el número en Meta, con coexistencia.** En [developers.facebook.com](https://developers.facebook.com)
crea una app de tipo Business, agrega el producto WhatsApp y anota el
`Phone Number ID`. El número de prueba sirve para probar.

Para el número real, **conéctalo con coexistencia** (ver abajo), no migrándolo:
migrar un número lo saca de la app de WhatsApp Business y borra el historial.

**3. Variables de entorno** (en Vercel: Project → Settings → Environment Variables)

| Variable | De dónde sale |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `WHATSAPP_TOKEN` | Token permanente de un usuario de sistema en Meta Business |
| `WHATSAPP_PHONE_NUMBER_ID` | Panel de la app → WhatsApp → API Setup |
| `WHATSAPP_APP_SECRET` | Panel de la app → Configuración → Básica |
| `WHATSAPP_VERIFY_TOKEN` | Lo inventas tú; lo repites al configurar el webhook |
| `KV_REST_API_URL` y `KV_REST_API_TOKEN` | Vercel → Storage → crear KV |

Aquí el KV no es opcional: sin avisos a otro celular, es el único lugar donde
quedan los pedidos por cotizar. Se leen con `node bot/leads.mjs`.

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

Simula 30 casos con las dos APIs interceptadas: firma inválida, reintentos de
Meta, llamada a herramienta, escalamiento, audios, acuses de entrega y el cambio
de modelo, coexistencia y el relevo del humano. No manda un solo mensaje ni
gasta un token.

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

## Coexistencia: el bot y la app en el mismo número

El 55 7217 1088 ya se usa en la app de WhatsApp Business. Hay dos formas de
conectarlo y solo una sirve aquí:

**Migrar (NO hacer esto).** El número sale de la app de WhatsApp Business y ya no
se puede abrir desde el celular. El historial de chats no se transfiere y se
pierde. Es reversible dando de baja el número de la API, pero el historial no
regresa.

**Coexistencia (esto sí).** El mismo número funciona en los dos lados a la vez:
la app sigue igual, con sus chats y sus contactos, y el bot contesta por la API.
Lo que manda el bot aparece en la app.

Con coexistencia el bot se hace a un lado solo: en cuanto contestas a mano desde
la app, Meta manda ese mensaje al webhook (`smb_message_echoes`) y el bot deja de
responder en ese chat por 12 horas. No hay que avisarle nada — escribes y ya.

Lo que se pierde al activar coexistencia:

- Catálogo y las demás herramientas de negocio de la app
- Listas de difusión
- Llamadas de voz y video
- Grupos, mensajes temporales y de una sola vista
- La palomita verde de cuenta oficial y la verificación estándar de negocio

Y hay que **abrir la app al menos una vez cada 13 días** o la cuenta se
desactiva.

De esa lista, la que más suele doler es el **catálogo**. Si lo usas en la app,
esa es la decisión de verdad; el resto rara vez pesa en un negocio de pedidos por
cotización.

## Cómo ves los pedidos, sin avisos a otro número

`escalamiento.whatsappDueno` está vacío a propósito: con coexistencia los chats
se ven igual en la app, así que no hace falta un segundo celular. Dos formas de
no perderte ninguno:

**En la app.** Cuando el bot se hace a un lado, el último mensaje del chat
empieza con 📋. Al abrir WhatsApp Business, los chats que te tocan saltan a la
vista en la lista sin tener que entrar a cada uno.

**Desde la terminal.**

```bash
node bot/leads.mjs        # los últimos 20
node bot/leads.mjs 100    # los últimos 100
```

Salen con los datos ya juntos para cotizar y el `wa.me/` para entrar al chat.

Si algún día quieres el ping en otro celular, pon el número en
`escalamiento.whatsappDueno` y ya. No puede ser el 55 7217 1088: un número no
puede mandarse mensajes a sí mismo.

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
