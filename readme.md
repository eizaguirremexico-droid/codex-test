# Panel financiero

Dashboard personal de finanzas. Un solo archivo (`index.html`), sin build, sin
dependencias, sin servidor: ábrelo con doble clic y funciona. Todo se calcula en
el navegador y nada sale de tu máquina.

## Qué te muestra

| Sección | Responde |
|---|---|
| **Dónde estás hoy** | Cuánto puedes gastar por día sin romper el plan del periodo en curso |
| **Próximos pagos** | Todo lo que sale (o se aparta) en los próximos ~70 días, en orden |
| **A dónde va cada peso** | Compromisos mensuales por categoría contra tu ingreso, ago 2026 → sep 2027 |
| **Lo que queda** | Dinero libre por mes, partido entre ahorro para la meta y gasto de vida |
| **Runoff de MSI** | Cómo se apaga sola tu carga a meses si no abres MSI nuevos |
| **Tarjetas** | Uso de línea por tarjeta, ciclo de corte y saldo |
| **Meta mudanza** | Simulador: mueve el ahorro mensual y ve si llegas a septiembre 2027 |
| **Plan de acción** | Lo que hay que hacer, ordenado por impacto y no por fecha |

Cada gráfica tiene tooltip al pasar el mouse, y las dos principales tienen su
tabla equivalente con las cifras exactas (botón «Ver tabla»).

## Cómo actualizar tus cifras

Todo vive en un solo objeto al inicio del `<script>` de `index.html`:

```js
const DATA = { ... };   // ← edita solo este bloque
```

Lo demás se recalcula solo: la proyección mensual, el piso fijo, el mínimo de
ahorro requerido, las gráficas y el plan de acción se derivan de ahí.

Lo que se actualiza más seguido:

- `efectivo.ahorro` y `efectivo.asOf` — tu saldo en efectivo y su fecha de corte
- `tarjetas[].saldo` / `.disponible` — cambian todos los días
- `msi[]` — una entrada por compra a meses, con `desde` y `hasta` en formato
  `"AAAA-MM"` (el mes del primer y del último pago). Al terminarse una, bórrala;
  al abrir una nueva, agrégala
- `fechasClave[]` — el calendario de los próximos pagos

## Supuestos que conviene revisar

- El **Amazon MSI de la Amex Gold de servicios** ($504.95/mes) está proyectado
  hasta septiembre 2027 porque no se conocen las parcialidades restantes. Es el
  supuesto más frágil del modelo — está marcado como «estimado» en la tabla.
- El **piso fijo mensual** calculado por componentes da $14,661.49 (noviembre
  2026, ya sin el préstamo). El resumen original decía $14,861.49; la diferencia
  de $200 parece un colchón sobre el Tag Pase. Aquí se usa el cálculo por
  componentes.
- La **anualidad de Amex** está estimada en $9,000; el rango real con IVA va de
  $9,000 a $10,440.
- La proyección asume ingreso constante de $35,000 al mes y **ningún gasto nuevo
  a meses**.

## Accesibilidad

Tema claro y oscuro (botón «Tema», y respeta la preferencia del sistema).
Paleta categórica validada para daltonismo. Ninguna cifra depende del color:
todo está también en leyenda, etiquetas directas, tooltip o tabla.
