/* ══════════════════════════════════════════════════════════════════════
   DATOS — este es el único archivo que necesitas editar cuando cambien
   tus cifras. Todo lo demás (proyección, gráficas, plan) se recalcula solo.
   ══════════════════════════════════════════════════════════════════════ */

const DATA = {
  meta: {
    persona: "Juan José Eizaguirre Zepeda",
    nombreCorto: "Juan José",
    corte: "2026-07-24",
    moneda: "MXN"
  },

  /* ── Ingreso ── */
  ingreso: { quincena: 17500, mensual: 35000, diasPago: [15, 30] },

  /* ── Efectivo disponible ── */
  efectivo: { ahorro: 17580, asOf: "2026-07-26" },

  /* ── Dinero de un mes que ya quedó apartado en un mes anterior ──
     No vuelve a consumir el ingreso del mes en que se paga: por eso se
     resta de los compromisos de ese mes al calcular el gasto libre. */
  prefondeo: [
    { mes: "2026-08", monto: 10369.02,
      concepto: "Reserva Amex Gold Elite",
      nota: "apartada el 30 de julio, la tarjeta la cobra el 23 de agosto" }
  ],

  /* ── Crédito a mamá ── */
  prestamoMama: {
    pago: 10659,
    fechas: ["2026-07-30", "2026-08-30", "2026-09-30", "2026-10-30"],
    meses: ["2026-07", "2026-08", "2026-09", "2026-10"]
  },

  /* ── Auto ── */
  auto: {
    modelo: "BYD King DM-i PHEV 2026",
    financiera: "BBVA",
    mensualidad: 6209,
    plazo: 36,
    primerPago: "2026-08",
    primerPagoFecha: "2026-08-15",
    diaPago: 15
  },

  /* ── Gastos fijos de vida (todos los meses) ──
     `corto` es el nombre que usan las gráficas, donde el espacio manda. */
  vidaFija: [
    { concepto: "Gasolina y pastillas", corto: "Gasolina",  monto: 2200,    detalle: "commute Atizapán → Ajusco" },
    { concepto: "Tag Pase (casetas)",   corto: "Tag Pase",  monto: 2200,    detalle: "$156 por día de oficina, cobrado a débito" },
    { concepto: "Gym FITSI",            corto: "Gym",       monto: 1283.40, detalle: "cargo día 23 a la Amex Gold de servicios" },
    { concepto: "Teléfono",             corto: "Teléfono",  monto: 350,     detalle: "" }
  ],

  /* ── Suscripciones ── */
  suscripciones: [
    { servicio: "Claude (Anthropic)", monto: 359.56, nota: "USD $20", tarjeta: "Amex Gold Elite" },
    { servicio: "ChatGPT",            monto: 399.00, nota: "",         tarjeta: "Amex Gold Elite" }
  ],

  /* ── Meses sin intereses vigentes ──
     `desde` / `hasta` = mes del primer y del último pago que falta ("AAAA-MM").
     `pagados` / `total` = progreso del plan completo.                        */
  msi: [
    { id:"elite-jun", tarjeta:"Amex Gold Elite", label:"MSI de junio",
      montoOriginal:20118, monto:6706.00, desde:"2026-08", hasta:"2026-08", pagados:2, total:3 },
    { id:"elite-jul", tarjeta:"Amex Gold Elite", label:"MSI de julio",
      montoOriginal:5913,  monto:1971.00, desde:"2026-08", hasta:"2026-09", pagados:1, total:3 },
    { id:"elite-alo", tarjeta:"Amex Gold Elite", label:"Alo Yoga Antara",
      montoOriginal:2990,  monto:996.67,  desde:"2026-08", hasta:"2026-10", pagados:0, total:3 },
    { id:"costco-a",  tarjeta:"Costco Banamex", label:"Amazon",
      montoOriginal:10998, monto:916.50,  desde:"2026-08", hasta:"2026-12", pagados:7, total:12 },
    { id:"costco-b",  tarjeta:"Costco Banamex", label:"Amazon",
      montoOriginal:2869,  monto:239.08,  desde:"2026-08", hasta:"2027-02", pagados:5, total:12 },
    { id:"serv-amz",  tarjeta:"Amex Gold Servicios", label:"Amazon",
      montoOriginal:null,  monto:504.95,  desde:"2026-08", hasta:"2027-09", pagados:null, total:null,
      supuesto:true, nota:"parcialidades restantes desconocidas — proyectado hasta sep 2027" }
  ],

  /* ── Anualidad Amex (se difiere a 3 meses) ── */
  anualidadAmex: {
    total: 9000, rangoConIva: [9000, 10440], mensualidad: 3000,
    meses: ["2026-12", "2027-01", "2027-02"],
    fechas: ["2026-12-11", "2027-01-11", "2027-02-11"],
    negociarAntes: "2026-11-22"
  },

  /* ── Tarjetas ── */
  tarjetas: [
    { id:"elite", alias:"Amex Gold Elite", term:"11005", emisor:"American Express",
      tipo:"revolvente", linea:92000, disponible:77666, saldo:3261.35, tasa:61.48,
      corte:3, vence:23, proximoPago:{ fecha:"2026-08-23", monto:10369.02 },
      tono:"grafito" },
    { id:"servicios", alias:"Amex Gold Servicios", term:"21009", emisor:"American Express",
      tipo:"cargo", linea:null, disponible:null, saldo:1788.35, tasa:null,
      corte:22, vence:11, proximoPago:{ fecha:"2026-08-11", monto:1788.35 },
      tono:"oro" },
    { id:"costco", alias:"Costco Banamex Visa", term:"104", emisor:"Banamex",
      tipo:"revolvente", linea:50000, disponible:40399.19, saldo:2317.03, tasa:60.58,
      corte:13, vence:3, proximoPago:{ fecha:"2026-08-03", monto:2317.03 },
      tono:"azul" },
    { id:"santander", alias:"Santander LikeU", term:"6240", emisor:"Santander",
      tipo:"revolvente", linea:170400, disponible:169800, saldo:600.00, tasa:null,
      corte:null, vence:3, proximoPago:{ fecha:"2026-08-03", monto:600.00 },
      tono:"rojo" }
  ],

  /* ── Meta de mudanza ── */
  metaMuebles: {
    objetivo: "Depto de 60 m² con Aleli",
    metaDeclarada: 90000,
    inicioAhorro: "2026-11",
    fechaLimite: "2027-09",
    estimadoRealista: [108300, 113300],
    incluye: ["estufa"],
    noIncluye: ["refrigerador", "lavadora / secadora", "terraza para tender"],
    yaTiene: ["cama", "base de cama", "escritorios"],
    presupuesto: [
      { escenario:"Sin línea blanca · básico",  monto:39500 },
      { escenario:"Sin línea blanca · cómodo",  monto:76800 },
      { escenario:"Con refri y lavasecadora · básico", monto:54500 },
      { escenario:"Con refri y lavasecadora · cómodo", monto:100800 }
    ],
    extras: [
      { concepto:"Tendedero de pared", monto:1500 },
      { concepto:"Deshumidificador (opcional)", monto:6750 }
    ]
  },

  /* ── Movimiento planeado del 30 de julio ── */
  planJulio: {
    fecha: "2026-07-30", total: 26827.90,
    acciones: [
      { concepto:"Pago 1 de 4 a mamá",             monto:10659.00, tipo:"salida" },
      { concepto:"Reserva Amex Gold Elite",        monto:10369.02, tipo:"reserva",
        nota:"se aparta hoy, la tarjeta lo cobra el 23 de agosto" },
      { concepto:"Adelanto Costco Banamex",        monto:2317.03,  tipo:"salida" },
      { concepto:"Adelanto Amex Gold Servicios",   monto:2882.85,  tipo:"salida" },
      { concepto:"Adelanto Santander LikeU",       monto:600.00,   tipo:"salida" }
    ]
  },

  /* ── Calendario de vencimientos ── */
  fechasClave: [
    { fecha:"2026-08-03", concepto:"Vence Santander LikeU",     monto:600.00,   tipo:"cubierto", nota:"cubierto por el adelanto del 30 jul" },
    { fecha:"2026-08-03", concepto:"Vence Costco Banamex",      monto:2317.03,  tipo:"cubierto", nota:"cubierto por el adelanto del 30 jul" },
    { fecha:"2026-08-11", concepto:"Vence Amex Gold Servicios", monto:1788.35,  tipo:"cubierto", nota:"cubierto por el adelanto de $2,882.85 del 30 jul" },
    { fecha:"2026-08-15", concepto:"1ª mensualidad auto BYD",   monto:6209.00,  tipo:"salida",   nota:"36 pagos, día 15 de cada mes" },
    { fecha:"2026-08-23", concepto:"Vence Amex Gold Elite",     monto:10369.02, tipo:"reservado",nota:"MSI junio 3/3 + MSI julio 2/3 + Alo Yoga 1/3 + consumo" },
    { fecha:"2026-08-30", concepto:"Pago 2 de 4 a mamá",        monto:10659.00, tipo:"salida",   nota:"" },
    { fecha:"2026-09-03", concepto:"Vence Costco Banamex",      monto:1155.58,  tipo:"salida",   nota:"MSI de Amazon" },
    { fecha:"2026-09-11", concepto:"Vence Amex Gold Servicios", monto:1788.35,  tipo:"salida",   nota:"gym + Amazon MSI" },
    { fecha:"2026-09-15", concepto:"Mensualidad auto BYD",      monto:6209.00,  tipo:"salida",   nota:"" },
    { fecha:"2026-09-23", concepto:"Vence Amex Gold Elite",     monto:3726.23,  tipo:"salida",   nota:"MSI julio 3/3 + Alo Yoga 2/3 + suscripciones" },
    { fecha:"2026-09-30", concepto:"Pago 3 de 4 a mamá",        monto:10659.00, tipo:"salida",   nota:"" }
  ],

  /* ── Horizonte de la proyección de compromisos ── */
  horizonte: { desde: "2026-08", hasta: "2027-09" },

  /* ── Hasta dónde llega el calendario de quincenas ── */
  horizonteIngresos: { hasta: "2027-12" }
};
