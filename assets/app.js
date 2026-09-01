/* ══════════════════════════════════════════════════════════════════════
   Panel financiero — modelo y render.
   Todo se deriva de DATA (assets/data.js). Nada está escrito a mano aquí.
   ══════════════════════════════════════════════════════════════════════ */
"use strict";

/* ─────────────────────────── formato ─────────────────────────── */
const NF0 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const NF2 = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* El signo va ANTES del peso: "$-1,786" se lee como un precio raro, "−$1,786"
   se lee como lo que es. Pasa poco, pero cuando pasa es justo el número que
   más importa leer bien. */
const signo = (v, s) => (v < 0 ? "−$" : "$") + s;
const money  = v => signo(v, NF0.format(Math.abs(Math.round(v))));
const money2 = v => signo(v, NF2.format(Math.abs(v)));

/* número al estilo de la referencia: entero fuerte, decimales atenuados */
function moneyRich(v) {
  const s = NF2.format(Math.abs(v));
  const i = s.lastIndexOf(".");
  /* Mismo criterio que money(): el signo va antes del peso. Aquí se había
     quedado sin arreglar y el número grande de la portada salía "$-696.09". */
  return `${v < 0 ? "−" : ""}$${s.slice(0, i)}<span class="dec">${s.slice(i)}</span>`;
}

const MES  = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESL = ["enero","febrero","marzo","abril","mayo","junio","julio",
              "agosto","septiembre","octubre","noviembre","diciembre"];

/* ─────────────────────────── fechas por mes ─────────────────────────── */
const mKey   = (y, m) => y + "-" + String(m + 1).padStart(2, "0");
const mParse = k => ({ y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 });
const mAdd   = (k, n) => { const { y, m } = mParse(k); const t = y * 12 + m + n; return mKey(Math.floor(t / 12), ((t % 12) + 12) % 12); };
const mDiff  = (a, b) => { const A = mParse(a), B = mParse(b); return (B.y * 12 + B.m) - (A.y * 12 + A.m); };
const mRange = (from, to) => { const out = []; for (let k = from; mDiff(k, to) >= 0; k = mAdd(k, 1)) out.push(k); return out; };
const mLabel = (k, long) => { const { y, m } = mParse(k); return (long ? MESL[m] : MES[m]) + " " + String(y).slice(2); };

const dParse = s => new Date(s + "T12:00:00");
const dLabel = s => { const d = dParse(s); return d.getDate() + " " + MES[d.getMonth()]; };
const dLabelLong = s => { const d = dParse(s); return `${d.getDate()} de ${MESL[d.getMonth()]}`; };
const daysBetween = (a, b) => Math.round((dParse(b) - dParse(a)) / 86400000);
const dAdd = (s, n) => { const d = dParse(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const sum = a => a.reduce((x, y) => x + y, 0);

/* ══════════════════════════════════════════════════════════════════════
   MODELO
   ══════════════════════════════════════════════════════════════════════ */

/* Categorías del flujo mensual. El orden de slots es el mecanismo de
   seguridad para daltonismo — no reordenar sin volver a validar. */
const CATS = [
  { id:"auto",  label:"Auto BYD",         v:"--s1",
    items: () => [{ label: DATA.auto.modelo, monto: DATA.auto.mensualidad }] },
  { id:"mama",  label:"Crédito mamá",     v:"--s2",
    items: k => [{ label: "Pago del mes", monto: mamaMes(k), nota: DATA.prestamoMama.nota }] },
  { id:"msi",   label:"Tarjetas a meses", v:"--s3",
    items: k => msiEnMes(k).map(s => ({ label: `${s.label} · ${s.tarjeta}`, monto: s.monto })) },
  { id:"vida",  label:"Vida fija",        v:"--s4",
    items: k => DATA.vidaFija.map(v => ({ label: v.concepto, monto: v.monto, nota: v.detalle }))
      .concat([{ label: "Tag Pase (casetas)", monto: tagMes(k),
                 nota: TAG[k] ? `${TAG[k].dias} días × ${money(OFI.costoCaseta)} de casetas + ${money(TAG[k].comision)} de comisión` : "" }]) },
  { id:"subs",  label:"Suscripciones",    v:"--s5",
    items: () => SUBS_VIGENTES.map(s => ({ label: s.servicio, monto: s.monto, nota: s.tarjeta })) },
  { id:"anual", label:"Anualidad Amex",   v:"--s6",
    items: () => [{ label: "Anualidad diferida a 3 meses", monto: DATA.anualidadAmex.mensualidad }] }
];

/* ─── días de oficina ───
   El patrón alterna semana A / semana B desde el lunes ancla y se repite.
   De aquí sale el gasto del Tag Pase, que por eso cambia mes a mes. */
const OFI = DATA.oficina;

function semanaPatron(fechaISO) {
  const dias = daysBetween(OFI.ancla, fechaISO);
  if (dias < 0) return null;
  return OFI.patron[Math.floor(dias / 7) % OFI.patron.length];
}
function esDiaOficina(fechaISO) {
  const p = semanaPatron(fechaISO);
  return !!p && p.dias.includes(dParse(fechaISO).getDay());
}
function diasOficinaMes(k) {
  const { y, m } = mParse(k);
  const out = [];
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const iso = `${k}-${String(d).padStart(2, "0")}`;
    if (esDiaOficina(iso)) out.push(iso);
  }
  return out;
}
/* ─── simulación del saldo del tag ───
   El saldo se acumula, así que el costo real no es "días × recarga": hay
   que arrastrar el saldo día por día y ver cuándo toca recargar de verdad.
   Se simula desde el primer mes del horizonte para que cada recarga caiga
   en el mes en que de verdad ocurre. */
function simularTag(estrategia, montoRecarga) {
  const est = estrategia || OFI.estrategia;
  const monto = montoRecarga || OFI.montoRecarga;
  const porMes = {};
  let saldo = OFI.saldo.monto;
  const desde = OFI.saldo.fecha;

  /* arranca en el saldo medido: las idas anteriores ya se pagaron, contarlas
     otra vez inventaría recargas que no van a ocurrir */
  mRange(desde.slice(0, 7), DATA.horizonteIngresos.hasta).forEach(k => {
    const dias = diasOficinaMes(k).filter(f => f >= desde);
    let recargas = 0;
    dias.forEach(() => {
      if (est === "cada-dia" || saldo < OFI.costoCaseta) {
        saldo += monto; recargas++;
      }
      saldo -= OFI.costoCaseta;
    });
    porMes[k] = {
      dias: dias.length, recargas,
      casetas: dias.length * OFI.costoCaseta,
      comision: recargas * OFI.comision,
      salida: recargas * (monto + OFI.comision),
      saldoFin: saldo
    };
  });
  return porMes;
}

let TAG = simularTag();
const tagMes = k => (TAG[k] ? TAG[k].salida : 0);

/* Promedio de idas al mes, para repartir la gasolina por ida en vez de por
   día natural: el tanque se gasta yendo a la oficina, no en el calendario. */
const IDAS_MES = (() => {
  const ms = mRange(DATA.horizonte.desde, DATA.horizonte.hasta);
  return sum(ms.map(k => diasOficinaMes(k).length)) / ms.length;
})();
/* Gasolina por ida a la oficina. Cuenta lo declarado por día; lo que sea
   fijo al mes se reparte entre las idas promedio solo si no trae `porDia`.
   Los trayectos de fin de semana no entran: no dependen de ir a la oficina
   y meterlos aquí inflaba el costo de cada ida. */
const GAS_POR_IDA = sum(DATA.vidaFija
  .filter(v => v.porDia && /gasolina/i.test(v.concepto))
  .map(v => v.porDia));

/* Costo del trayecto dentro de una ventana de fechas cualquiera.
   El tag necesita arrastrar el saldo desde el ancla, porque si no
   no se sabe cuántas recargas caen realmente dentro de la ventana. */
function trayectoEntre(desde, hasta) {
  let saldo = OFI.saldo.monto, recargas = 0, idas = 0;
  for (let f = OFI.saldo.fecha; f <= hasta; f = dAdd(f, 1)) {
    if (!esDiaOficina(f)) continue;
    const dentro = f >= desde;
    if (saldo < OFI.costoCaseta) { saldo += OFI.montoRecarga; if (dentro) recargas++; }
    saldo -= OFI.costoCaseta;
    if (dentro) idas++;
  }
  return { idas, recargas,
           tag: recargas * (OFI.montoRecarga + OFI.comision),
           gasolina: idas * GAS_POR_IDA };
}

/* Desglose del efectivo por cuenta. `ahorro` manda; esto solo lo explica.
   Si las cuentas no suman, el desglose está viejo y no se muestra: mejor
   un número sin desglose que un desglose que no cuadra. */
const CUENTAS = (() => {
  const cs = DATA.efectivo.cuentas || [];
  if (cs.length < 2) return cs;
  return Math.abs(sum(cs.map(c => c.monto)) - DATA.efectivo.ahorro) < 0.01 ? cs : [];
})();

/* Un gasto de vida puede ser fijo al mes (`monto`) o por día de oficina
   (`porDia`). La gasolina del commute es de las segundas: con el rol nuevo
   son 11 días y no 14, y eso tiene que moverse solo si el rol vuelve a
   cambiar. Los de `porDia` llevan también un `monto`, que es lo que enseñan
   las pantallas de "cuánto es al mes"; el modelo usa los días. */
const VIDA_BASE   = sum(DATA.vidaFija.filter(x => !x.porDia).map(x => x.monto));
const VIDA_PORDIA = sum(DATA.vidaFija.filter(x =>  x.porDia).map(x => x.porDia));
const vidaMes = k => VIDA_BASE + VIDA_PORDIA * diasOficinaMes(k).length + tagMes(k);
/* Las suscripciones se cobran mes con mes, pero se pueden cancelar: `desde`
   y `hasta` acotan cuáles siguen vivas en cada mes. `SUBS_MES` queda como el
   costo de las vigentes hoy, que es lo que muestran las pantallas de gastos
   fijos; el modelo mensual usa `subsMes(k)`. */
const subsEnMes = k => DATA.suscripciones.filter(s =>
  (!s.desde || mDiff(s.desde, k) >= 0) && (!s.hasta || mDiff(k, s.hasta) >= 0));
const subsMes   = k => sum(subsEnMes(k).map(x => x.monto));
const MESES     = mRange(DATA.horizonte.desde, DATA.horizonte.hasta);

const msiEnMes = k => DATA.msi.filter(s => mDiff(s.desde, k) >= 0 && mDiff(k, s.hasta) >= 0);

/* Los pagos a mamá ya no son un monto fijo: el plan renegociado tiene
   dos pagos grandes y tres chicos, así que se busca por mes. */
const MAMA_POR_MES = {};
/* Se ACUMULA, no se sobrescribe: agosto lleva dos pagos (el 1 y el 30) y
   asignarlos por mes con "=" dejaba solo el último, subestimando el mes
   en $10,659. */
DATA.prestamoMama.pagos.forEach(p => {
  const k = p.fecha.slice(0, 7);
  MAMA_POR_MES[k] = (MAMA_POR_MES[k] || 0) + p.monto;
});
const mamaMes = k => MAMA_POR_MES[k] || 0;

function construirModelo() { return MESES.map(k => {
  const streams = msiEnMes(k);
  const c = {
    auto:  mDiff(DATA.auto.primerPago, k) >= 0 ? DATA.auto.mensualidad : 0,
    mama:  mamaMes(k),
    msi:   sum(streams.map(s => s.monto)),
    vida:  vidaMes(k),
    subs:  subsMes(k),
    anual: DATA.anualidadAmex.meses.includes(k) ? DATA.anualidadAmex.mensualidad : 0
  };
  const total = sum(CATS.map(x => c[x.id]));
  /* Lo que ya se apartó en un mes anterior no vuelve a consumir el ingreso
     de este mes — sin esto, agosto aparecía en ceros por contar dos veces
     la reserva de la Amex que se hizo el 30 de julio. */
  const pre = DATA.prefondeo.filter(p => p.mes === k);
  const prefondeado = Math.min(sum(pre.map(p => p.monto)), total);
  const deEsteIngreso = total - prefondeado;
  return { k, c, total, prefondeado, pre, deEsteIngreso,
           libre: DATA.ingreso.mensual - deEsteIngreso, streams };
}); }

let MODEL   = construirModelo();
let byMonth = Object.fromEntries(MODEL.map(r => [r.k, r]));

/* Piso fijo = primer mes sin crédito a mamá ni anualidad */
const AHORRO_MESES = mRange(DATA.metaMuebles.inicioAhorro, DATA.metaMuebles.fechaLimite);
const REQUERIDO    = DATA.metaMuebles.metaDeclarada / AHORRO_MESES.length;
const REQ_REAL     = DATA.metaMuebles.estimadoRealista[1] / AHORRO_MESES.length;

let PRIMER_MES_LIBRE, PISO_FIJO, CAP_MIN, PLAN_AHORRO, AHORRO_TOTAL;

/* ─── reparto del ahorro ───
   La regla dura es el piso de gasto libre: nunca ahorrar por debajo de él.
   Cada mes puede aportar como mucho lo que le sobre encima del piso, así
   que un ahorro parejo no sirve — noviembre carga el tercer pago a mamá y
   solo da $3,333, mientras que de marzo en adelante sobran $11,594.

   Se reparte por nivelación: se busca un monto igual para todos los meses;
   el que no lo alcanza aporta su tope y su faltante se redistribuye entre
   los demás. Se repite hasta que nadie más queda por debajo. */
function repartirAhorro(meses, meta, piso) {
  const cap = {};
  meses.forEach(k => { cap[k] = Math.max(0, byMonth[k].libre - piso); });
  const plan = {};
  let libres = meses.slice(), restante = meta;

  for (let vuelta = 0; vuelta < meses.length + 1; vuelta++) {
    if (!libres.length) break;
    const parejo = restante / libres.length;
    const topados = libres.filter(k => cap[k] < parejo);
    if (!topados.length) {                       // ya nadie topa: reparto parejo
      libres.forEach(k => { plan[k] = parejo; });
      restante = 0;
      libres = [];
      break;
    }
    topados.forEach(k => { plan[k] = cap[k]; restante -= cap[k]; });
    libres = libres.filter(k => !topados.includes(k));
  }
  meses.forEach(k => { if (plan[k] == null) plan[k] = 0; });
  const total = sum(meses.map(k => plan[k]));
  return { plan, total, capacidad: sum(meses.map(k => cap[k])), cap };
}

/* Cambiar la estrategia del tag mueve el piso fijo, así que hay que
   rehacer el modelo y todo lo que cuelga de él. */
function recalcularModelo() {
  TAG = simularTag();
  MODEL = construirModelo();
  byMonth = Object.fromEntries(MODEL.map(r => [r.k, r]));
  PRIMER_MES_LIBRE = MESES.find(k => !byMonth[k].c.mama && !byMonth[k].c.anual);
  PISO_FIJO = byMonth[PRIMER_MES_LIBRE].total;
  CAP_MIN = Math.min(...AHORRO_MESES.map(k => byMonth[k].libre));

  const r = repartirAhorro(AHORRO_MESES, DATA.metaMuebles.metaDeclarada, PISO_ACTUAL);
  PLAN_AHORRO = r;
  AHORRO_TOTAL = r.total;
  /* el ahorro se descuenta del gasto libre: no es dinero disponible */
  MODEL.forEach(m => {
    m.ahorro = r.plan[m.k] || 0;
    m.libreDespues = m.libre - m.ahorro;
  });
}

let PISO_ACTUAL = DATA.metaMuebles.pisoGastoLibre;
recalcularModelo();

/* ─── hoy ─── */
const HOY = new Date();
const hoyISO = new Date(HOY.getTime() - HOY.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
/* Lo que vas a pagar de suscripciones DE AQUÍ EN ADELANTE. Se mira el mes
   entrante y no el actual: una que se canceló este mes ya se cobró, pero
   anunciarla como gasto fijo mensual sería mentir sobre lo que viene. */
const MES_SIGUIENTE = mAdd(hoyISO.slice(0, 7), 1);
const SUBS_VIGENTES = subsEnMes(MES_SIGUIENTE);
const SUBS_MES = sum(SUBS_VIGENTES.map(x => x.monto));

/* ─── calendario de quincenas ───
   El día 30 no existe en febrero, así que se recorre al último día del mes.
   Cuando la fecha cae en fin de semana se marca: la mayoría de las nóminas
   se adelantan al viernes, pero eso depende del patrón, así que se señala
   como aviso en vez de mover el monto en silencio. */
const DIAS_SEM = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function ultimoDiaMes(k) { const { y, m } = mParse(k); return new Date(y, m + 1, 0).getDate(); }

function construirQuincenas(desdeISO, hastaMes) {
  const out = [];
  mRange(desdeISO.slice(0, 7), hastaMes).forEach(k => {
    DATA.ingreso.diasPago.forEach(d => {
      const dia = Math.min(d, ultimoDiaMes(k));
      const iso = `${k}-${String(dia).padStart(2, "0")}`;
      if (iso < desdeISO) return;
      const dow = dParse(iso).getDay();
      const finDeSemana = dow === 0 || dow === 6;
      let adelanto = null;
      if (finDeSemana) {
        const f = dParse(iso);
        f.setDate(f.getDate() - (dow === 6 ? 1 : 2));
        adelanto = f.toISOString().slice(0, 10);
      }
      out.push({ iso, mes: k, dia, dow, finDeSemana, adelanto,
                 recortado: dia !== d, monto: DATA.ingreso.quincena });
    });
  });
  out.sort((a, b) => (a.iso < b.iso ? -1 : 1));
  let acc = 0;
  out.forEach(q => { acc += q.monto; q.acumulado = acc; });
  return out;
}

/* Las quincenas que ya están dentro del efectivo medido no son ingreso por
   venir: si se dejan, la portada promete otra vez un dinero que ya gastaste.
   Pasa cada vez que la nómina se adelanta por caer en fin de semana. */
const YA_COBRADAS = DATA.efectivo.quincenasCobradas || [];
const QUINCENAS = construirQuincenas(hoyISO, DATA.horizonteIngresos.hasta)
  .filter(q => !YA_COBRADAS.includes(q.iso));
const PROX_QUINCENA = QUINCENAS[0];
const TOTAL_INGRESO = sum(QUINCENAS.map(q => q.monto));

/* ─── ventana de gasto libre ───
   Arranca en tu efectivo de hoy, le suma las quincenas que entran y le
   resta lo que ya está comprometido. Si la próxima quincena ya está
   totalmente gastada (como la del 30 de julio, que se va en el plan), la
   ventana se extiende a la siguiente: ese dinero nunca fue tuyo. */
/* Lo que falta por ejecutar del plan del 30: lo ya pagado sale de la suma
   (el dinero ya salió de la cuenta y el efectivo ya lo refleja). */
const PLAN_PENDIENTE = sum(DATA.planJulio.acciones.filter(a => !a.pagado).map(a => a.monto));
const PLAN_PAGADO    = DATA.planJulio.acciones.filter(a => a.pagado);

/* Salidas ya comprometidas en [desde, hasta]. `hasta` es inclusivo.
   Lo cubierto, reservado o ya pagado no cuenta: ya está fondeado. */
function salidasEntre(desde, hasta) {
  const detalle = [];
  const dentro = f => f >= desde && f <= hasta;
  if (dentro(DATA.planJulio.fecha)) {
    detalle.push({ fecha: DATA.planJulio.fecha, concepto: "Movimiento del 30 de julio",
                   monto: PLAN_PENDIENTE });
  }
  DATA.fechasClave.forEach(f => {
    if (f.tipo === "salida" && dentro(f.fecha)) {
      detalle.push({ fecha: f.fecha, concepto: f.concepto, monto: f.monto });
    }
  });
  return { total: sum(detalle.map(d => d.monto)), detalle };
}

function ventanaLibre() {
  let fin = QUINCENAS[0];
  /* Si la próxima quincena ya se va completa en compromisos, la ventana
     se corre a la siguiente: ese dinero nunca llega a estar disponible. */
  if (QUINCENAS[1] && salidasEntre(hoyISO, fin.iso).total >= fin.monto) fin = QUINCENAS[1];

  /* La ventana cierra el día ANTES de la siguiente quincena: lo que entra
     y lo que sale ese día pertenecen ya al periodo siguiente. */
  const ultimoDia = dAdd(fin.iso, -1);
  const ingresos = QUINCENAS.filter(q => q.iso >= hoyISO && q.iso <= ultimoDia);
  const entra = sum(ingresos.map(q => q.monto));
  const { total: sale, detalle } = salidasEntre(hoyISO, ultimoDia);
  /* El trayecto también sale de este dinero: sin restarlo el número de la
     portada quedaba inflado y no cuadraba con el resto de la app. */
  const tr = trayectoEntre(hoyISO, ultimoDia);
  const trayecto = tr.tag + tr.gasolina;
  const libre = DATA.efectivo.ahorro + entra - sale - trayecto;
  const dias = Math.max(1, daysBetween(hoyISO, fin.iso));
  return { hasta: fin.iso, dias, libre, porDia: libre / dias,
           entra, sale, trayecto, tr, detalle, ingresos, proximaQuincena: fin };
}
const PERIODO = ventanaLibre();


/* progreso de un plan de pagos por fechas */
function progresoFechas(fechas) {
  const hechos = fechas.filter(f => f < hoyISO).length;
  const siguiente = fechas.find(f => f >= hoyISO) || null;
  return { hechos, total: fechas.length, siguiente };
}

/* ══════════════════════════════════════════════════════════════════════
   FLUJO DIARIO DE CAJA
   Día por día: qué entra, qué sale y con cuánto te quedas. Es la única
   vista que ve el problema de TIEMPOS — los pagos se amontonan antes de
   cada quincena del 15, así que el promedio mensual miente.
   ══════════════════════════════════════════════════════════════════════ */
const FL = DATA.flujo;

/* ─── cargos que se GENERAN (no salen de la cuenta ese día) ───
   Un gasto fijo o una parcialidad de MSI no mueve tu saldo el día que
   ocurre: se acumula en la tarjeta y queda fijado el día del corte. Ese
   corte sí es una fecha, y es la que faltaba en el mapa. Va como evento
   de monto cero: informa, pero no toca el saldo. */
const mismaTarjeta = (alias, ref) => alias.startsWith(ref) || ref.startsWith(alias);

/* ─── gasto libre ya hecho ───
   No es compromiso: es la bolsa del mes, ya usada. Se registra con la fecha
   de la compra, pero el efectivo sale el día que vence la tarjeta donde cayó. */
const GASTO_LIBRE = DATA.gastoLibre || [];
const gastadoMes  = k => sum(GASTO_LIBRE.filter(g => g.fecha.slice(0, 7) === k).map(g => g.monto));
const gastoEnCorte = (id, corte) => GASTO_LIBRE.filter(g => {
  if (g.tarjeta !== id) return false;
  /* Si ya se liquidó antes del corte, no llega al estado de cuenta: el corte
     del 22 de agosto salía en $4,593.84 cuando el pago del 11 de septiembre
     es de $2,387.35, porque seguía contando lo que se adelantó el 17. */
  if (g.pagado) return false;
  const c = DATA.tarjetas.find(x => x.id === id);
  const fl = c && flotante(c, g.fecha);
  return fl && fl.corte === corte;
});

function cargosDelCorte(c, k, f) {
  const items = [];
  msiEnMes(k).filter(s => mismaTarjeta(c.alias, s.tarjeta)).forEach(s =>
    items.push({ t: `MSI · ${s.label}`, m: s.monto, msi: true }));
  DATA.vidaFija.filter(v => v.via === c.id).forEach(v =>
    items.push({ t: v.concepto, m: v.monto, n: v.detalle }));
  const subs = subsEnMes(k).filter(s => mismaTarjeta(c.alias, s.tarjeta));
  if (subs.length) items.push({ t: "Suscripciones", m: sum(subs.map(s => s.monto)),
                                n: subs.map(s => s.servicio).join(" + ") });
  /* consumo suelto ya conocido de un ciclo concreto, leído de la app del banco */
  /* `firme`: este consumo es posterior a haber dejado la tarjeta en cero, así
     que un pago previo del ciclo no lo cubre. */
  if (c.consumoCiclo && c.consumoCiclo.corte === f)
    items.push({ t: "Consumo del ciclo", m: c.consumoCiclo.monto,
                 n: c.consumoCiclo.detalle, firme: true });
  const mio = gastoEnCorte(c.id, f);
  if (mio.length) items.push({ t: "Tu gasto", m: sum(mio.map(g => g.monto)),
                               n: mio.map(g => g.concepto).join(" · "), firme: true });
  return items;
}

/* Si antes del corte hay un pago marcado `preCorte` a esa tarjeta, el
   consumo del ciclo ya quedó en cero y solo los MSI llegan al estado de
   cuenta. Eso es justo por lo que el pago del 3 de septiembre es de
   $1,155.58 y no de $3,355.58. */
function cortesDelDia(f) {
  const dia = dParse(f).getDate(), k = f.slice(0, 7);
  return DATA.tarjetas.filter(c => c.corte === dia).map(c => {
    const items = cargosDelCorte(c, k, f);
    if (!items.length) return null;
    /* el ciclo va del corte anterior a este, no del mes calendario */
    const corteAnterior = `${mAdd(k, -1)}-${String(c.corte).padStart(2, "0")}`;
    const dentro = x => x > corteAnterior && x < f;
    /* el consumo del ciclo queda saldado si se dejó la tarjeta en cero dentro
       del ciclo, ya sea por un pago del flujo o porque ya se hizo de hecho */
    const limpio = (c.enCeroHasta && dentro(c.enCeroHasta))
      || FL.pagos.some(p => p.preCorte && p.tarjeta === c.id && dentro(p.fecha));
    items.forEach(i => { i.cubierto = limpio && !i.msi && !i.firme; });
    const queda = sum(items.filter(i => !i.cubierto).map(i => i.m));
    /* si vence antes que el corte, el pago cae el mes siguiente */
    const mesPago = c.vence > c.corte ? k : mAdd(k, 1);
    return { concepto: `Corte ${c.alias}`, monto: 0, cat: "corte",
             cargo: queda, items,
             nota: `no sale dinero hoy · esto lo pagas el ${c.vence} de ${mLabel(mesPago, true)}` };
  }).filter(Boolean);
}

function construirFlujo() {
  /* recargas de tag con el saldo arrastrado desde el ancla */
  const recargas = {};
  let saldoTag = OFI.saldo.monto;
  for (let f = OFI.saldo.fecha; f <= FL.hasta; f = dAdd(f, 1)) {
    if (!esDiaOficina(f)) continue;
    if (saldoTag < OFI.costoCaseta) {
      saldoTag += OFI.montoRecarga;
      recargas[f] = (recargas[f] || 0) + OFI.montoRecarga + OFI.comision;
    }
    saldoTag -= OFI.costoCaseta;
  }

  /* recargas que van a tarjeta: se agrupan en la fecha en que se pagan */
  const t2 = id => DATA.tarjetas.find(x => x.id === id);
  const tarjetaTag = OFI.via && OFI.via !== "debito" ? t2(OFI.via) : null;
  const tagDiferido = {};
  if (tarjetaTag) Object.keys(recargas).forEach(f => {
    const fl = flotante(tarjetaTag, f);
    const cae = fl ? fl.vence : f;
    const g = tagDiferido[cae] = tagDiferido[cae] || { monto: 0, n: 0, fechas: [], supuesto: !!(fl && fl.supuesto) };
    g.monto += recargas[f]; g.n++; g.fechas.push(f);
    delete recargas[f];
  });

  const dias = [];
  let saldo = DATA.efectivo.ahorro;
  for (let f = FL.desde; f <= FL.hasta; f = dAdd(f, 1)) {
    const eventos = [];
    QUINCENAS.filter(q => q.iso === f).forEach(q =>
      eventos.push({ concepto: "Quincena", monto: q.monto, cat: "ingreso" }));
    FL.pagos.filter(p => p.fecha === f).forEach(p =>
      eventos.push({ concepto: p.concepto, monto: -p.monto, cat: p.cat,
                     estimado: p.estimado, nota: p.nota }));
    if (recargas[f]) eventos.push({ concepto: "Recarga de tag", monto: -recargas[f], cat: "tag" });
    /* Si el tag se carga a una tarjeta, el efectivo no sale el día de la
       recarga sino cuando vence esa tarjeta. */
    if (tagDiferido[f]) eventos.push({
      concepto: `Recarga${tagDiferido[f].n > 1 ? "s" : ""} de tag`,
      monto: -tagDiferido[f].monto, cat: "tag", estimado: tagDiferido[f].supuesto,
      nota: `cargada${tagDiferido[f].n > 1 ? "s" : ""} a ${t2(OFI.via).alias} el ${
        tagDiferido[f].fechas.map(x => dLabel(x)).join(" y ")}` });
    const mio = GASTO_LIBRE.filter(g => {
      /* Su tarjeta ya se adelantó: el dinero salió antes y el efectivo
         medido ya lo refleja. Sigue contando como gasto del mes, pero no
         vuelve a salir de la cuenta más adelante. */
      if (g.pagado) return false;
      const c = DATA.tarjetas.find(x => x.id === g.tarjeta);
      const fl = c && flotante(c, g.fecha);
      if ((fl ? fl.vence : g.fecha) !== f) return false;
      /* Si ese día ya hay un pago de esa misma tarjeta, su monto sale del
         estado de cuenta y YA trae este consumo adentro. Sumarlo aparte lo
         cobraba dos veces: septiembre aparecía con $3,419.49 de más. */
      return !FL.pagos.some(p => p.fecha === f && p.tarjeta === g.tarjeta);
    });
    if (mio.length) eventos.push({
      concepto: `Tu gasto de ${mLabel(mio[0].fecha.slice(0, 7), true)}`,
      monto: -sum(mio.map(g => g.monto)), cat: "gasto",
      nota: mio.map(g => g.concepto).join(" · ") });
    cortesDelDia(f).forEach(e => eventos.push(e));

    const entra = sum(eventos.filter(e => e.monto > 0).map(e => e.monto));
    const sale  = -sum(eventos.filter(e => e.monto < 0).map(e => e.monto));
    saldo += entra - sale;
    dias.push({ fecha: f, eventos, entra, sale, saldo,
                oficina: esDiaOficina(f), hoy: f === hoyISO });
  }
  return dias;
}

let FLUJO = construirFlujo();
const flujoMin = () => FLUJO.reduce((a, b) => (b.saldo < a.saldo ? b : a));

/* Resumen por mes: lo que entra, lo que sale y lo que queda libre.
   El gasto libre es bolsa mensual — tú decides cómo repartirlo. */
function resumenMensual() {
  const meses = {};
  FLUJO.forEach(d => {
    const k = d.fecha.slice(0, 7);
    meses[k] = meses[k] || { k, entra: 0, sale: 0, cierre: 0 };
    meses[k].entra += d.entra;
    meses[k].sale += d.sale;
    meses[k].cierre = d.saldo;
  });
  const arr = Object.values(meses);
  arr.forEach((m, i) => {
    m.genera = m.entra - m.sale;             // lo que el mes se paga solo
    /* El colchón solo se cuenta en el PRIMER mes: si se sumara en todos,
       el mismo dinero aparecería disponible dos veces. */
    m.colchon = i === 0 ? DATA.efectivo.ahorro : 0;
    m.disponible = m.colchon + m.genera;
  });
  return arr;
}

/* Tope por quincena: cuánto puedes gastar entre un pago de nómina y el
   siguiente sin romper el colchón. Es la única restricción de tiempos que
   importa — no hace falta presupuesto diario. */
function topesQuincena() {
  /* Las ventanas van de quincena a quincena. La última quincena del
     horizonte no abre ventana: no hay a dónde llegar todavía. */
  const pagos = QUINCENAS.map(q => q.iso).filter(f => f > FL.desde && f < FL.hasta);
  const cortes = [FL.desde, ...pagos, dAdd(FL.hasta, 1)];
  const out = [];
  /* Los topes NO son independientes: lo que gastas en una ventana ya no
     está en la siguiente, así que hay que arrastrar el acumulado. */
  let gastado = 0;
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i], b = dAdd(cortes[i + 1], -1);
    const dentro = FLUJO.filter(d => d.fecha >= a && d.fecha <= b);
    if (!dentro.length) continue;
    const minSaldo = Math.min(...dentro.map(d => d.saldo)) - gastado;
    const tope = Math.max(0, minSaldo - FL.colchonMinimo);
    gastado += tope;
    out.push({ desde: a, hasta: b, dias: dentro.length,
               entra: sum(dentro.map(d => d.entra)),
               sale: sum(dentro.map(d => d.sale)),
               cierre: dentro.at(-1).saldo - gastado, tope });
  }
  return out;
}

/* pagos del auto: 36 mensualidades desde primerPagoFecha */
const AUTO_FECHAS = Array.from({ length: DATA.auto.plazo }, (_, i) => {
  const k = mAdd(DATA.auto.primerPago, i);
  return k + "-" + String(DATA.auto.diaPago).padStart(2, "0");
});
const AUTO_PROG = progresoFechas(AUTO_FECHAS);
const MAMA_FECHAS = DATA.prestamoMama.pagos.map(p => p.fecha);
const MAMA_PROG = progresoFechas(MAMA_FECHAS);

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Inicio
   ══════════════════════════════════════════════════════════════════════ */

function renderTopbar() {
  const n = DATA.meta.nombreCorto;
  document.getElementById("avatar").textContent =
    n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("who-name").textContent = n;
  const h = HOY.getHours();
  document.getElementById("greeting").textContent =
    h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/* La portada muestra LA BOLSA DEL MES, el mismo número que la pantalla de
   Flujo. Antes mostraba la ventana de efectivo hasta la próxima quincena, que
   es otra cosa y con otro monto: como casi todo se carga a tarjeta, esa
   ventana no limita el gasto y tener dos cifras distintas con el mismo
   nombre solo confundía. La ventana de efectivo queda como nota al pie. */
function renderHero() {
  /* El mes en curso, no el primero del horizonte: al cambiar de mes la
     portada seguía enseñando agosto con septiembre ya empezado. */
  const k = MESES.includes(MES_HOY) ? MES_HOY : MESES[0];
  const propio = byMonth[k].libre, ya = gastadoMes(k), queda = propio - ya;
  document.getElementById("hero").innerHTML = `
    <div class="h-label">${ya > 0 ? `Te queda de ${mLabel(k, true)}` : `Para gastar en ${mLabel(k, true)}`}</div>
    <div class="h-value">${moneyRich(queda)}</div>
    <div class="h-chips">
      <span class="h-chip"><span class="k">${mLabel(k, true)} genera</span> <b>${money(propio)}</b></span>
      ${ya > 0 ? `<span class="h-chip"><span class="k">ya gastaste</span> <b>${money(ya)}</b></span>` : ""}
    </div>
    <div class="h-foot">
      Cada mes enseña solo lo suyo. Nada se arrastra al siguiente, para que el
      mismo dinero no aparezca dos veces.
      <br><br>
      ${queda < 0
        ? `${mLabel(k, true)} ya se pasó <b>${money(-queda)}</b> de lo que genera.`
        : ""}
      ${COLCHON_HOY < 0
        ? `Y no hay colchón: vas <b>${money(-COLCHON_HOY)}</b> abajo, o sea que ya estás
           gastando dinero que las tarjetas todavía no te cobran. Nada rebota, pero
           si algo se rompe no hay de dónde.`
        : `${queda < 0 ? "Eso salió de tu colchón, que queda en" : "Aparte traes un colchón de"}
           <b>${money(COLCHON_HOY)}</b>. Es de una sola vez y no se repone: es para
           imprevistos, no para gasto diario.`}
    </div>`;
}

/* Tarjeta de efectivo: qué queda libre y qué está apartado */
function renderEfectivo() {
  const host = document.getElementById("efectivo-card");
  const apartadas = DATA.prefondeo;
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu efectivo</div>
        <div class="card-sub">Al ${dLabelLong(DATA.efectivo.asOf)}</div></div>
    </div>
    <div class="row">
      <div class="row-ic">💵</div>
      <div class="row-main"><div class="row-t">Hoy en tus cuentas</div>
        <div class="row-d">${CUENTAS.length > 1
          ? `repartido en ${CUENTAS.length} cuentas de débito`
          : (PLAN_PAGADO.length
            ? `ya con ${PLAN_PAGADO.length} adelanto${PLAN_PAGADO.length === 1 ? "" : "s"} pagado${PLAN_PAGADO.length === 1 ? "" : "s"}`
            : "antes del movimiento del 30 de julio")}</div></div>
      <div class="row-amt">${money2(DATA.efectivo.ahorro)}</div>
    </div>
    ${CUENTAS.length > 1 ? CUENTAS.map(c => `
      <div class="row sub-row">
        <div class="row-ic">🏦</div>
        <div class="row-main"><div class="row-t">${c.nombre}</div>
          ${c.nota ? `<div class="row-d">${c.nota}</div>` : ""}</div>
        <div class="row-amt">${money2(c.monto)}</div>
      </div>`).join("") : ""}
    ${/* Estas dos filas traían la fecha escrita a mano ("el 30 de julio") y
          se quedaban en $0.00 cuando la ventana ya no las contenía. Ahora
          salen solo si hay algo que mostrar, y con su fecha real. */""}
    ${PERIODO.sale > 0 ? `<div class="row">
      <div class="row-ic">📤</div>
      <div class="row-main"><div class="row-t">Sale antes del ${dLabel(PERIODO.hasta)}</div>
        <div class="row-d">${PERIODO.detalle.map(d => d.concepto).join(" + ")}</div></div>
      <div class="row-amt">−${money2(PERIODO.sale)}</div>
    </div>` : ""}
    ${PERIODO.entra > 0 ? `<div class="row">
      <div class="row-ic">📥</div>
      <div class="row-main"><div class="row-t">Entra el ${dLabel(PERIODO.ingresos[0].iso)}</div>
        <div class="row-d">${PERIODO.ingresos.length > 1 ? `${PERIODO.ingresos.length} quincenas` : "tu quincena"}</div></div>
      <div class="row-amt">+${money2(PERIODO.entra)}</div>
    </div>` : ""}
    <div class="row">
      <div class="row-ic">🚗</div>
      <div class="row-main"><div class="row-t">Tag y gasolina</div>
        <div class="row-d">${PERIODO.tr.idas} idas a la oficina · ${PERIODO.tr.recargas} recargas de tag</div></div>
      <div class="row-amt">−${money2(PERIODO.trayecto)}</div>
    </div>
    <div class="row">
      <div class="row-ic" style="background:var(--tint-1-bg);color:var(--tint-1-ink)">=</div>
      <div class="row-main"><div class="row-t">Te queda para comida y lo demás</div>
        <div class="row-d">para ${PERIODO.dias} días, hasta el ${dLabel(PERIODO.hasta)}</div></div>
      <div class="row-amt">${money2(PERIODO.libre)}</div>
    </div>
    ${apartadas.map(p => `<div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">🔒</div>
      <div class="tx"><b>${money2(p.monto)} apartados para ${mLabel(p.mes, true)}</b> —
        ${p.concepto}, ${p.nota}. Ese dinero ya no cuenta como gasto de
        ${mLabel(p.mes, true)}: se pagó con el ingreso de julio.</div>
    </div>`).join("")}`;
}

function renderCompromisosClave() {
  const host = document.getElementById("compromisos-clave");
  const auto = DATA.auto, mama = DATA.prestamoMama;

  const autoRestantes = auto.plazo - AUTO_PROG.hechos;
  const autoFalta = autoRestantes * auto.mensualidad;
  const autoDias = AUTO_PROG.siguiente ? daysBetween(hoyISO, AUTO_PROG.siguiente) : null;

  /* los pagos ya no son iguales: hay que sumar los que faltan, no multiplicar */
  const mamaPendientes = mama.pagos.filter(x => x.fecha >= hoyISO);
  const mamaFalta = sum(mamaPendientes.map(x => x.monto));
  const mamaProximo = mamaPendientes[0];
  const mamaDias = MAMA_PROG.siguiente ? daysBetween(hoyISO, MAMA_PROG.siguiente) : null;

  host.innerHTML = `
    <div class="tint tint-1">
      <div class="t-top">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.5 5 8h14l2 5.5"/><path d="M3 13.5V18h3v-1.5h12V18h3v-4.5Z"/><circle cx="7" cy="15.5" r=".8" fill="currentColor"/><circle cx="17" cy="15.5" r=".8" fill="currentColor"/></svg>
        <span>Auto BYD</span>
      </div>
      <div class="t-value">${moneyRich(auto.mensualidad)}</div>
      <div class="t-sub">${AUTO_PROG.siguiente
        ? `Próximo pago el ${dLabel(AUTO_PROG.siguiente)}${autoDias != null ? ` · en ${autoDias} días` : ""}`
        : "Liquidado"}</div>
      <div class="t-bar"><i style="width:${(AUTO_PROG.hechos / auto.plazo) * 100}%"></i></div>
      <div class="t-foot"><span>${AUTO_PROG.hechos} de ${auto.plazo} pagos</span><span>faltan ${money(autoFalta)}</span></div>
    </div>

    <div class="tint tint-2">
      <div class="t-top">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.4-7.5-9.6A4.2 4.2 0 0 1 12 8.4a4.2 4.2 0 0 1 7.5 2.5c0 5.2-7.5 9.6-7.5 9.6Z"/></svg>
        <span>Crédito a mamá</span>
      </div>
      <div class="t-value">${moneyRich(mamaProximo ? mamaProximo.monto : 0)}</div>
      <div class="t-sub">${MAMA_PROG.siguiente
        ? `Pago ${MAMA_PROG.hechos + 1} de ${mama.pagos.length} el ${dLabel(MAMA_PROG.siguiente)}${mamaDias != null ? ` · en ${mamaDias} días` : ""}`
        : "Liquidado"}</div>
      <div class="t-bar"><i style="width:${(MAMA_PROG.hechos / mama.pagos.length) * 100}%"></i></div>
      <div class="t-foot"><span>${MAMA_PROG.hechos} de ${mama.pagos.length} pagos</span><span>faltan ${money(mamaFalta)}</span></div>
    </div>`;
}

function renderTip() {
  /* El tip se elige solo: el mes más apretado del horizonte */
  const peor = MODEL.reduce((a, b) => (b.libreDespues < a.libreDespues ? b : a));
  const alivio = MODEL.find(r => mDiff(peor.k, r.k) > 0 && r.libreDespues > peor.libreDespues * 1.4);
  document.getElementById("tip-card").innerHTML = `
    <div class="tip">
      <div class="ic">${peor.libreDespues < PISO_ACTUAL - 1 ? "🔴" : "💡"}</div>
      <div class="tx">
        <b>${mLabel(peor.k, true).replace(/^./, c => c.toUpperCase())} es tu mes más apretado:</b>
        te quedan ${money(peor.libreDespues)} libres${peor.ahorro > 0
          ? `, ya apartando ${money(peor.ahorro)} para la meta` : ""}.
        ${peor.libreDespues >= PISO_ACTUAL - 1
          ? `Aun así cumples tu piso de ${money(PISO_ACTUAL)} todos los meses.`
          : alivio ? `Aguanta hasta ${mLabel(alivio.k, true)}: ahí sube a ${money(alivio.libreDespues)}.` : ""}
      </div>
    </div>`;
}

/* eventos del calendario ordenados */
function eventosCalendario() {
  const items = [];
  DATA.planJulio.acciones.forEach(a => items.push({
    fecha: a.pagado || DATA.planJulio.fecha, concepto: a.concepto, monto: a.monto,
    tipo: a.pagado ? "pagado" : a.tipo,
    nota: a.pagado ? "ya salió de tu cuenta" : (a.nota || "movimiento del 30 de julio")
  }));
  DATA.fechasClave.forEach(f => items.push({ ...f }));
  return items.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

const TIPO_PILL = {
  reserva:   { txt:"apartar",      cls:"warn" },
  reservado: { txt:"ya reservado", cls:"good" },
  cubierto:  { txt:"cubierto",     cls:"good" },
  pagado:    { txt:"pagado",       cls:"good" }
};

function renderProximos(hostId, limite) {
  const host = document.getElementById(hostId);
  let items = eventosCalendario();
  if (limite) items = items.slice(0, limite);

  let html = `<div class="card-head" style="padding-top:12px">
      <div><div class="card-title">Próximos pagos</div>
      <div class="card-sub">${limite ? "Los siguientes " + limite : "Los próximos ~70 días"}</div></div>
    </div>`;
  let ultima = null;
  items.forEach(it => {
    if (it.fecha !== ultima) {
      const dias = daysBetween(hoyISO, it.fecha);
      html += `<div class="day-sep">${dLabelLong(it.fecha)}${
        dias > 0 ? ` · en ${dias} día${dias === 1 ? "" : "s"}` : dias === 0 ? " · hoy" : ""}</div>`;
      ultima = it.fecha;
    }
    const pill = TIPO_PILL[it.tipo];
    html += `<div class="row">
      <div class="row-ic">${it.concepto.includes("mamá") ? "❤️" : it.concepto.includes("auto") ? "🚗" : "💳"}</div>
      <div class="row-main">
        <div class="row-t">${it.concepto}</div>
        ${it.nota ? `<div class="row-d">${it.nota}</div>` : ""}
      </div>
      <div class="row-amt${it.tipo === "salida" ? "" : " soft"}">${money2(it.monto)}
        ${pill ? `<span class="sub">${pill.txt}</span>` : ""}</div>
    </div>`;
  });
  html += `<div style="height:8px"></div>`;
  host.innerHTML = html;
}

/* tira compacta de gasto libre por mes */
function renderLibrePreview() {
  const host = document.getElementById("libre-preview");
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Gasto libre por mes</div>
        <div class="card-sub">Lo que queda después de todos los compromisos</div></div>
    </div>
    <div class="chart-scroll"><div id="libre-preview-chart"></div></div>`;
  drawLibrePreview();
}

function drawLibrePreview() {
  const host = document.getElementById("libre-preview-chart");
  if (!host) return;
  stackedColumns(host, {
    series: [{ id:"libre", label:"Gasto libre", v:"--s1" }],
    rows: MODEL.map(r => ({
      key:r.k, label:mLabel(r.k), tipLabel:mLabel(r.k, true),
      values:{ libre: Math.max(0, r.libreDespues) }, total: Math.max(0, r.libreDespues)
    })),
    height: 190, fmt: money, totalLabel: null, compact: true,
    aria: "Gasto libre mensual después de compromisos, de agosto 2026 a septiembre 2027.",
    tipExtra: row => {
      const r = byMonth[row.key];
      return `<div class="tt-row"><span class="lhs">Comprometido</span><span class="val">${money(r.total)}</span></div>` +
        (r.ahorro > 0 ? `<div class="tt-row"><span class="lhs">Ahorro para la meta</span><span class="val">${money(r.ahorro)}</span></div>` : "");
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Quincenas
   ══════════════════════════════════════════════════════════════════════ */

function renderQuincenaHero() {
  const q = PROX_QUINCENA;
  const dias = daysBetween(hoyISO, q.iso);
  const finMes = DATA.horizonteIngresos.hasta;
  document.getElementById("quincena-hero").innerHTML = `
    <div class="h-label">Tu próxima quincena</div>
    <div class="h-value">${moneyRich(q.monto)}</div>
    <div class="h-chips">
      <span class="h-chip"><span class="k">el</span> <b>${dLabelLong(q.iso)}</b></span>
      <span class="h-chip"><span class="k">${dias === 0 ? "es" : "en"}</span> <b>${
        dias === 0 ? "hoy" : dias + (dias === 1 ? " día" : " días")}</b></span>
      <span class="h-chip"><span class="k">${DIAS_SEM[q.dow]}</span></span>
    </div>
    <div class="h-foot">
      De aquí a ${mLabel(finMes, true)} te caen <b>${QUINCENAS.length} quincenas</b>
      por un total de <b>${money(TOTAL_INGRESO)}</b>.
    </div>`;
}

function renderQuincenaCal() {
  const host = document.getElementById("quincena-cal");
  const porMes = {};
  QUINCENAS.forEach(q => { (porMes[q.mes] = porMes[q.mes] || []).push(q); });

  const cuerpo = Object.keys(porMes).map(k => {
    const qs = porMes[k];
    const subtotal = sum(qs.map(q => q.monto));
    const comp = byMonth[k];
    return `<div class="day-sep" style="display:flex;justify-content:space-between;gap:12px">
        <span style="text-transform:capitalize">${mLabel(k, true)}</span>
        <span>${money(subtotal)}${qs.length === 1 ? " · 1 quincena" : ""}</span>
      </div>
      ${qs.map(q => `<div class="row">
        <div class="row-ic">${q.dia}</div>
        <div class="row-main">
          <div class="row-t">${dLabelLong(q.iso)}</div>
          <div class="row-d">${DIAS_SEM[q.dow]}${
            q.recortado ? " · el mes no llega al 30" : ""}${
            q.finDeSemana ? ` · suele adelantarse al ${dLabel(q.adelanto)}` : ""}</div>
        </div>
        <div class="row-amt">${money2(q.monto)}
          <span class="sub">acum. ${money(q.acumulado)}</span></div>
      </div>`).join("")}
      ${comp ? `<div class="row" style="border-top:none;padding-top:0">
        <div class="row-ic" style="background:transparent"></div>
        <div class="row-main"><div class="row-d">
          Comprometido este mes: ${money(comp.total)} · te queda
          <b style="color:${comp.libre < 3000 ? css("--crit-ink") : css("--good-ink")}">${money(comp.libre)}</b>
        </div></div>
        <div class="row-amt soft"></div>
      </div>` : ""}`;
  }).join("");

  host.innerHTML = `
    <div class="card-head" style="padding-top:12px">
      <div><div class="card-title">Calendario de quincenas</div>
        <div class="card-sub">Día 15 y día 30 · ${money(DATA.ingreso.quincena)} cada una</div></div>
    </div>
    ${cuerpo}
    <div style="height:8px"></div>`;
}

function renderQuincenaResumen() {
  const host = document.getElementById("quincena-resumen");
  const porAnio = {};
  QUINCENAS.forEach(q => {
    const a = q.iso.slice(0, 4);
    porAnio[a] = porAnio[a] || { n: 0, monto: 0 };
    porAnio[a].n++; porAnio[a].monto += q.monto;
  });
  const finesDeSemana = QUINCENAS.filter(q => q.finDeSemana).length;
  const recortadas = QUINCENAS.filter(q => q.recortado);

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Lo que vas a recibir</div>
        <div class="card-sub">De hoy a ${mLabel(DATA.horizonteIngresos.hasta, true)}</div></div>
    </div>
    <div class="readout" style="margin-top:0;padding-top:0;border-top:none">
      ${Object.entries(porAnio).map(([a, v]) =>
        `<div><span class="k">${a} · ${v.n} quincena${v.n === 1 ? "" : "s"}</span>
         <span class="v">${money(v.monto)}</span></div>`).join("")}
      <div style="border-top:1px solid var(--hairline);padding-top:9px">
        <span class="k">Total</span><span class="v">${money(TOTAL_INGRESO)}</span></div>
    </div>
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">📅</div>
      <div class="tx">
        <b>${finesDeSemana} de estas ${QUINCENAS.length} caen en fin de semana.</b>
        La mayoría de las nóminas se adelantan al viernes anterior, pero eso lo
        define tu patrón — aquí se marcan sin mover el monto.
        ${recortadas.length ? `Además, ${recortadas.length === 1 ? "una cae" : recortadas.length + " caen"}
          en meses que no llegan al 30 (${recortadas.map(q => dLabel(q.iso)).join(", ")}).` : ""}
      </div>
    </div>`;
}

const DOW_CORTO = ["L", "M", "M", "J", "V", "S", "D"];       // encabezado del calendario
/* martes y miércoles comparten inicial: fuera del encabezado hay que distinguirlos */
const DOW_CHIP  = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const DOW_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
let mesCal = hoyISO.slice(0, 7);



const ESTRATEGIAS = [
  { id:"cada-dia",     monto:200,  titulo:"Recargo cada día que voy",
    desc:"Por reflejo, aunque me sobre saldo" },
  { id:"cuando-falta", monto:200,  titulo:"Recargo solo cuando no alcanza",
    desc:"Dejo que el saldo se acumule" },
  { id:"cuando-falta", monto:2000, titulo:"Recargo $2,000 cuando no alcanza",
    desc:"Una sola recarga cubre casi 13 viajes" }
];

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Flujo diario
   ══════════════════════════════════════════════════════════════════════ */

const CAT_ICONO = { ingreso:"💵", mama:"❤️", tarjeta:"💳", auto:"🚗", tag:"🛣️", gasto:"🛍️" };

let mesFlujo = null;   // null = el primero de la ventana

/* ─── colchón limpio ───
   El saldo del banco miente en las dos direcciones: trae dinero que ya
   debes (deuda de julio sin pagar) y le falta el gasto de este mes que
   todavía no te cobran. Lo que de verdad traes de antes es el efectivo
   menos todo lo que se debía desde antes de la ventana. */
const DEUDA_PREVIA  = sum(FL.pagos.map(p => p.previo || 0));
/* La medición del banco casi nunca cae el día 1. Si ya trae adentro una
   quincena del mes en curso y ya le salió un compromiso de ese mismo mes,
   sumarle `libre` completo contaría las dos cosas dos veces: el ingreso
   una vez en el saldo y otra en el modelo. Revertirlas devuelve el saldo
   con el que arrancó el mes, que es lo que el devengado espera. */
const PAGADO_YA = sum((DATA.efectivo.compromisosPagados || []).map(p => p.monto));
/* Gasto que salió en efectivo, no con tarjeta: baja el saldo medido Y lo
   cuenta `gastadoMes`. Sin devolverlo al colchón se restaría dos veces. Los
   `pagado` que sí son de una tarjeta no entran aquí: esos ya vienen dentro
   de `compromisosPagados`, que es el adelanto con el que se liquidaron. */
const GASTO_EN_EFECTIVO = sum(GASTO_LIBRE
  .filter(g => g.pagado && !DATA.tarjetas.some(c => c.id === g.tarjeta))
  .map(g => g.monto));
const COLCHON_LIMPIO = DATA.efectivo.ahorro - DEUDA_PREVIA
  - YA_COBRADAS.length * DATA.ingreso.quincena
  + PAGADO_YA + GASTO_EN_EFECTIVO;

/* Cada mes muestra SOLO lo que ese mes genera. Antes se le sumaba el colchón
   y el sobrante de los meses anteriores, y el mismo dinero aparecía en dos
   meses a la vez: septiembre decía $14,059 y octubre volvía a contar lo que
   sobrara de septiembre. Verlo así invita a gastarlo dos veces. El colchón
   existe, pero se lleva aparte (`COLCHON_HOY`), no revuelto con el sueldo. */
function realDelMes(i) {
  const k = MESES.filter(x => byMonth[x])[i];
  return k ? byMonth[k].libre : 0;
}

/* Lo que un mes se pasó de lo que genera. Ese exceso no desaparece: sale del
   colchón, que es dinero de una sola vez. */
const sobregiroMes = k => Math.max(0, gastadoMes(k) - (byMonth[k] ? byMonth[k].libre : 0));
const MES_HOY = hoyISO.slice(0, 7);
const COLCHON_HOY = COLCHON_LIMPIO
  - sum(MESES.filter(k => k <= MES_HOY).map(sobregiroMes));

function renderFlujoHero() {
  const meses = resumenMensual();
  const i = Math.max(0, meses.findIndex(m => m.k === mesFlujo));
  const ago = meses[i];
  const piso = DATA.metaMuebles.pisoGastoLibre;
  /* Solo lo que ESTE mes genera. Sin arrastres: mezclarlos hacía que el
     sobrante de un mes se contara otra vez en el siguiente. */
  const propio = byMonth[ago.k] ? byMonth[ago.k].libre : ago.genera;
  const yaGastado = gastadoMes(ago.k);
  const queda = propio - yaGastado;
  const primero = ago.k === MES_HOY;

  document.getElementById("flujo-hero").innerHTML = `
    <div class="h-label">${yaGastado > 0 ? `Te queda de ${mLabel(ago.k, true)}`
                                          : `Para gastar en ${mLabel(ago.k, true)}`}</div>
    <div class="h-value">${moneyRich(queda)}</div>
    <div class="h-chips">
      <span class="h-chip"><span class="k">${propio < 0 ? `le falta a ${mLabel(ago.k, true)}` : `${mLabel(ago.k, true)} genera`}</span> <b>${money(Math.abs(propio))}</b></span>
      ${yaGastado > 0 ? `<span class="h-chip"><span class="k">ya gastaste</span> <b>${money(yaGastado)}</b></span>` : ""}
    </div>
    <div class="h-tabs">
      ${meses.map(m => `<button type="button" class="h-tab${m.k === ago.k ? " on" : ""}"
        data-mes="${m.k}">${mLabel(m.k, true)}</button>`).join("")}
    </div>
    <div class="h-foot">
      ${queda < 0
        ? `${mLabel(ago.k, true)} ya se pasó <b>${money(-queda)}</b> de lo que genera. Ese exceso
           sale de tu colchón, que queda en <b>${money(COLCHON_HOY)}</b>.`
        : propio >= piso
        ? `Todo esto lo genera ${mLabel(ago.k, true)} con su propio sueldo: van
           ${money(propio - piso)} arriba de tu piso de ${money(piso)}.`
        : `${mLabel(ago.k, true)} genera <b>${money(propio)}</b>, ${money(piso - propio)} por debajo
           de tu piso de ${money(piso)}. Hay que mover un pago de mes o bajar el gasto.`}
      ${primero && queda >= 0
        ? ` Aparte traes un colchón de <b>${money(COLCHON_HOY)}</b>, de una sola vez.` : ""}
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--hero-inset)">
        Tu banco va a decir <b>${money(ago.cierre)}</b> el ${dLabelLong(FLUJO.filter(d =>
          d.fecha.startsWith(ago.k)).at(-1).fecha)}, ${money(ago.cierre - queda)} de más.
        Esa diferencia ya tiene dueño: cuentas que todavía no te cobran${i > 0
          ? ` y lo que hayas gastado con tarjeta y aún no sale`: ""}. No la gastes.
      </div>
    </div>`;

  document.querySelectorAll("#flujo-hero .h-tab").forEach(b =>
    b.addEventListener("click", () => { mesFlujo = b.dataset.mes; renderFlujoHero(); }));
}

/* Bolsa por mes y tope por quincena. Nada de gasto diario. */
/* ─── el método de apartar ───
   Casi todo el gasto va a tarjeta, así que lo que gastas en un mes no sale
   de la cuenta hasta el siguiente. La caja de fin de mes se ve grande justo
   por eso. Apartar ese monto es lo que evita gastarlo dos veces: una al
   cargarlo y otra al verlo todavía en la cuenta. */
/* ─── techo de un mes ───
   Lo máximo que puedes cargar en el mes `k` sin quitarle nada a los que
   siguen: cada mes posterior conserva completo lo que él mismo genera, y
   el saldo nunca baja del colchón. Lo que se carga en un mes se paga el 23
   del siguiente, así que solo se puede calcular cuando esa fecha todavía
   cae dentro de la ventana del flujo. */
function techoMes(k) {
  const meses = resumenMensual();
  const cobro = j => `${mAdd(j, 1)}-23`;
  if (cobro(k) > FL.hasta) return null;
  /* Los demás meses NO se suponen en cero: cada uno carga lo que él mismo
     genera. Si no, el techo de septiembre saldría enorme por dar por hecho
     que agosto no gastó nada. */
  const otros = meses.filter(m => m.k !== k && byMonth[m.k]);
  const saldoCon = (f, S) => {
    let s = FLUJO.find(d => d.fecha === f).saldo;
    if (f >= cobro(k)) s -= S;
    otros.forEach(m => { if (f >= cobro(m.k)) s -= Math.max(0, byMonth[m.k].libre); });
    return s;
  };
  /* al cerrar la ventana hay que poder apartar lo de los meses cuyo cobro
     todavía no cae dentro */
  const pendiente = sum(otros.filter(m => cobro(m.k) > FL.hasta)
                             .map(m => Math.max(0, byMonth[m.k].libre)));
  const ok = S => FLUJO.every(d => saldoCon(d.fecha, S) >= FL.colchonMinimo)
               && saldoCon(FL.hasta, S) - pendiente >= FL.colchonMinimo;
  if (!ok(0)) return null;
  let lo = 0, hi = 200000;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; ok(m) ? lo = m : hi = m; }
  return lo;
}

function renderApartado() {
  const piso = DATA.metaMuebles.pisoGastoLibre;
  const meses = resumenMensual();
  const filas = meses.map((m, i) => {
    /* al cerrar el mes i ya se pagaron los cargos de los meses 0..i−1 */
    const caja = m.cierre - piso * i;
    const genera = byMonth[m.k] ? byMonth[m.k].libre : m.genera;
    return { k: m.k, caja, apartado: piso, libre: caja - piso,
             genera, techo: techoMes(m.k) };
  });
  const ok = filas.every(f => f.libre >= 0);

  document.getElementById("flujo-apartado").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Lo que apartas para el mes que viene</div>
        <div class="card-sub">Si cargas ${money(piso)} al mes a las tarjetas, ese dinero sigue en tu
          cuenta al cerrar el mes pero ya no es tuyo: lo cobran el mes siguiente.</div></div>
    </div>
    ${filas.map(f => `<div class="row">
      <div class="row-ic">🔒</div>
      <div class="row-main">
        <div class="row-t" style="text-transform:capitalize">${mLabel(f.k, true)}</div>
        <div class="row-d">Cierras con ${money(f.caja)} · apartas ${money(f.apartado)} para el mes que sigue</div>
      </div>
      <div class="row-amt">${money(f.libre)}<span class="sub">libre de verdad</span></div>
    </div>`).join("")}
    <div class="day-sep">Hasta dónde puedes estirarte sin quitarle a los meses que siguen</div>
    ${filas.map(f => `<div class="row">
      <div class="row-ic">${f.techo == null ? "·" : f.genera >= piso ? "🟢" : f.genera < 0 ? "🔴" : "🟡"}</div>
      <div class="row-main">
        <div class="row-t" style="text-transform:capitalize">${mLabel(f.k, true)}</div>
        <div class="row-d">${f.techo == null
          ? "necesita el mes siguiente para calcularse"
          : f.genera < 0
          ? `No genera nada: le faltan ${money(-f.genera)} · todo sale del colchón`
          : `Genera ${money(f.genera)} por sí solo · de ahí para arriba sale del colchón`}</div>
      </div>
      <div class="row-amt${f.techo == null ? " soft" : ""}">${f.techo == null ? "—" : money(f.techo)}
        <span class="sub">${f.techo == null ? "sin dato" : "techo"}</span></div>
    </div>`).join("")}
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">${ok ? "✅" : "⚠️"}</div>
      <div class="tx">${ok
        ? `<b>Así se sostiene solo.</b> Cada mes gastas ${money(piso)} con tarjeta, apartas
           ${money(piso)} de la caja, y aun así te sobra. El apartado nunca se toca: sale
           en automático cuando llega el estado de cuenta.`
        : `<b>No alcanza a cubrirse.</b> Con ${money(piso)} de gasto al mes, algún mes cierra
           sin poder apartar lo que se cobra el siguiente. Hay que bajar el gasto o mover un pago.`}
      </div>
    </div>`;
}

function renderFlujoMensual() {
  const meses = resumenMensual();
  const topes = topesQuincena();
  document.getElementById("flujo-mensual").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu bolsa de cada mes</div>
        <div class="card-sub">Lo que entra, lo que se va en pagos, y lo que queda para ti</div></div>
    </div>
    ${meses.map(m => `<div class="mes-bolsa">
      <div class="mb-top">
        <span class="mb-mes">${mLabel(m.k, true)}</span>
        <span class="mb-libre" style="${m.genera < 0 ? `color:${css("--crit-ink")}` : ""}">${money(m.genera)}</span>
      </div>
      <div class="mb-barras">
        <span class="mb-in" style="flex:${m.entra}"></span>
        <span class="mb-out" style="flex:${m.sale}"></span>
      </div>
      <div class="mb-pie">
        <span>entran ${money(m.entra)} · pagos ${money(m.sale)}</span>
        <span>${m.genera < 0 ? "se come colchón" : "genera"}</span>
      </div>
      ${m.colchon ? `<div class="mb-pie" style="margin-top:6px;color:var(--ink-2)">
        <span>+ colchón que traes</span><span>${money(m.colchon)}</span></div>
        <div class="mb-pie" style="font-weight:600;color:var(--ink)">
        <span>= para gastar</span><span>${money(m.disponible)}</span></div>` : ""}
    </div>`).join("")}
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">⚠️</div>
      <div class="tx"><b>Un solo límite que sí importa:</b> cuánto puedes gastar
        entre una quincena y la siguiente. Los pagos grandes caen antes del 15,
        así que esa mitad del mes aguanta menos.</div>
    </div>`;

  document.getElementById("flujo-topes").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tope por quincena</div>
        <div class="card-sub">Solo aplica a lo que pagues en efectivo o débito. Lo que cargas a
          tarjeta no toca estos tramos: sale hasta el mes siguiente.</div></div>
    </div>
    ${topes.map(t => {
      const apretado = t.tope < 3000;
      return `<div class="row">
        <div class="row-ic">${t.dias}d</div>
        <div class="row-main">
          <div class="row-t">${dLabel(t.desde)} → ${dLabel(t.hasta)}</div>
          <div class="row-d">entran ${money(t.entra)} · salen ${money(t.sale)} en pagos</div>
        </div>
        <div class="row-amt" style="${apretado ? `color:${css("--crit-ink")}` : ""}">${money(t.tope)}
          <span class="sub">${apretado ? "tramo apretado" : "en efectivo"}</span></div>
      </div>`;
    }).join("")}`;
}

function renderFlujoCharts() {
  document.getElementById("flujo-saldo").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu saldo, día por día</div>
        <div class="card-sub">Solo pagos comprometidos. Lo que gastes tú va encima de esto.</div></div>
    </div>
    <div class="chart-scroll"><div id="flujo-saldo-chart"></div></div>`;
  document.getElementById("flujo-mov").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Lo que entra y lo que sale</div>
        <div class="card-sub">Arriba del cero entra, abajo sale</div></div>
    </div>
    <div class="chart-scroll"><div id="flujo-mov-chart"></div></div>
    <div class="legend" id="flujo-mov-legend"></div>`;
  drawFlujo();
}

function drawFlujo() {
  const hs = document.getElementById("flujo-saldo-chart");
  const hm = document.getElementById("flujo-mov-chart");
  if (!hs || !hm) return;

  const rows = FLUJO.map(d => ({
    key: d.fecha, label: dLabel(d.fecha), tipLabel: dLabelLong(d.fecha),
    value: Math.max(0, d.saldo),
    extra: `<div class="tt-row"><span class="lhs">Entra</span><span class="val">${money(d.entra)}</span></div>` +
           `<div class="tt-row"><span class="lhs">Sale</span><span class="val">${money(d.sale)}</span></div>` +
           `<div class="tt-row tt-total"><span>Saldo</span><span class="val">${money(d.saldo)}</span></div>`
  }));
  lineChart(hs, { rows, height: 220, fmt: money, porPunto: 4,
    refValue: FL.colchonMinimo, refLabel: "Colchón " + money(FL.colchonMinimo),
    valueLabel: "Saldo", aria: "Saldo diario proyectado del 1 de agosto al 30 de septiembre." });

  divergingBars(hm, {
    rows: FLUJO.map(d => ({
      entra: d.entra, sale: d.sale, hoy: d.hoy,
      tipLabel: dLabelLong(d.fecha),
      etiqueta: d.fecha.endsWith("-01") || d.fecha.endsWith("-15") ? dLabel(d.fecha) : null,
      eventos: d.eventos, saldo: d.saldo
    })),
    height: 190, fmt: money, colorEntra: "--s1", colorSale: "--s2", porBarra: 4,
    aria: "Entradas y salidas por día.",
    tip: r => r.eventos.filter(e => e.monto !== 0).map(e =>
        `<div class="tt-row"><span class="lhs">${CAT_ICONO[e.cat] || "·"} ${e.concepto}</span>` +
        `<span class="val">${money(Math.abs(e.monto))}</span></div>`).join("") +
      `<div class="tt-row tt-total"><span>Saldo</span><span class="val">${money(r.saldo)}</span></div>`
  });
  legend(document.getElementById("flujo-mov-legend"), [
    { label:"Entra", color:css("--s1") }, { label:"Sale", color:css("--s2") }]);
}

/* ─── dónde vive cada gasto fijo ───
   En el mapa solo se ven como salida directa el tag y el auto. El resto
   va a una tarjeta y aparece semanas después metido dentro del pago de
   esa tarjeta, así que hay que decir explícitamente dónde está cada uno. */
function renderFlujoFijos() {
  const t = id => DATA.tarjetas.find(x => x.id === id);
  const desfase = id => {
    const c = t(id);
    if (!c) return "sale en el corte de la que uses";
    /* Una tarjeta sin corte confirmado no puede anunciar un día: la LikeU
       salía como "corte día null". Con el supuesto se dice, y se marca. */
    const corte = c.corte ?? c.corteSupuesto;
    if (corte == null) return `lo pagas el día ${c.vence} · falta su fecha de corte`;
    return `corte día ${corte}${c.corte == null ? " (supuesto)" : ""} · lo pagas el día ${c.vence}`;
  };
  const filas = [
    { concepto: "Auto BYD", monto: DATA.auto.mensualidad, via: "debito",
      donde: "Débito, día 15", cuando: "sale ese mismo día" },
    { concepto: "Tag Pase", monto: tagMes(MESES[0]),
      via: OFI.via === "debito" ? "debito" : OFI.via,
      donde: OFI.via === "debito" ? "Débito, en cada recarga" : t(OFI.via).alias,
      cuando: OFI.via === "debito" ? "sale ese mismo día" : desfase(OFI.via) },
    ...DATA.vidaFija.map(v => ({
      concepto: v.concepto, monto: v.monto, via: v.via,
      donde: v.via === "tarjetas" ? "Repartido entre tarjetas" : t(v.via).alias,
      cuando: desfase(v.via) })),
    { concepto: "Suscripciones", monto: SUBS_MES, via: "elite",
      donde: t("elite").alias, cuando: desfase("elite") }
  ];
  const directo = filas.filter(f => f.via === "debito");
  const enTarjeta = filas.filter(f => f.via !== "debito");

  // Un cargo hecho justo en el corte espera (vence − corte) días; uno hecho justo
  // después del corte anterior espera eso más un ciclo completo.
  const rezagos = DATA.tarjetas
    .filter(c => c.corte != null && c.vence != null)
    .map(c => ((c.vence - c.corte) + 30) % 30);
  const semMin = Math.round(Math.min(...rezagos) / 7);
  const semMax = Math.round((Math.max(...rezagos) + 30) / 7);

  document.getElementById("flujo-fijos").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Dónde están tus gastos fijos</div>
        <div class="card-sub">En el mapa de arriba solo dos salen directo.
          El resto va a una tarjeta y aparece dentro de ese pago, semanas después.</div></div>
    </div>
    <div class="day-sep" style="padding-top:4px">Salen directo de tu cuenta</div>
    ${directo.map(f => `<div class="row">
      <div class="row-ic">${f.concepto.includes("Auto") ? "🚗" : "🛣️"}</div>
      <div class="row-main"><div class="row-t">${f.concepto}</div>
        <div class="row-d">${f.donde} · ${f.cuando}</div></div>
      <div class="row-amt">${money(f.monto)}<span class="sub">al mes</span></div>
    </div>`).join("")}
    <div class="day-sep">Van a una tarjeta · los ves dentro de ese pago</div>
    ${enTarjeta.map(f => `<div class="row">
      <div class="row-ic">💳</div>
      <div class="row-main"><div class="row-t">${f.concepto}</div>
        <div class="row-d">${f.donde} · ${f.cuando}</div></div>
      <div class="row-amt soft">${money(f.monto)}<span class="sub">al mes</span></div>
    </div>`).join("")}
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">💳</div>
      <div class="tx">
        <b>${money(sum(enTarjeta.map(f => f.monto)))} al mes de tus gastos fijos no salen cuando los gastas.</b>
        Se acumulan en la tarjeta y no dejan tu cuenta hasta ${semMin} a ${semMax} semanas después,
        revueltos con lo demás del corte. Por eso un mes se ve holgado y el siguiente no:
        no es que gastes menos, es que la cuenta llega tarde.
      </div>
    </div>`;
}

function renderFlujoCalendario() {
  const host = document.getElementById("flujo-cal");
  let html = `<div class="card-head" style="padding-top:12px">
      <div><div class="card-title">Día por día</div>
        <div class="card-sub">Lo que se mueve y lo que se genera. Tu gasto no va aquí: es bolsa del mes.</div></div>
    </div>`;
  let mes = "";
  FLUJO.filter(d => d.eventos.length).forEach(d => {
    if (d.fecha.slice(0, 7) !== mes) {
      mes = d.fecha.slice(0, 7);
      html += `<div class="day-sep">${mLabel(mes, true)}</div>`;
    }
    html += `<div class="fl-dia${d.hoy ? " hoy" : ""}">
      <div class="fl-fecha"><b>${dParse(d.fecha).getDate()}</b><span>${DOW_CHIP[(dParse(d.fecha).getDay() + 6) % 7]}</span></div>
      <div class="fl-eventos">
        ${d.eventos.map(e => e.cat === "corte" ? `<div class="fl-corte">
          <div class="fl-ev">
            <span class="fl-ic">📄</span>
            <span class="fl-co">${e.concepto}<span class="si-nota">${e.nota}</span></span>
            <span class="fl-mo cargo">${money2(e.cargo)}<span class="fl-mo-sub">se genera</span></span>
          </div>
          <div class="fl-items">${e.items.map(i => `<div class="fl-it${i.cubierto ? " tachado" : ""}">
            <span>${i.t}${i.n ? `<i>${i.n}</i>` : ""}</span><b>${money2(i.m)}</b></div>`).join("")}</div>
        </div>` : `<div class="fl-ev">
          <span class="fl-ic">${CAT_ICONO[e.cat] || "·"}</span>
          <span class="fl-co">${e.concepto}${e.estimado ? ` <span class="chip warn" style="padding:1px 7px">estimado</span>` : ""}
            ${e.nota ? `<span class="si-nota">${e.nota}</span>` : ""}</span>
          <span class="fl-mo ${e.monto > 0 ? "in" : "out"}">${e.monto > 0 ? "+" : "−"}${money2(Math.abs(e.monto))}</span>
        </div>`).join("")}
        <div class="fl-ev fl-cierre">
          <span class="fl-ic"></span>
          <span class="fl-co">Saldo si no gastas nada</span>
          <span class="fl-mo">${money2(d.saldo)}</span>
        </div>
      </div>
    </div>`;
  });
  host.innerHTML = html + `<div style="height:8px"></div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Días de oficina
   ══════════════════════════════════════════════════════════════════════ */

function proximosOficina(n) {
  const out = [];
  let k = hoyISO.slice(0, 7);
  while (out.length < n && mDiff(k, mAdd(hoyISO.slice(0, 7), 6)) >= 0) {
    diasOficinaMes(k).forEach(f => { if (f >= hoyISO && out.length < n) out.push(f); });
    k = mAdd(k, 1);
  }
  return out;
}

function renderOficinaHero() {
  const delMes = diasOficinaMes(mesCal);
  const t = TAG[mesCal] || { dias: delMes.length, casetas: delMes.length * OFI.costoCaseta,
                             comision: 0, salida: delMes.length * OFI.costoCaseta, recargas: 0 };
  const prox = proximosOficina(1)[0];
  const dias = prox ? daysBetween(hoyISO, prox) : null;
  document.getElementById("oficina-hero").innerHTML = `
    <div class="h-label">Tag Pase de ${mLabel(mesCal, true)}</div>
    <div class="h-value">${moneyRich(t.salida)}</div>
    <div class="h-chips">
      <span class="h-chip"><span class="k">días</span> <b>${t.dias}</b></span>
      <span class="h-chip"><span class="k">casetas</span> <b>${money(t.casetas)}</b></span>
      <span class="h-chip"><span class="k">comisión</span> <b>${money(t.comision)}</b></span>
    </div>
    <div class="h-foot">
      ${prox ? `Tu próximo día de oficina es el <b>${dLabelLong(prox)}</b>${
        dias === 0 ? " — hoy" : dias === 1 ? " — mañana" : ` — en ${dias} días`}. ` : ""}
      El viaje cuesta ${money(OFI.costoCaseta)}, pero la recarga es de
      ${money(OFI.montoRecarga)} + ${money(OFI.comision)} de comisión.
    </div>`;
}

function renderOficinaEstrategia() {
  const host = document.getElementById("oficina-estrategia");
  const n = MESES.length;
  const sims = ESTRATEGIAS.map(e => {
    const s = simularTag(e.id, e.monto);
    const ms = MESES.map(k => s[k]);
    return { ...e,
      salida:   sum(ms.map(m => m.salida)) / n,
      comision: sum(ms.map(m => m.comision)) / n,
      saldoFin: s[MESES.at(-1)].saldoFin,
      activa: e.id === OFI.estrategia && e.monto === OFI.montoRecarga };
  });
  const mejor = sims.reduce((a, b) => (b.salida < a.salida ? b : a));
  const peor  = sims.reduce((a, b) => (b.salida > a.salida ? b : a));
  const casetas = sum(MESES.map(k => TAG[k].casetas)) / n;

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Cómo recargas</div>
        <div class="card-sub">El saldo del tag se acumula, no se pierde — por eso importa
          cada cuánto recargas, no cuántos días vas</div></div>
    </div>
    <div class="row">
      <div class="row-ic">🛣️</div>
      <div class="row-main"><div class="row-t">Lo que cuestan las casetas</div>
        <div class="row-d">${money(OFI.costoCaseta)} por viaje · esto no lo cambia nada</div></div>
      <div class="row-amt">${money(casetas)}<span class="sub">al mes</span></div>
    </div>
    ${sims.map(e => `<div class="row">
      <div class="row-ic" ${e.activa ? `style="background:var(--tint-1-bg);color:var(--tint-1-ink)"` : ""}>
        ${e.activa ? "✓" : ""}</div>
      <div class="row-main">
        <div class="row-t">${e.titulo}</div>
        <div class="row-d">${e.desc} · comisión ${money(e.comision)}/mes${
          e.saldoFin > 600 ? ` · deja ${money(e.saldoFin)} atorados en el tag` : ""}</div>
      </div>
      <div class="row-amt"${e.activa ? "" : ' class="row-amt soft"'}>${money(e.salida)}<span class="sub">al mes</span></div>
    </div>`).join("")}
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">💡</div>
      <div class="tx">
        <b>Recargar por reflejo te cuesta ${money(peor.salida - mejor.salida)} al mes de liquidez</b>
        (${money((peor.salida - mejor.salida) * 12)} al año). De eso,
        ${money(peor.comision - mejor.comision)} al mes es pérdida pura por comisiones;
        el resto no se pierde, pero queda estacionado en el tag —
        ${money(peor.saldoFin)} para ${mLabel(MESES.at(-1), true)} — donde no lo puedes usar
        para los muebles.
      </div>
    </div>`;

}
function renderOficinaCal() {
  const host = document.getElementById("oficina-cal");
  const { y, m } = mParse(mesCal);
  const ultimo = new Date(y, m + 1, 0).getDate();
  const primerDow = (new Date(y, m, 1).getDay() + 6) % 7;   // 0 = lunes
  const delMes = diasOficinaMes(mesCal);

  let celdas = "";
  for (let i = 0; i < primerDow; i++) celdas += `<div class="cal-day fuera"></div>`;
  for (let d = 1; d <= ultimo; d++) {
    const iso = `${mesCal}-${String(d).padStart(2, "0")}`;
    const dow = dParse(iso).getDay();
    const clases = [
      "cal-day",
      esDiaOficina(iso) ? "oficina" : (dow === 0 || dow === 6) ? "finde" : "",
      iso < hoyISO ? "pasado" : "",
      iso === hoyISO ? "hoy" : ""
    ].filter(Boolean).join(" ");
    const titulo = esDiaOficina(iso)
      ? `${DOW_LARGO[(dow + 6) % 7]} ${d} · oficina · ${money(OFI.costoCaseta)} de casetas`
      : `${DOW_LARGO[(dow + 6) % 7]} ${d}`;
    celdas += `<div class="${clases}" title="${titulo}">${d}</div>`;
  }

  const hayAnterior = mDiff(OFI.ancla.slice(0, 7), mesCal) > 0;
  host.innerHTML = `
    <div class="cal-nav">
      <div>
        <div class="mes">${mLabel(mesCal, true)}</div>
        <div class="sub">${delMes.length} días de oficina · ${money(TAG[mesCal] ? TAG[mesCal].salida : delMes.length * OFI.costoCaseta)} de Tag</div>
      </div>
      <div class="btns">
        <button class="cal-arrow" id="cal-prev" type="button" aria-label="Mes anterior" ${hayAnterior ? "" : "disabled"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="cal-arrow" id="cal-next" type="button" aria-label="Mes siguiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
    <div class="cal">
      ${DOW_CORTO.map(d => `<div class="cal-dow">${d}</div>`).join("")}
      ${celdas}
    </div>
    <div class="cal-leyenda">
      <span><i style="background:var(--tint-1-bg)"></i> Oficina</span>
      <span><i style="background:var(--card-2)"></i> Casa</span>
      <span><i style="box-shadow:inset 0 0 0 2px var(--ink);background:transparent"></i> Hoy</span>
    </div>`;

  document.getElementById("cal-prev").addEventListener("click", () => {
    if (!hayAnterior) return;
    mesCal = mAdd(mesCal, -1); renderOficinaCal(); renderOficinaHero();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    mesCal = mAdd(mesCal, 1); renderOficinaCal(); renderOficinaHero();
  });
}

function renderOficinaProximos() {
  const prox = proximosOficina(8);
  document.getElementById("oficina-proximos").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tus próximos días</div>
        <div class="card-sub">${money(prox.length * OFI.costoCaseta)} de casetas en las siguientes ${prox.length} idas</div></div>
    </div>
    ${prox.map(f => {
      const dias = daysBetween(hoyISO, f);
      const dow = (dParse(f).getDay() + 6) % 7;
      const pat = semanaPatron(f);
      return `<div class="row">
        <div class="row-ic">${DOW_CHIP[dow]}</div>
        <div class="row-main">
          <div class="row-t">${dLabelLong(f)}</div>
          <div class="row-d">${DOW_LARGO[dow]} · semana ${pat.nombre}${
            dias === 0 ? " · hoy" : dias === 1 ? " · mañana" : ` · en ${dias} días`}</div>
        </div>
        <div class="row-amt">${money(OFI.costoCaseta)}</div>
      </div>`;
    }).join("")}`;
}

function renderOficinaPatron() {
  const host = document.getElementById("oficina-patron");
  const semanaHoy = semanaPatron(hoyISO >= OFI.ancla ? hoyISO : OFI.ancla);
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu patrón</div>
        <div class="card-sub">Dos semanas que se repiten</div></div>
    </div>
    <div class="pat">
      ${OFI.patron.map(p => `<div class="pat-row">
        <div class="pat-tag" ${p.nombre === semanaHoy.nombre ? `style="background:var(--tint-1-bg);color:var(--tint-1-ink)"` : ""}>${p.nombre}</div>
        <div class="pat-dias">${[1,2,3,4,5].map(d =>
          `<i class="${p.dias.includes(d) ? "on" : ""}">${DOW_CHIP[d - 1]}</i>`).join("")}</div>
      </div>`).join("")}
    </div>
    <p class="card-sub" style="margin-top:14px">
      Semana A: ${OFI.patron[0].dias.map(d => DOW_LARGO[d - 1]).join(", ")}.
      Semana B: ${OFI.patron[1].dias.map(d => DOW_LARGO[d - 1]).join(", ")}.
      Siempre son 3 días, así que el costo solo cambia por cómo caen las semanas en el mes.
    </p>`;
}

function renderOficinaCostos() {
  const host = document.getElementById("oficina-costos");
  const filas = MESES.map(k => {
    const t = TAG[k];
    return { key: k, label: mLabel(k), tipLabel: mLabel(k, true),
             values: { tag: t.salida }, total: t.salida,
             dias: t.dias, recargas: t.recargas, casetas: t.casetas, comision: t.comision };
  });
  const promedio = sum(filas.map(f => f.total)) / filas.length;
  const promDias = sum(filas.map(f => f.dias)) / filas.length;
  const promCasetas = sum(filas.map(f => f.casetas)) / filas.length;

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Lo que te cuesta al mes</div>
        <div class="card-sub">${promDias.toFixed(1)} días al mes · ${money(promCasetas)} de casetas + comisiones = ${money(promedio)} al mes</div></div>
    </div>
    <div class="chart-scroll"><div id="oficina-chart"></div></div>
    <div class="btn-row">
      <button class="btn" type="button" id="ofi-tbl-btn" aria-pressed="false" aria-controls="ofi-tbl">Ver tabla</button>
    </div>
    <div class="table-wrap" id="ofi-tbl" hidden>
      <table><caption>Casetas a ${money(OFI.costoCaseta)} por viaje; recargas de ${money(OFI.montoRecarga)} + ${money(OFI.comision)} de comisión, solo cuando el saldo no alcanza.</caption>
      <thead><tr><th>Mes</th><th>Días</th><th>Casetas</th><th>Recargas</th><th>Comisión</th><th>Sale de tu cuenta</th></tr></thead>
      <tbody>${filas.map(f => `<tr><td>${mLabel(f.key, true)}</td><td>${f.dias}</td>
        <td>${money2(f.casetas)}</td><td>${f.recargas}</td><td>${money2(f.comision)}</td>
        <td>${money2(f.total)}</td></tr>`).join("")}
        <tr class="tot"><td>Total</td><td>${sum(filas.map(f => f.dias))}</td>
          <td>${money2(sum(filas.map(f => f.casetas)))}</td>
          <td>${sum(filas.map(f => f.recargas))}</td>
          <td>${money2(sum(filas.map(f => f.comision)))}</td>
          <td>${money2(sum(filas.map(f => f.total)))}</td></tr>
      </tbody></table>
    </div>`;
  drawOficinaChart(filas);
  wireToggle("ofi-tbl-btn", "ofi-tbl");
}

let _filasOfi = null;
function drawOficinaChart(filas) {
  if (filas) _filasOfi = filas;
  const host = document.getElementById("oficina-chart");
  if (!host || !_filasOfi) return;
  stackedColumns(host, {
    series: [{ id: "tag", label: "Tag Pase", v: "--s4" }],
    rows: _filasOfi, height: 200, fmt: money, totalLabel: null, compact: true,
    aria: "Costo mensual del Tag Pase según los días de oficina.",
    tipExtra: row => `<div class="tt-row"><span class="lhs">Días de oficina</span><span class="val">${row.dias}</span></div>`
  });
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Tarjetas
   ══════════════════════════════════════════════════════════════════════ */

/* ─── ¿con cuál pago hoy? ───
   Casi todo el gasto va a crédito, así que la pregunta de cada día no es
   "¿me alcanza?" sino "¿cuál tarjeta me da más días antes de pagar?".
   Una compra cae en el corte que todavía no pasa; de ahí al vencimiento
   es el tiempo que el dinero se queda contigo. */
function flotante(c, f) {
  const dia = c.corte != null ? c.corte : c.corteSupuesto;
  if (dia == null) return null;
  const d = dParse(f);
  const corte = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > dia ? 1 : 0), dia, 12);
  const vence = new Date(corte.getFullYear(), corte.getMonth() + (c.vence <= dia ? 1 : 0), c.vence, 12);
  const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { corte: iso(corte), vence: iso(vence), dias: Math.round((vence - d) / 86400000),
           supuesto: c.corte == null };
}

function renderQueTarjeta() {
  const hoy = hoyISO;
  const filas = DATA.tarjetas.map(c => ({ c, fl: flotante(c, hoy) }));
  const conDato = filas.filter(r => r.fl).sort((a, b) => b.fl.dias - a.fl.dias);
  const mejor = conDato[0];

  /* Si el corte de la mejor tarjeta cae en los próximos días, mañana la
     respuesta cambia — vale la pena decirlo antes de que pase. */
  const proximo = conDato.slice().sort((a, b) => a.fl.corte.localeCompare(b.fl.corte))[0];
  const cambia = proximo && daysBetween(hoy, proximo.fl.corte) <= 3
    ? (() => {
        const tras = DATA.tarjetas.map(c => ({ c, fl: flotante(c, dAdd(proximo.fl.corte, 1)) }))
          .filter(r => r.fl).sort((a, b) => b.fl.dias - a.fl.dias)[0];
        return tras && tras.c.id !== mejor.c.id ? { cuando: proximo.fl.corte, quien: tras } : null;
      })()
    : null;

  const nota = c => {
    if (c.id === "costco") return "la dejas en cero antes de cada corte — si cargas aquí, tienes que volver a limpiarla";
    if (c.tipo === "cargo") return "tarjeta de cargo: se liquida completa, no hay mínimo";
    if (c.corte == null) return "falta la fecha de corte para poder calcularla";
    return `corte día ${c.corte} · vence día ${c.vence}`;
  };

  document.getElementById("que-tarjeta").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">¿Con cuál pago hoy?</div>
        <div class="card-sub">Casi todo lo cargas a crédito. Gana la que tarde más en cobrarte:
          esos días el dinero sigue siendo tuyo.</div></div>
    </div>
    ${conDato.map((r, i) => `<div class="row">
      <div class="row-ic">${i === 0 ? "🥇" : "💳"}</div>
      <div class="row-main">
        <div class="row-t">${r.c.alias}${i === 0 ? ` <span class="chip good" style="padding:1px 8px">usa esta</span>` : ""}</div>
        <div class="row-d">Corta el ${dLabel(r.fl.corte)} · pagas el ${dLabel(r.fl.vence)}<br>${nota(r.c)}</div>
      </div>
      <div class="row-amt${i === 0 ? "" : " soft"}">${r.fl.dias}<span class="sub">días</span></div>
    </div>`).join("")}
    ${filas.filter(r => !r.fl).map(r => `<div class="row">
      <div class="row-ic">❔</div>
      <div class="row-main"><div class="row-t">${r.c.alias}</div>
        <div class="row-d">${nota(r.c)}</div></div>
      <div class="row-amt soft">—<span class="sub">sin dato</span></div>
    </div>`).join("")}
    ${cambia ? `<div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">⏭️</div>
      <div class="tx"><b>Esto cambia el ${dLabel(dAdd(cambia.cuando, 1))}.</b>
        En cuanto pase el corte del ${dLabel(cambia.cuando)}, la que más te conviene pasa a ser
        la ${cambia.quien.c.alias}, con ${cambia.quien.fl.dias} días.</div>
    </div>` : ""}
    <div class="tip" style="margin-top:${cambia ? 12 : 16}px;${cambia ? "" : "padding-top:16px;border-top:1px solid var(--hairline)"}">
      <div class="ic">⚠️</div>
      <div class="tx"><b>Ganar días no es gastar de más.</b>
        Lo que cargues este mes sale de la bolsa del mes que viene, no de la de hoy.
        Tu saldo de hoy se ve sano justo porque el cobro todavía no llega.</div>
    </div>`;
}

function renderCardFaces() {
  const host = document.getElementById("card-faces");
  host.innerHTML = DATA.tarjetas.map(t => {
    const usado = (t.linea != null && t.disponible != null) ? t.linea - t.disponible : null;
    const pct = usado != null ? (usado / t.linea) * 100 : null;
    const dias = t.proximoPago ? daysBetween(hoyISO, t.proximoPago.fecha) : null;
    return `<div class="card-face ${t.tono}">
      <div class="cf-top">
        <div><div class="cf-name">${t.alias}</div><div class="cf-em">${t.emisor}</div></div>
        <div class="cf-term">•••• ${t.term}</div>
      </div>
      <div>
        <div class="cf-lbl">Saldo actual</div>
        <div class="cf-amt">${moneyRich(t.saldo)}</div>
      </div>
      ${pct != null
        ? `<div>
             <div class="cf-track"><i style="width:${Math.max(1.5, Math.min(100, pct)).toFixed(1)}%"></i></div>
             <div class="cf-foot" style="margin-top:6px">
               <span>${money(usado)} de ${money(t.linea)}</span><span>${pct.toFixed(1)}% usado</span>
             </div>
           </div>`
        : `<div class="cf-foot"><span>Tarjeta de cargo · se liquida completa</span><span>sin línea</span></div>`}
      <div class="cf-foot">
        ${t.proximoPago
          ? `<span>Vence ${dLabel(t.proximoPago.fecha)}${dias >= 0 ? ` · en ${dias} d` : ""}</span>
             <span>${money2(t.proximoPago.monto)}</span>`
          : `<span>Sin saldo por pagar</span><span>al corriente</span>`}
      </div>
    </div>`;
  }).join("");
}

function renderPagosTarjetas() {
  const host = document.getElementById("pagos-tarjetas");
  const pagos = DATA.tarjetas.filter(t => t.proximoPago).map(t => ({ t, p: t.proximoPago }))
    .sort((a, b) => (a.p.fecha < b.p.fecha ? -1 : 1));
  const alCorriente = DATA.tarjetas.filter(t => !t.proximoPago);
  const total = sum(pagos.map(x => x.p.monto));

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Pagos a tarjetas</div>
        <div class="card-sub">Siguiente vencimiento de cada una</div></div>
      <span class="chip">${money(total)} en total</span>
    </div>
    ${pagos.map(({ t, p }) => {
      const dias = daysBetween(hoyISO, p.fecha);
      const ciclo = t.corte ? `Corte día ${t.corte} · vence día ${t.vence}` : `Vence día ${t.vence}`;
      return `<div class="row">
        <div class="row-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg></div>
        <div class="row-main">
          <div class="row-t">${t.alias} ·••• ${t.term}</div>
          <div class="row-d">${ciclo}${t.tasa ? ` · ${t.tasa}% anual` : ""}</div>
        </div>
        <div class="row-amt">${money2(p.monto)}
          <span class="sub">${dLabel(p.fecha)}${dias >= 0 ? ` · ${dias} d` : ""}</span></div>
      </div>`;
    }).join("")}
    ${alCorriente.map(t => `<div class="row">
      <div class="row-ic" style="background:var(--tint-3-bg);color:var(--tint-3-ink)">✓</div>
      <div class="row-main"><div class="row-t">${t.alias} ·••• ${t.term}</div>
        <div class="row-d">sin saldo por pagar</div></div>
      <div class="row-amt soft">$0.00</div>
    </div>`).join("")}`;
}

function renderMsiList() {
  const host = document.getElementById("msi-list");
  const totalPendiente = sum(DATA.msi.map(s => s.monto * (mDiff(s.desde, s.hasta) + 1)));
  const mensualHoy = sum(msiEnMes(MESES[0]).map(s => s.monto));

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Meses sin intereses</div>
        <div class="card-sub">${DATA.msi.length} planes activos · ${money(mensualHoy)} al mes ahora</div></div>
      <span class="chip">${money(totalPendiente)} por pagar</span>
    </div>
    ${DATA.msi.map(s => {
      const restantes = mDiff(s.desde, s.hasta) + 1;
      const total = s.total || restantes;
      const pagados = s.pagados != null ? s.pagados : 0;
      const pips = Array.from({ length: total }, (_, i) =>
        `<i class="${i < pagados ? "on" : i === pagados ? "now" : ""}"></i>`).join("");
      return `<div class="msi">
        <div class="msi-top">
          <div>
            <div class="msi-t">${s.label}${s.supuesto ? ` <span class="chip warn" style="padding:2px 8px">estimado</span>` : ""}</div>
            <div class="msi-c">${s.tarjeta}${s.montoOriginal ? ` · compra de ${money(s.montoOriginal)}` : ""}</div>
          </div>
          <div class="msi-a">${money2(s.monto)}</div>
        </div>
        <div class="pips">${pips}</div>
        <div class="msi-foot">
          <span>${s.pagados != null ? `${pagados} de ${total} pagados` : `${restantes} pagos proyectados`}</span>
          <span>termina ${mLabel(s.hasta, true)}</span>
        </div>
        ${s.nota ? `<div class="msi-foot"><span>${s.nota}</span></div>` : ""}
      </div>`;
    }).join("")}`;
}

/* Se deriva de los planes vigentes, no se escribe a mano: una tarjeta nueva
   con MSI dejaba su columna sin serie y la gráfica salía con NaN. El orden
   sigue al de `DATA.msi` para que los colores no bailen entre recargas. */
const MSI_CARDS = [...new Set(DATA.msi.map(s => s.tarjeta))]
  .map((t, i) => ({ id: t, label: t, v: `--s${(i % 6) + 1}` }));

function renderMsiRunoff() {
  const host = document.getElementById("msi-runoff");
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Cómo se apagan solos</div>
        <div class="card-sub">Si no abres ningún MSI nuevo, esta carga se vacía sola</div></div>
    </div>
    <div class="chart-scroll"><div id="msi-runoff-chart"></div></div>
    <div class="legend" id="msi-runoff-legend"></div>
    <div class="btn-row">
      <button class="btn" type="button" id="msi-tbl-btn" aria-pressed="false" aria-controls="msi-tbl">Ver tabla</button>
    </div>
    <div class="table-wrap" id="msi-tbl" hidden></div>`;
  drawMsiRunoff();
  renderMsiTable();
  wireToggle("msi-tbl-btn", "msi-tbl");
}

function drawMsiRunoff() {
  const host = document.getElementById("msi-runoff-chart");
  if (!host) return;
  stackedColumns(host, {
    series: MSI_CARDS,
    rows: MESES.map(k => {
      const values = {}; MSI_CARDS.forEach(c => values[c.id] = 0);
      msiEnMes(k).forEach(s => values[s.tarjeta] += s.monto);
      return { key:k, label:mLabel(k), tipLabel:mLabel(k, true), values, total: sum(Object.values(values)) };
    }),
    height: 230, fmt: money, totalLabel: "MSI del mes",
    aria: "Pago mensual de meses sin intereses por tarjeta, de agosto 2026 a septiembre 2027."
  });
  legend(document.getElementById("msi-runoff-legend"),
    MSI_CARDS.map(c => ({ label:c.label, color:css(c.v) })));
}

function renderMsiTable() {
  const host = document.getElementById("msi-tbl");
  if (!host) return;
  const rows = DATA.msi.map(s => {
    const n = mDiff(s.desde, s.hasta) + 1;
    return `<tr>
      <td>${s.label}${s.supuesto ? " (estimado)" : ""}</td>
      <td style="text-align:left">${s.tarjeta}</td>
      <td>${money2(s.monto)}</td><td>${n}</td>
      <td style="text-align:left">${mLabel(s.hasta, true)}</td>
      <td>${money2(s.monto * n)}</td></tr>`;
  }).join("");
  host.innerHTML = `<table>
    <caption>Planes a meses vigentes al ${dLabelLong(DATA.meta.corte)}.</caption>
    <thead><tr><th>Plan</th><th style="text-align:left">Tarjeta</th><th>Mensualidad</th>
      <th>Pagos que faltan</th><th style="text-align:left">Termina</th><th>Falta pagar</th></tr></thead>
    <tbody>${rows}
      <tr class="tot"><td>Total</td><td></td><td></td><td></td><td></td>
        <td>${money2(sum(DATA.msi.map(s => s.monto * (mDiff(s.desde, s.hasta) + 1))))}</td></tr>
    </tbody></table>`;
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Gastos fijos
   ══════════════════════════════════════════════════════════════════════ */

/* Piso fijo desglosado: auto + vida + suscripciones + MSI que siguen
   vigentes en el primer mes ya sin crédito a mamá. */
function fijosDesglose() {
  const k = PRIMER_MES_LIBRE;
  const items = [
    { label:"Auto BYD", value: DATA.auto.mensualidad, detalle: DATA.auto.modelo },
    ...DATA.vidaFija.map(v => ({ label: v.corto || v.concepto, value: v.monto, detalle: v.detalle })),
    { label: "Tag Pase", value: tagMes(k),
      detalle: TAG[k] ? `${TAG[k].dias} días × ${money(OFI.costoCaseta)} de casetas + ${money(TAG[k].comision)} de comisión` : "" },
    /* varios planes se llaman "Amazon": el nombre de la tarjeta los distingue */
    ...msiEnMes(k).map(s => ({
      label: `${s.label} · ${s.tarjeta.replace("Amex Gold ", "").replace(" Banamex", "")}`,
      value: s.monto, detalle: `MSI en ${s.tarjeta}`
    })),
    { label:"Suscripciones", value: SUBS_MES,
      detalle: SUBS_VIGENTES.map(s => s.servicio).join(" + ") }
  ];
  return items.sort((a, b) => b.value - a.value);
}

function renderFijos() {
  const host = document.getElementById("fijos-chart");
  const items = fijosDesglose();
  const total = sum(items.map(i => i.value));
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu piso fijo mensual</div>
        <div class="card-sub">Desde ${mLabel(PRIMER_MES_LIBRE, true)}, ya sin el crédito a mamá</div></div>
    </div>
    <div style="font-size:30px;font-weight:600;letter-spacing:-.025em;margin-bottom:4px">${moneyRich(total)}</div>
    <div class="card-sub" style="margin-bottom:16px">
      ${Math.round((total / DATA.ingreso.mensual) * 100)}% de tu ingreso ·
      te deja ${money(DATA.ingreso.mensual - total)} libres al mes
    </div>
    <div id="fijos-bars"></div>
    <div class="btn-row">
      <button class="btn" type="button" id="fijos-tbl-btn" aria-pressed="false" aria-controls="fijos-tbl">Ver tabla</button>
    </div>
    <div class="table-wrap" id="fijos-tbl" hidden>
      <table><caption>Piso fijo mensual en ${mLabel(PRIMER_MES_LIBRE, true)}.</caption>
      <thead><tr><th>Concepto</th><th>Al mes</th><th>Al año</th><th>% del piso</th></tr></thead>
      <tbody>${items.map(i => `<tr><td>${i.label}</td><td>${money2(i.value)}</td>
        <td>${money(i.value * 12)}</td><td>${((i.value / total) * 100).toFixed(1)}%</td></tr>`).join("")}
        <tr class="tot"><td>Total</td><td>${money2(total)}</td><td>${money(total * 12)}</td><td>100%</td></tr>
      </tbody></table>
    </div>`;
  drawFijos();
  wireToggle("fijos-tbl-btn", "fijos-tbl");
}

function drawFijos() {
  const host = document.getElementById("fijos-bars");
  if (!host) return;
  barsH(host, {
    rows: fijosDesglose(), fmt: money2, color: "--s1",
    labelW: Math.min(150, Math.max(110, (host.clientWidth || 400) * 0.45)),
    valueLabel: "Al mes",
    aria: "Desglose del piso fijo mensual por concepto."
  });
}

function renderSubs() {
  const host = document.getElementById("subs-card");
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Suscripciones</div>
        <div class="card-sub">${money2(SUBS_MES)} al mes · ${money(SUBS_MES * 12)} al año</div></div>
    </div>
    ${SUBS_VIGENTES.map(s => `<div class="row">
      <div class="row-ic sq">${s.servicio[0]}</div>
      <div class="row-main"><div class="row-t">${s.servicio}</div>
        <div class="row-d">${[s.nota, s.tarjeta].filter(Boolean).join(" · ")}</div></div>
      <div class="row-amt">${money2(s.monto)}</div>
    </div>`).join("")}`;
}

function renderFijosTimeline() {
  const host = document.getElementById("fijos-timeline");
  const cargos = [
    { d: DATA.auto.diaPago, t: "Auto BYD", a: DATA.auto.mensualidad, s: "cargo a débito" },
    { d: 23, t: "Gym FITSI (última hasta dic)", a: 1283.40, s: "MSI 8 de 12 en la Gold Card" },
    { d: 3,  t: "Vence Costco Banamex", a: null, s: "corte el día 13" },
    { d: 11, t: "Vence Amex Gold Servicios", a: null, s: "corte el día 22" },
    { d: 23, t: "Vence Amex Gold Elite", a: null, s: "corte el día 3" }
  ].sort((a, b) => a.d - b.d);

  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu mes típico</div>
        <div class="card-sub">Qué cae en qué día, todos los meses</div></div>
    </div>
    ${cargos.map(c => `<div class="row">
      <div class="row-ic">${c.d}</div>
      <div class="row-main"><div class="row-t">${c.t}</div><div class="row-d">${c.s}</div></div>
      <div class="row-amt${c.a ? "" : " soft"}">${c.a ? money2(c.a) : "—"}</div>
    </div>`).join("")}`;
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Metas
   ══════════════════════════════════════════════════════════════════════ */

const slider = () => document.getElementById("piso-slider");

/* Ahorro acumulado según el plan repartido */
function goalRows() {
  let acc = 0;
  return AHORRO_MESES.map(k => {
    const r = byMonth[k];
    acc += r.ahorro;
    return { key:k, label:mLabel(k), tipLabel:mLabel(k, true), value:acc,
      extra: `<div class="tt-row"><span class="lhs">Ahorras este mes</span><span class="val">${money(r.ahorro)}</span></div>` +
             `<div class="tt-row"><span class="lhs">Te queda libre</span><span class="val">${money(r.libreDespues)}</span></div>` };
  });
}

function renderMetaHero() {
  const m = DATA.metaMuebles;
  const [lo, hi] = m.estimadoRealista;
  const inicioDias = daysBetween(hoyISO, m.inicioAhorro + "-01");
  const alcanza = AHORRO_TOTAL >= m.metaDeclarada - 1;
  document.getElementById("meta-hero").innerHTML = `
    <div class="t-top">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M10 21v-5h4v5"/></svg>
      <span>${m.objetivo}</span>
    </div>
    <div class="t-value">${moneyRich(AHORRO_TOTAL)}</div>
    <div class="t-sub">Juntas esto para ${mLabel(m.fechaLimite, true)} en ${AHORRO_MESES.length} meses,
      sin bajar nunca de ${money(PISO_ACTUAL)} de gasto libre${
      inicioDias > 0 ? ` · arranca en ${inicioDias} días` : ""}</div>
    <div class="t-bar"><i style="width:${clamp(AHORRO_TOTAL / m.metaDeclarada * 100, 0, 100).toFixed(1)}%"></i></div>
    <div class="t-foot">
      <span>Meta declarada ${money(m.metaDeclarada)}</span>
      <span>${alcanza ? "alcanza" : "faltan " + money(m.metaDeclarada - AHORRO_TOTAL)}</span>
    </div>`;
}

/* Control del piso: la regla que manda sobre el ahorro */
function renderMetaSim() {
  document.getElementById("meta-sim").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu regla</div>
        <div class="card-sub">Nunca ahorrar por debajo de este piso de gasto libre.
          El ahorro sale de lo que sobre encima.</div></div>
    </div>
    <div class="slider-head">
      <span class="k">Piso de gasto libre mensual</span>
      <span class="v" id="piso-valor"></span>
    </div>
    <input type="range" id="piso-slider" min="6000" max="16000" step="500"
           aria-label="Piso de gasto libre mensual" value="${PISO_ACTUAL}">
    <div class="meter"><i id="goal-fill" style="width:0%"></i></div>
    <div class="meter-foot"><span id="goal-proj"></span><span id="goal-pct"></span></div>
    <div class="readout" id="goal-readout"></div>`;

  const s = slider();
  s.addEventListener("input", () => {
    PISO_ACTUAL = +s.value;
    recalcularModelo();
    renderMetaHero(); updateMeta(); renderMetaTabla();
    renderMonthList(); drawFlow(); renderLibrePreview();
  });
}

function renderMetaChart() {
  document.getElementById("meta-chart-card").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Ahorro acumulado</div>
        <div class="card-sub">${mLabel(DATA.metaMuebles.inicioAhorro)} → ${mLabel(DATA.metaMuebles.fechaLimite)}</div></div>
    </div>
    <div class="chart-scroll"><div id="meta-chart"></div></div>
    <div class="legend" id="meta-legend"></div>`;
}

/* Calendario de aportaciones mes a mes */
function renderMetaTabla() {
  const host = document.getElementById("meta-tabla");
  if (!host) return;
  let acc = 0;
  const filas = AHORRO_MESES.map(k => {
    const r = byMonth[k]; acc += r.ahorro;
    return { k, r, acc,
      tope: Math.abs(r.ahorro - (r.libre - PISO_ACTUAL)) < 1 && r.ahorro > 0 };
  });
  host.innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Cuánto apartar cada mes</div>
        <div class="card-sub">El día 30, a una cuenta aparte.
          No es parejo: cada mes da lo que puede sin romper el piso.</div></div>
      <span class="chip good">${money(AHORRO_TOTAL)} total</span>
    </div>
    ${filas.map(({ k, r, acc, tope }) => `<div class="row">
      <div class="row-ic">${mLabel(k).split(" ")[0]}</div>
      <div class="row-main">
        <div class="row-t">${mLabel(k, true).replace(/^./, c => c.toUpperCase())}</div>
        <div class="row-d">te quedan ${money(r.libreDespues)} libres${
          tope ? " · este mes da su tope" : ""}</div>
      </div>
      <div class="row-amt">${money(r.ahorro)}<span class="sub">acum. ${money(acc)}</span></div>
    </div>`).join("")}
    <div class="table-wrap" style="margin-top:4px">
      <table><caption>Piso de gasto libre: ${money(PISO_ACTUAL)} al mes.</caption>
      <thead><tr><th>Mes</th><th>Libre antes</th><th>Ahorras</th><th>Libre después</th><th>Acumulado</th></tr></thead>
      <tbody>${filas.map(({ k, r, acc }) => `<tr><td>${mLabel(k, true)}</td>
        <td>${money2(r.libre)}</td><td>${money2(r.ahorro)}</td>
        <td>${money2(r.libreDespues)}</td><td>${money2(acc)}</td></tr>`).join("")}
        <tr class="tot"><td>Total</td><td></td><td>${money2(AHORRO_TOTAL)}</td><td></td><td></td></tr>
      </tbody></table>
    </div>`;
}

function updateMeta() {
  const m = DATA.metaMuebles;
  const [, hi] = m.estimadoRealista;
  const pv = document.getElementById("piso-valor");
  if (pv) pv.textContent = money(PISO_ACTUAL);

  const pct = clamp(AHORRO_TOTAL / m.metaDeclarada * 100, 0, 100);
  const fill = document.getElementById("goal-fill");
  if (fill) {
    fill.style.width = pct.toFixed(1) + "%";
    fill.style.background = AHORRO_TOTAL >= m.metaDeclarada - 1 ? css("--good")
                          : AHORRO_TOTAL >= m.metaDeclarada * 0.8 ? css("--warning") : css("--critical");
  }
  const proj = document.getElementById("goal-proj");
  if (proj) proj.textContent = `Juntas ${money(AHORRO_TOTAL)} de ${money(m.metaDeclarada)}`;
  const pctEl = document.getElementById("goal-pct");
  if (pctEl) pctEl.textContent = Math.round(pct) + "%";

  const peor = AHORRO_MESES.reduce((a, k) => Math.min(a, byMonth[k].libreDespues), Infinity);
  const ro = document.getElementById("goal-readout");
  if (ro) {
    ro.innerHTML = [
      ["Meses de ahorro", `${AHORRO_MESES.length} · ${mLabel(AHORRO_MESES[0])} → ${mLabel(AHORRO_MESES.at(-1))}`],
      ["Capacidad máxima con este piso", money(PLAN_AHORRO.capacidad)],
      ["Con este piso juntas", `<span style="color:${AHORRO_TOTAL >= m.metaDeclarada - 1 ? css("--good-ink") : css("--crit-ink")}">${money(AHORRO_TOTAL)}</span>`],
      ["Mes más apretado te deja", money(peor)],
      [`Para los ${money(hi)} reales`, PLAN_AHORRO.capacidad >= hi
        ? "alcanza con este piso" : `faltan ${money(hi - PLAN_AHORRO.capacidad)}`]
    ].map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");
  }

  const host = document.getElementById("meta-chart");
  if (host && host.offsetParent !== null) {
    lineChart(host, {
      rows: goalRows(), height: 240, fmt: money, refValue: m.metaDeclarada,
      refLabel: "Meta " + money(m.metaDeclarada), valueLabel: "Ahorro acumulado",
      aria: `Ahorro acumulado proyectado contra la meta de ${m.metaDeclarada} pesos.`
    });
    legend(document.getElementById("meta-legend"), [
      { label:"Ahorro acumulado", color:css("--s1"), line:true },
      { label:"Meta declarada",   color:css("--ink-2"), line:true }
    ]);
  }
}

function renderMetaPresupuesto() {
  const m = DATA.metaMuebles;
  const [lo, hi] = m.estimadoRealista;
  document.getElementById("meta-presupuesto").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Qué hay que comprar</div>
        <div class="card-sub">El depto trae ${m.incluye.join(", ")}. No trae ${m.noIncluye.join(", ")}.</div></div>
    </div>
    ${m.presupuesto.map(p => `<div class="row">
      <div class="row-ic">🛋️</div>
      <div class="row-main"><div class="row-t">${p.escenario}</div></div>
      <div class="row-amt${p.monto > m.metaDeclarada ? "" : " soft"}">${money(p.monto)}</div>
    </div>`).join("")}
    ${m.extras.map(e => `<div class="row">
      <div class="row-ic">＋</div>
      <div class="row-main"><div class="row-t">${e.concepto}</div></div>
      <div class="row-amt soft">${money(e.monto)}</div>
    </div>`).join("")}
    <div class="tip" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="ic">⚠️</div>
      <div class="tx"><b>Estimado realista: ${money(lo)}–${money(hi)}.</b>
        Tu meta de ${money(m.metaDeclarada)} se queda corta por ${money(lo - m.metaDeclarada)} a ${money(hi - m.metaDeclarada)}.
        Ya tienes ${m.yaTiene.join(", ")}, eso no hay que comprarlo.</div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   RENDER — Plan mes a mes
   ══════════════════════════════════════════════════════════════════════ */

function renderFlowCard() {
  document.getElementById("flow-card").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">A dónde va cada peso</div>
        <div class="card-sub">Compromisos contra tu ingreso de ${money(DATA.ingreso.mensual)}</div></div>
    </div>
    <div class="chart-scroll"><div id="flow-chart"></div></div>
    <div class="legend" id="flow-legend"></div>
    <div class="btn-row">
      <button class="btn" type="button" id="flow-tbl-btn" aria-pressed="false" aria-controls="flow-tbl">Ver tabla</button>
    </div>
    <div class="table-wrap" id="flow-tbl" hidden></div>`;
  drawFlow();
  renderFlowTable();
  wireToggle("flow-tbl-btn", "flow-tbl");
}

function drawFlow() {
  const host = document.getElementById("flow-chart");
  if (!host) return;
  stackedColumns(host, {
    series: CATS,
    rows: MODEL.map(r => ({ key:r.k, label:mLabel(r.k), tipLabel:mLabel(r.k, true), values:r.c, total:r.total })),
    height: 300, fmt: money, totalLabel: "Comprometido",
    refValue: DATA.ingreso.mensual, refLabel: "Ingreso " + money(DATA.ingreso.mensual),
    aria: "Compromisos mensuales por categoría contra el ingreso, de agosto 2026 a septiembre 2027.",
    tipExtra: row => {
      const r = byMonth[row.key];
      return (r.prefondeado > 0
        ? `<div class="tt-row"><span class="lhs">Ya apartado antes</span><span class="val">−${money(r.prefondeado)}</span></div>`
        : "") +
        (r.ahorro > 0 ? `<div class="tt-row"><span class="lhs">Ahorro meta</span><span class="val">−${money(r.ahorro)}</span></div>` : "") +
        `<div class="tt-row"><span class="lhs">Te queda</span><span class="val" style="color:${
          r.libreDespues < PISO_ACTUAL - 1 ? css("--crit-ink") : css("--good-ink")}">${money(r.libreDespues)}</span></div>`;
    }
  });
  legend(document.getElementById("flow-legend"),
    CATS.map(c => ({ label:c.label, color:css(c.v) }))
        .concat([{ label:"Ingreso mensual", color:css("--ink-2"), line:true }]));
}

function renderFlowTable() {
  const host = document.getElementById("flow-tbl");
  if (!host) return;
  host.innerHTML = `<table>
    <caption>Compromisos mensuales. Ingreso de referencia: ${money(DATA.ingreso.mensual)} al mes.</caption>
    <thead><tr><th>Concepto</th>${MODEL.map(r => `<th>${mLabel(r.k)}</th>`).join("")}</tr></thead>
    <tbody>
      ${CATS.map(c => `<tr><td>${c.label}</td>${
        MODEL.map(r => `<td>${r.c[c.id] ? money2(r.c[c.id]) : "—"}</td>`).join("")}</tr>`).join("")}
      <tr class="tot"><td>Total comprometido</td>${MODEL.map(r => `<td>${money2(r.total)}</td>`).join("")}</tr>
      <tr><td>Ya apartado en un mes anterior</td>${
        MODEL.map(r => `<td>${r.prefondeado ? "−" + money2(r.prefondeado) : "—"}</td>`).join("")}</tr>
      <tr><td>Sale del ingreso del mes</td>${MODEL.map(r => `<td>${money2(r.deEsteIngreso)}</td>`).join("")}</tr>
      <tr><td>Queda</td>${MODEL.map(r => `<td>${money2(r.libre)}</td>`).join("")}</tr>
      <tr><td>Ahorro para la meta</td>${MODEL.map(r => `<td>${r.ahorro ? "−" + money2(r.ahorro) : "—"}</td>`).join("")}</tr>
      <tr class="tot"><td>Gasto libre real</td>${MODEL.map(r => `<td>${money2(r.libreDespues)}</td>`).join("")}</tr>
    </tbody></table>`;
}

function renderMonthList() {
  const host = document.getElementById("month-list");
  host.innerHTML = `
    <div class="card-head" style="padding-top:12px">
      <div><div class="card-title">Mes por mes</div>
        <div class="card-sub">Toca cualquier mes para abrir el desglose</div></div>
    </div>
    ${MODEL.map(r => {
      const nombre = mLabel(r.k, true);
      const segs = CATS.filter(c => r.c[c.id] > 0)
        .map(c => `<i style="background:${css(c.v)};flex:${r.c[c.id]}"></i>`).join("");
      const apretado = r.libreDespues < PISO_ACTUAL - 1;
      return `<div class="month" data-month="${r.k}">
        <button class="month-btn" type="button" aria-expanded="false">
          <span>
            <span class="m-name">${nombre}</span>
            <span class="m-sub">${money(r.total)} comprometidos</span>
          </span>
          <span class="m-free">
            <span class="v" style="${r.libreDespues < PISO_ACTUAL - 1 ? `color:${css("--crit-ink")}` : ""}">${money(r.libreDespues)}</span>
            <span class="k">${gastadoMes(r.k) > 0
              ? `genera el mes · ya gastaste ${money(gastadoMes(r.k))}`
              : r.ahorro > 0
                ? `libre · ya apartaste ${money(r.ahorro)} para la meta`
                : r.prefondeado > 0
                  ? `libre · incluye ${money(r.prefondeado)} apartados antes`
                  : "libre"}</span>
          </span>
          <span class="m-caret">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </button>
        <div class="m-detail" hidden>
          <div class="m-bar">${segs}</div>
          ${CATS.filter(c => r.c[c.id] > 0).map(c => {
            const items = c.items ? c.items(r.k) : [];
            const desglosable = items.length > 1;
            return `<div class="dl"><span class="k"><span class="dot" style="background:${css(c.v)}"></span>${c.label}</span>
              <span class="v">${money2(r.c[c.id])}</span></div>
              ${desglosable ? `<div class="sub-items">${items.map(it =>
                `<div class="dl si"><span class="k">${it.label}${
                  it.nota ? `<span class="si-nota">${it.nota}</span>` : ""}</span>
                 <span class="v">${money2(it.monto)}</span></div>`).join("")}</div>` : ""}`;
          }).join("")}
          <div class="dl tot"><span class="k">Total comprometido</span><span class="v">${money2(r.total)}</span></div>
          ${r.prefondeado > 0 ? r.pre.map(p =>
            `<div class="dl pref"><span class="k">− ${p.concepto}<span class="si-nota">${p.nota}</span></span>
             <span class="v">−${money2(p.monto)}</span></div>`).join("") +
            `<div class="dl pref"><span class="k">Sale de tu ingreso de este mes</span>
             <span class="v">${money2(r.deEsteIngreso)}</span></div>` : ""}
          <div class="dl"><span class="k">Ingreso</span><span class="v">${money2(DATA.ingreso.mensual)}</span></div>
          <div class="dl tot"><span class="k">Queda</span><span class="v">${money2(r.libre)}</span></div>
          ${r.ahorro > 0 ? `<div class="dl pref"><span class="k">− Ahorro para la meta
            <span class="si-nota">a una cuenta aparte el día 30</span></span>
            <span class="v">−${money2(r.ahorro)}</span></div>` : ""}
          <div class="dl tot"><span class="k">Gasto libre real</span>
            <span class="v" style="${apretado ? `color:${css("--crit-ink")}` : ""}">${money2(r.libreDespues)}</span></div>
        </div>
      </div>`;
    }).join("")}
    <div style="height:8px"></div>`;

  host.querySelectorAll(".month-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".month");
      const detail = wrap.querySelector(".m-detail");
      const open = detail.hidden;
      detail.hidden = !open;
      wrap.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
}

function renderAcciones() {
  const m = DATA.metaMuebles;
  const hi = m.estimadoRealista[1];
  const peor = MODEL.reduce((a, b) => (b.libre < a.libre ? b : a));
  const msiAhora = byMonth[MESES[0]].c.msi;
  const msiLibre = byMonth[PRIMER_MES_LIBRE].c.msi;
  const dias = Math.max(0, daysBetween(hoyISO, DATA.planJulio.fecha));
  const serv = DATA.msi.find(s => s.supuesto);
  const costco = DATA.msi.filter(s => s.tarjeta === "Costco Banamex");
  const costcoMes = sum(costco.map(s => s.monto));
  const ultimoMes = MESES.at(-1);

  const items = [
    { t:`Ejecuta lo que falta del ${dLabelLong(DATA.planJulio.fecha)}: ${money2(PLAN_PENDIENTE)}`,
      d:`${PLAN_PAGADO.length ? `Ya liquidaste ${PLAN_PAGADO.map(a => a.concepto.replace("Adelanto ", "")).join(" y ")}. Falta` : "Falta"} ${DATA.planJulio.acciones.filter(a => !a.pagado).map(a => a.concepto.toLowerCase()).join(", ")}. La reserva de la Amex se aparta, no se gasta: la tarjeta la cobra el 23 de agosto.`,
      chips:[["crit", dias > 0 ? `en ${dias} días` : "hoy"], [null, "impacto alto"]] },

    { t:`${mLabel(peor.k, true).replace(/^./, c => c.toUpperCase())} no tiene colchón: ${money(peor.libre)} libres`,
      d:`Es el único mes donde el crédito a tu mamá, el primer pago del auto y los tres MSI de Amex caen juntos. No abras ningún gasto nuevo ese mes.`,
      chips:[["crit","riesgo"], [null, `${money(peor.total)} de ${money(DATA.ingreso.mensual)}`]] },

    { t:`Decide la Gold Card antes del ${dLabelLong(DATA.anualidadAmex.cancelarAntesDe)}`,
      d:`Amex confirmó que la anualidad se cobra en el corte del ${dLabelLong(DATA.anualidadAmex.seCobraEnCorte)}: ${money(DATA.anualidadAmex.total)} (${DATA.anualidadAmex.usd} USD + IVA, ya con el aumento del 22 de septiembre), diferida a 3 pagos de ${money(DATA.anualidadAmex.mensualidad)}. Cancelar antes de esa fecha la evita por completo. La ventana buena es del 23 de septiembre al 21 de octubre: para entonces ya pagaste 9 de las 12 parcialidades del gym y solo te acelerarían ${money(3850.20)}.`,
      chips:[["crit",`antes del ${dLabel(DATA.anualidadAmex.cancelarAntesDe)}`], [null, `evita ${money(DATA.anualidadAmex.total)}`]] },

    { t:`No abras un solo MSI nuevo hasta ${mLabel(PRIMER_MES_LIBRE, true)}`,
      d:`Cada MSI que abras hoy se come el colchón de la meta. Tu carga baja sola: ${money(msiAhora)} en ${mLabel(MESES[0], true)} → ${money(msiLibre)} en ${mLabel(PRIMER_MES_LIBRE, true)}.`,
      chips:[["warn","regla permanente"]] },

    { t:`Aparta el ahorro el día 30, pero no el mismo monto cada mes`,
      d:`Un ahorro parejo rompería tu piso de ${money(PISO_ACTUAL)}: noviembre carga el tercer pago a tu mamá y solo aguanta ${money(byMonth[AHORRO_MESES[0]].ahorro)}. El plan reparte lo que cada mes puede dar y llega a ${money(AHORRO_TOTAL)} sin bajar nunca del piso. Está mes por mes en la pantalla de Metas.`,
      chips:[["good","programable"], [null, `${AHORRO_MESES.length} transferencias`]] },

    { t:`Habla con tu mamá para repartir los últimos dos pagos en tres`,
      d:`Es la única palanca que sostiene el piso de ${money(PISO_ACTUAL)} en septiembre y octubre. Julio y agosto siguen igual; los ${money(21318)} que quedaban se pagan en tres de ${money(7106)} entre septiembre y noviembre. Sin esto, septiembre cae a ${money(6602)}.`,
      chips:[["crit","antes del 30 de agosto"], [null, `libera ${money(3553)} en sep y oct`]] },

    { t:`Decide ya la meta real: ${money(m.metaDeclarada)} no alcanza`,
      d:`Amueblar completo sale entre ${money(m.estimadoRealista[0])} y ${money(hi)} porque el depto no trae ${m.noIncluye.join(" ni ")}. O subes el ahorro a ${money(REQ_REAL)} al mes, o recortas categorías al comprar. Decidirlo ahora es gratis.`,
      chips:[["warn","decisión pendiente"], [null, `faltan ${money(hi - m.metaDeclarada)}`]] },

    ...(serv ? [{ t:`Confirma las parcialidades del ${serv.label} de la ${serv.tarjeta}`,
      d:`Son ${money2(serv.monto)} al mes y es el único compromiso sin fecha de término conocida. Aquí está proyectado hasta ${mLabel(serv.hasta, true)}; si termina antes, ese dinero se te libera.`,
      chips:[["warn","dato faltante"], [null, `${money2(serv.monto)} al mes en juego`]] }] : []),

    { t:`Costco Banamex se apaga solo y te devuelve ${money2(costcoMes)} al mes`,
      d:`Los dos planes de Amazon terminan en ${costco.map(s => mLabel(s.hasta, true)).join(" y ")}. A partir de ahí tu piso fijo baja a ${money(byMonth[ultimoMes].total)}.`,
      chips:[["good","a favor"], [null,"solo no lo reemplaces"]] }
  ];

  document.getElementById("acciones").innerHTML = `
    <div class="card-head">
      <div><div class="card-title">Tu plan de acción</div>
        <div class="card-sub">Ordenado por lo que más mueve la aguja, no por fecha</div></div>
    </div>
    ${items.map((it, i) => `<div class="act">
      <div class="n">${i + 1}</div>
      <div>
        <div class="t">${it.t}</div>
        <div class="d">${it.d}</div>
        <div class="m">${it.chips.map(([cls, txt]) =>
          `<span class="chip ${cls || ""}">${cls ? `<span class="dot" style="background:currentColor"></span>` : ""}${txt}</span>`).join("")}</div>
      </div>
    </div>`).join("")}`;
}

function renderNotas() {
  const serv = DATA.msi.find(s => s.supuesto);
  const notas = [
    `Las cifras salen de tus estados de cuenta al ${dLabelLong(DATA.meta.corte)}. Los saldos de tarjetas cambian todos los días; los planes a meses y las fechas de corte son estables.`,
    `El piso fijo calculado por componentes da ${money2(PISO_FIJO)} (${mLabel(PRIMER_MES_LIBRE, true)}, ya sin el crédito a mamá). Tu resumen original decía $14,861.49: la diferencia de $200 parece un colchón sobre el Tag Pase. Aquí se usa el cálculo por componentes.`,
    ...(serv ? [`El ${serv.label} de la ${serv.tarjeta} (${money2(serv.monto)} al mes) está proyectado hasta ${mLabel(serv.hasta, true)} porque no se conocen las parcialidades restantes.`] : [
      `Los planes a meses de la Gold Card salen del estado de cuenta del corte del 22 de julio: ya no hay nada supuesto ahí. El gym es un MSI de 12, no un gasto fijo.`]),
    `La anualidad de Amex está en dólares: ${money(DATA.anualidadAmex.usdAnterior)} USD hoy y ${money(DATA.anualidadAmex.usd)} USD desde el 22 de septiembre de 2026, más IVA y diferida a 3 meses. A ${DATA.anualidadAmex.tipoCambio} por dólar son ${money(DATA.anualidadAmex.total)} al año.`,
    `El Tag Pase se calcula con tus días de oficina reales (patrón de dos semanas: ${OFI.patron[0].dias.map(d=>DOW_LARGO[d-1]).join("/")} y ${OFI.patron[1].dias.map(d=>DOW_LARGO[d-1]).join("/")}) y simulando el saldo del tag día por día. No descuenta festivos ni vacaciones, así que es el techo.`,
    `El viaje cuesta ${money(OFI.costoCaseta)} pero la recarga mínima es ${money(OFI.montoRecarga)} + ${money(OFI.comision)} de comisión. Como el saldo se acumula, el modelo asume que recargas solo cuando no alcanza para el viaje. Si recargas cada día que vas a la oficina, salen ${money(sum(MESES.map(k=>simularTag("cada-dia",200)[k].salida))/MESES.length)} al mes en vez de ${money(sum(MESES.map(k=>tagMes(k)))/MESES.length)} — la diferencia no se pierde, se queda estacionada en el tag.`,
    `El gasto libre NO descuenta comida, salidas ni imprevistos: es lo que queda después de compromisos, y de ahí sale todo lo demás.`,
    ...DATA.prefondeo.map(p =>
      `${mLabel(p.mes, true).replace(/^./, c => c.toUpperCase())} tiene ${money2(p.monto)} ya apartados desde julio (${p.concepto}). ` +
      `Ese dinero se descuenta de los compromisos del mes al calcular el gasto libre, porque se pagó con el ingreso de julio, no con el de ${mLabel(p.mes, true)}. ` +
      `Sin este ajuste el mes aparecía en ceros.`),
    `Los compromisos se cuentan en el mes en que se devengan, no en el que sale el dinero de la cuenta. Para las tarjetas hay hasta 7 semanas de diferencia, pero en régimen los dos criterios coinciden: septiembre y octubre cuadran al peso por ambos caminos.`,
    `La proyección asume ingreso constante de ${money(DATA.ingreso.mensual)} al mes y ningún gasto nuevo a meses.`
  ];
  document.getElementById("notas").innerHTML =
    `<div class="card-title" style="margin-bottom:12px">Supuestos y advertencias</div>
     <ul>${notas.map(n => `<li>${n}</li>`).join("")}</ul>`;
  document.getElementById("footer").textContent =
    `Datos al ${dLabelLong(DATA.meta.corte)} · horizonte ${mLabel(DATA.horizonte.desde, true)} → ${mLabel(DATA.horizonte.hasta, true)} · todo se calcula en tu navegador`;
}

/* ══════════════════════════════════════════════════════════════════════
   NAVEGACIÓN Y CICLO DE VIDA
   ══════════════════════════════════════════════════════════════════════ */

const IC = {
  inicio:    `<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/>`,
  flujo:     `<path d="M3 17.5 8.5 11l4 3.5L21 5"/><path d="M21 10V5h-5"/><path d="M3 21h18"/>`,
  quincenas: `<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>`,
  oficina:   `<rect x="3.5" y="8" width="17" height="12.5" rx="2"/><path d="M9 8V5.5h6V8M8 20.5v-5h8v5M3.5 12.5h17"/>`,
  tarjetas:  `<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>`,
  fijos:     `<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M2 20h20"/>`,
  metas:     `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>`,
  plan:      `<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8.5 2.5v4M15.5 2.5v4"/>`
};

const SECCIONES = [
  { id:"inicio",    titulo:"Inicio",          desc:"Gasto libre, auto y crédito" },
  { id:"flujo",     titulo:"Flujo diario",    desc:"Qué entra y sale cada día" },
  { id:"quincenas", titulo:"Quincenas",       desc:"Cuándo te pagan y cuánto" },
  { id:"oficina",   titulo:"Días de oficina", desc:"Tu patrón y el gasto del Tag" },
  { id:"tarjetas",  titulo:"Tarjetas",        desc:"Saldos, pagos y meses sin intereses" },
  { id:"fijos",     titulo:"Gastos fijos",    desc:"Tu piso mensual" },
  { id:"metas",     titulo:"Metas de ahorro", desc:"La mudanza con Aleli" },
  { id:"plan",      titulo:"Plan mes a mes",  desc:"A dónde va cada peso" }
];
const SCREENS = SECCIONES.map(s => s.id);
let activa = "inicio";

/* ─── menú lateral ─── */
function renderDrawer() {
  document.getElementById("nav").innerHTML = SECCIONES.map(s => `
    <button type="button" data-screen="${s.id}" aria-current="${s.id === activa}">
      <span class="dn-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[s.id]}</svg></span>
      <span><span class="dn-t">${s.titulo}</span><span class="dn-d">${s.desc}</span></span>
    </button>`).join("");
  document.getElementById("drawer-sub").textContent =
    `${DATA.meta.nombreCorto} · datos al ${dLabel(DATA.meta.corte)}`;
  document.getElementById("drawer-foot").textContent =
    `Todo se calcula en tu navegador. Nada se envía a ningún servidor.`;
}

const drawer = () => document.getElementById("drawer");
const scrim  = () => document.getElementById("scrim");
const esEscritorio = () => matchMedia("(min-width: 1080px)").matches;

function abrirMenu(abrir) {
  if (esEscritorio()) return;                 // ahí el menú vive fijo
  const d = drawer(), s = scrim();
  d.classList.toggle("on", abrir);
  d.setAttribute("aria-hidden", String(!abrir));
  document.getElementById("menu-btn").setAttribute("aria-expanded", String(abrir));
  if (abrir) { s.hidden = false; requestAnimationFrame(() => s.classList.add("on")); }
  else { s.classList.remove("on"); setTimeout(() => { s.hidden = true; }, 240); }
  document.body.style.overflow = abrir ? "hidden" : "";
}

function wireToggle(btnId, tblId) {
  const btn = document.getElementById(btnId), tbl = document.getElementById(tblId);
  if (!btn || !tbl) return;
  btn.addEventListener("click", () => {
    const on = tbl.hidden;
    tbl.hidden = !on;
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Ocultar tabla" : "Ver tabla";
  });
}

/* Las gráficas necesitan un contenedor visible para medir su ancho,
   así que se dibujan al activar la pestaña y al cambiar de tamaño. */
function drawVisible() {
  if (activa === "inicio")   drawLibrePreview();
  if (activa === "flujo")    drawFlujo();
  if (activa === "oficina")  drawOficinaChart();
  if (activa === "tarjetas") drawMsiRunoff();
  if (activa === "fijos")    drawFijos();
  if (activa === "metas")    updateMeta();
  if (activa === "plan")     drawFlow();
}

function show(name) {
  activa = name;
  SCREENS.forEach(s => { document.getElementById("s-" + s).hidden = (s !== name); });
  document.querySelectorAll("#nav button").forEach(b => {
    b.setAttribute("aria-current", String(b.dataset.screen === name));
  });
  if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
  ttHide();
  abrirMenu(false);
  drawVisible();
  scrollTo({ top: 0, behavior: "instant" });
}

document.getElementById("nav").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-screen]");
  if (b) show(b.dataset.screen);
});
document.getElementById("menu-btn").addEventListener("click", () => abrirMenu(!drawer().classList.contains("on")));
document.getElementById("drawer-close").addEventListener("click", () => abrirMenu(false));
scrim().addEventListener("click", () => abrirMenu(false));
addEventListener("keydown", ev => { if (ev.key === "Escape") abrirMenu(false); });

document.getElementById("theme-btn").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const sysDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const next = cur ? (cur === "dark" ? "light" : "dark") : (sysDark ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("tema", next); } catch (e) { /* modo privado */ }
  renderAll();
});

let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(drawVisible, 160); });

function renderAll() {
  renderTopbar();
  renderDrawer();
  renderHero();
  renderCompromisosClave();
  renderTip();
  renderEfectivo();
  renderProximos("proximos", 6);
  renderLibrePreview();

  renderFlujoHero();
  renderFlujoCharts();
  renderFlujoMensual();
  renderApartado();
  renderFlujoFijos();
  renderFlujoCalendario();

  renderQuincenaHero();
  renderQuincenaResumen();
  renderQuincenaCal();

  renderOficinaHero();
  renderOficinaCal();
  renderOficinaProximos();
  renderOficinaPatron();
  renderOficinaEstrategia();
  renderOficinaCostos();

  renderQueTarjeta();
  renderCardFaces();
  renderPagosTarjetas();
  renderMsiList();
  renderMsiRunoff();

  renderFijos();
  renderSubs();
  renderFijosTimeline();

  renderMetaHero();
  renderMetaSim();
  renderMetaChart();
  renderMetaTabla();
  renderMetaPresupuesto();

  renderFlowCard();
  renderMonthList();
  renderAcciones();
  renderNotas();

  drawVisible();
}

/* arranque */
try {
  const t = localStorage.getItem("tema");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch (e) { /* modo privado */ }

renderAll();
show(SCREENS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio");
addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  if (SCREENS.includes(h) && h !== activa) show(h);
});
