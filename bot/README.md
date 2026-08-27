# Bot de WhatsApp

Contesta preguntas frecuentes, califica al cliente mientras platica con él, y te
pasa el chat cuando vale la pena que entres tú.

```
api/whatsapp.js       el endpoint que llama Meta
bot/config.js         ← tus datos (el único archivo que editas)
bot/prompt.js         arma las instrucciones a partir del config
bot/agente.js         el ciclo con Claude y sus dos herramientas
bot/whatsapp.js       enviar, firmar y leer los mensajes de Meta
bot/store.js          memoria de cada conversación
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

Por conversación de unos 8 mensajes, que son ~10 peticiones a la API:

| Modelo | Por conversación | 100 conv/mes | 500 conv/mes |
|---|---|---|---|
| Opus 5 | $0.12 – $0.21 | $12 – $21 | $59 – $103 |
| Sonnet 5 | $0.05 – $0.08 | $5 – $8 | $24 – $41 |
| Haiku 4.5 | $0.014 – $0.031 | $1.40 – $3.10 | $7 – $16 |

El rango es por el cacheo del prompt: el extremo barato es con caché caliente
(varias conversaciones seguidas dentro de la misma ventana de 5 minutos), el
caro es cada conversación empezando en frío. A volumen bajo espera el extremo
caro.

Lo que domina el costo no es la respuesta, es el prompt de sistema: se reenvía
íntegro en cada una de las ~10 peticiones. Un config el doble de largo cuesta
casi el doble.

WhatsApp no cobra las conversaciones que inicia el cliente; Vercel y el KV
entran en el plan gratis.

**Para cambiar de modelo** edita `modelo.id` en `bot/config.js`. Solo esa línea:
`capacidades` en ese mismo archivo se encarga de que la petición se arme con lo
que ese modelo acepta (Haiku 4.5, por ejemplo, devuelve un 400 si le mandas
`effort`). Un modelo que no esté en esa tabla se trata como el mínimo común y
funciona igual.

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
