# Panel financiero

Webapp personal de finanzas. Sitio estático puro: sin build, sin dependencias,
sin servidor. Todo se calcula en el navegador y nada sale de tu máquina.

```
index.html            estructura de las 5 pantallas
assets/data.js        ← tus cifras (el único archivo que editas)
assets/charts.js      primitivas de gráfica en SVG
assets/app.js         modelo y render
vercel.json           config de despliegue
```

## Desplegar en Vercel

No hay paso de build. Cualquiera de las dos formas:

**Desde el dashboard** — importa el repo en [vercel.com/new](https://vercel.com/new),
elige **Framework Preset: Other**, deja Build Command y Output Directory vacíos y
dale a Deploy.

**Desde la terminal**

```bash
npx vercel        # preview
npx vercel --prod # producción
```

`vercel.json` ya trae `cleanUrls`, cabeceras de seguridad y `X-Robots-Tag:
noindex` para que el panel no acabe en buscadores.

> **Sobre privacidad:** un deploy de Vercel es público por URL. Tus saldos,
> ingreso y terminaciones de tarjeta quedarían accesibles para quien tenga el
> link. Si lo subes, activa **Vercel Authentication** (Project → Settings →
> Deployment Protection) para que solo tu cuenta pueda entrar.

También funciona con doble clic en `index.html` desde el disco, sin servidor.

## Las 5 pantallas

| Pantalla | Qué responde |
|---|---|
| **Inicio** | Gasto libre disponible (y por día), auto BYD y crédito a mamá con su progreso, próximos pagos y gasto libre de los 14 meses |
| **Tarjetas** | Las 4 tarjetas con saldo y línea usada, próximo vencimiento de cada una, y todos los MSI con su avance pago por pago |
| **Fijos** | Tu piso fijo mensual desglosado, suscripciones activas y canceladas, y qué cae en qué día del mes |
| **Metas** | La meta de mudanza con simulador de ahorro mensual, proyección acumulada y qué hay que comprar |
| **Plan** | A dónde va cada peso mes a mes, desglose expandible de los 14 meses, plan de acción y supuestos |

Cada gráfica tiene tooltip al pasar el mouse, y las principales traen su tabla
equivalente con cifras exactas.

## Actualizar tus cifras

Todo vive en `assets/data.js`. Lo demás se recalcula solo: la proyección
mensual, el piso fijo, el ahorro requerido, las gráficas y el plan de acción.

Lo que cambia más seguido:

- `efectivo.ahorro` y `efectivo.asOf` — tu saldo y su fecha de corte
- `tarjetas[].saldo` / `.disponible` / `.proximoPago` — cambian cada ciclo
- `msi[]` — una entrada por compra a meses. `desde` y `hasta` son el mes del
  primer y del último pago **que faltan** (`"AAAA-MM"`); `pagados` y `total`
  son el avance del plan completo. Al terminarse una, bórrala
- `fechasClave[]` — el calendario de vencimientos

Las fechas de "hoy" (días que faltan, progreso de pagos, periodo en curso) se
calculan contra el reloj del navegador, así que el panel se mantiene solo.

## Supuestos que conviene revisar

- El **Amazon MSI de la Amex Gold de servicios** ($504.95/mes) está proyectado
  hasta septiembre 2027 porque no se conocen las parcialidades restantes. Es el
  supuesto más frágil del modelo — aparece marcado como «estimado» en la app.
- El **piso fijo** calculado por componentes da $14,661.49 (noviembre 2026, ya
  sin el crédito a mamá). El resumen original decía $14,861.49; la diferencia de
  $200 parece un colchón sobre el Tag Pase. Aquí se usa el cálculo por
  componentes.
- La **anualidad de Amex** está estimada en $9,000; el rango real con IVA va de
  $9,000 a $10,440.
- La proyección asume ingreso constante de $35,000 al mes y **ningún gasto nuevo
  a meses**.

## Accesibilidad

Tema claro y oscuro (respeta la preferencia del sistema y recuerda tu elección).
La paleta de las series está validada para daltonismo en ambos temas: ΔE ≥ 8 en
pares adyacentes bajo simulación CVD, ΔE ≥ 15 en visión normal. Ninguna cifra
depende del color — todo está también en leyenda, etiquetas directas, tooltip y
tabla.
