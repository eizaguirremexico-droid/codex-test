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
  /* Medido en la Santander Priority ...329, que es la cuenta de nómina.
     OJO con esta medición: ya trae DENTRO la quincena del 15 y ya le salió
     el pago de la Amex Elite del 14 de agosto. Si se usara tal cual, el
     modelo de devengado contaría dos veces las dos cosas (el ingreso de
     agosto y el compromiso de agosto ya liquidado). Por eso se anotan
     aparte: el colchón limpio las revierte y deja el saldo con el que
     arrancó agosto de verdad. */
  /* El efectivo NO vive en una sola cuenta: `ahorro` es la suma de todas.
     Verlo solo en la de nómina hacía aparecer un faltante de $5,066.08 que
     en realidad estaba en la otra. */
  efectivo: {
    ahorro: 6443.07, asOf: "2026-08-17",
    cuentas: [
      { nombre: "Santander Priority ···329", monto: 2376.99, nota: "aquí cae la nómina" },
      /* De aquí salió la transferencia del cargador. Falta saber de qué banco
         es y qué rendimiento paga. */
      { nombre: "Cuenta ···5910",            monto: 4066.08, nota: "falta identificar el banco" }
    ],
    /* Quincenas que YA están dentro del saldo de arriba. El calendario de
       ingresos las descuenta para no prometerlas otra vez como dinero por
       llegar: el 15 cayó en sábado y se depositó el viernes 14. */
    quincenasCobradas: ["2026-08-15"],
    /* Compromisos que YA salieron de este saldo pero que el modelo sigue
       cobrando en el mes al que pertenecen. Se revierten para recuperar el
       saldo con el que arrancó agosto ($5,500). Adelantar el pago de una
       tarjeta no cambia la bolsa de ningún mes: solo mueve la fecha. */
    compromisosPagados: [
      { concepto: "Amex Gold Elite",       monto: 10922.74, fecha: "2026-08-14" },
      { concepto: "Costco Banamex",        monto: 2427.70,  fecha: "2026-08-17",
        nota: "adelantada · vencía el 2 de septiembre" },
      { concepto: "Amex Gold Servicios",   monto: 2206.49,  fecha: "2026-08-17",
        nota: "adelantada antes de su corte del 22" }
    ],
    nota: "medido el 17 de agosto, ya sin los tres adelantos"
  },

  /* ── Dinero de un mes que ya quedó apartado en un mes anterior ──
     No vuelve a consumir el ingreso del mes en que se paga: por eso se
     resta de los compromisos de ese mes al calcular el gasto libre. */
  prefondeo: [
    { mes: "2026-08", monto: 6209,
      concepto: "Mensualidad del auto",
      nota: "pagada por adelantado el 30 de julio con dinero de julio" },
    /* Los pagos a mamá van el 30 de cada mes. El del 1 de agosto no es de
       agosto: es el de julio, que se recorrió unos días. Sale del efectivo
       que ya traías del 31 de julio, no del sueldo de agosto — por eso no
       cuenta como compromiso de agosto, igual que el auto. */
    { mes: "2026-08", monto: 10659,
      concepto: "Pago a mamá de julio",
      nota: "se recorrió al 1 de agosto, pero sale del dinero de julio" }
  ],

  /* ── Crédito a mamá ──
     Renegociado: julio y agosto se pagan completos, y lo que quedaba para
     septiembre y octubre ($21,318) se reparte en tres pagos de $7,106.
     Eso libera $3,553 en sep y oct, que es lo que faltaba para sostener
     el piso de gasto libre. El total no cambia: $42,636. */
  prestamoMama: {
    total: 42636,
    pagos: [
      { fecha: "2026-08-01", monto: 10659 },
      { fecha: "2026-08-30", monto: 10659 },
      { fecha: "2026-09-30", monto: 7106 },
      { fecha: "2026-10-30", monto: 7106 },
      { fecha: "2026-11-30", monto: 7106 }
    ],
    nota: "renegociado: los últimos dos pagos repartidos en tres"
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

  /* ── Días de oficina ──
     El patrón alterna dos semanas y se repite. `ancla` es el lunes donde
     arranca la semana A. Los números son los días de la semana de
     JavaScript: 1 = lunes … 5 = viernes.
     El Tag Pase NO es un monto fijo: se calcula con los días de oficina
     reales de cada mes por el costo de la recarga. */
  oficina: {
    ancla: "2026-07-27",
    patron: [
      { nombre: "A", dias: [1, 2, 5] },   // lunes, martes, viernes
      { nombre: "B", dias: [2, 3, 4] }    // martes, miércoles, jueves
    ],
    /* El viaje cuesta 156 y la comisión es de 10 pesos por recarga, sin
       importar el monto. El saldo NO se pierde: se acumula. Por eso el
       costo real depende de cada cuánto recargas, no de cuántos días vas.
       Recargando 2,000 la comisión sale en 0.5% en vez del 5% que costaba
       recargar de 200 en 200. */
    costoCaseta: 156,
    montoRecarga: 600,
    comision: 10,
    /* Saldo REAL del tag, medido. Todas las simulaciones arrancan de aquí:
       antes de esta fecha las recargas eran de $200 y ya están pagadas, así
       que back-simular desde el ancla daba un saldo inventado. */
    saldo: { monto: 418.72, fecha: "2026-08-08" },  /* medido en la app de PASE */
    /* "cada-dia"  = recargas por reflejo cada día de oficina
       "cuando-falta" = recargas solo cuando el saldo no alcanza el viaje */
    estrategia: "cuando-falta",
    /* Dónde se cobra la recarga: "debito" sale el mismo día; el id de una
       tarjeta la difiere hasta que vence esa tarjeta. */
    via: "debito",
    nota: "recarga real de $600, no de $2,000 · a débito"
  },

  /* ── Gastos fijos de vida (todos los meses) ──
     `corto` es el nombre que usan las gráficas, donde el espacio manda.
     El Tag Pase no está aquí: se calcula mes a mes desde `oficina`. */
  vidaFija: [
    { concepto: "Gasolina y pastillas", corto: "Gasolina", monto: 2200,
      detalle: "commute Atizapán → Ajusco", via: "costco" },
    /* Identificado en el estado de cuenta de la Joy: "AT&T CR" el 25 de julio
       por $360.00. Ya no es un cargo suelto sin dueño: es recurrente, cae en
       la Joy y son $360, no $350. */
    { concepto: "Teléfono AT&T",        corto: "Teléfono", monto: 360,
      detalle: "cargo recurrente el 25 de cada mes", via: "joy" }
  ],

  /* ── Gasto libre ya hecho ──
     Esto NO es compromiso: es tu bolsa del mes, ya gastada. Sirve para dos
     cosas: restarlo de lo que te queda por gastar, y saber en qué corte cae
     para que salga de la cuenta el día correcto. */
  gastoLibre: [
    /* `pagado` = su tarjeta ya se adelantó el 17 de agosto. Sigue contando
       como gasto de agosto, pero el dinero ya salió: no vuelve a aparecer
       en el mapa de caja más adelante. */
    { fecha:"2026-08-01", concepto:"Restaurante LCDP Galerías", monto:445.50, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-01", concepto:"Liverpool Atizapán",        monto:278.60, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-01", concepto:"Miniso Cúspide",            monto:329.80, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-01", concepto:"Cinépolis dulcería",        monto:728.00, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-04", concepto:"Headway (suscripción anual)", monto:525.00, tarjeta:"elite" },
    /* Cargos a la Costco después de liquidarla el 1 de agosto.
       El cargo de $824.70 del 7 de agosto NO está aquí: es la gasolina,
       que ya se cuenta como gasto fijo. Meterla también aquí la cobraría
       dos veces. */
    { fecha:"2026-08-02", concepto:"Tesco China",                monto:248.00, tarjeta:"costco", pagado:true },
    { fecha:"2026-08-05", concepto:"Restaurante La Cuchara",     monto:110.00, tarjeta:"costco", pagado:true },
    { fecha:"2026-08-06", concepto:"Clip",                       monto:150.00, tarjeta:"costco", pagado:true },
    /* Diferencia entre el saldo medido de la Gold Card ($2,021.49) y los
       cuatro cargos del 1 de agosto. Falta identificar qué fue. */
    { fecha:"2026-08-06", concepto:"Cargos sin identificar (Gold Card)", monto:239.59, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-06", concepto:"Cargo sin identificar (LikeU)",      monto:180.00, tarjeta:"santander" },
    /* Cargo de la tarjeta adicional de Aleli — cae en el mismo estado de
       cuenta de la Gold Card. */
    { fecha:"2026-08-11", concepto:"TikTok Shop (adicional de Aleli)",   monto:185.00, tarjeta:"servicios", pagado:true },
    /* La BBVA dejó de estar en ceros. Falta identificar qué fue. */
    { fecha:"2026-08-12", concepto:"Cargo sin identificar (BBVA)",       monto:160.02, tarjeta:"bbva" },
    /* Cargos posteriores al corte del 13 de agosto: NO entran al pago del 2
       de septiembre. Caen en el corte del 13 de septiembre y se pagan el 2
       de octubre. Son gasto de agosto aunque el dinero salga en dos meses. */
    { fecha:"2026-08-14", concepto:"Costco",                             monto:239.00, tarjeta:"costco" },
    { fecha:"2026-08-15", concepto:"Cinépolis",                          monto:442.00, tarjeta:"costco" },
    { fecha:"2026-08-15", concepto:"Steren",                             monto:428.00, tarjeta:"costco" },
    { fecha:"2026-08-15", concepto:"330 Sendero Ixtapaluca",             monto:149.00, tarjeta:"costco" },
    /* Segunda compra en Sendero Ixtapaluca el mismo día, pero a la Gold
       Card. Cayó ANTES del corte del 22, así que entra al estado de cuenta
       que se paga el 11 de septiembre — el adelanto del 17 no la cubre. */
    { fecha:"2026-08-15", concepto:"330 Sendero Ixtapaluca",             monto:599.00, tarjeta:"servicios" },
    /* Tarde en Perisur del 16 de agosto, toda a la Elite. Cae en el corte
       del 3 de septiembre y se paga el 24 de septiembre. */
    { fecha:"2026-08-16", concepto:"MixUp Perisur",                      monto:436.00,  tarjeta:"elite" },
    { fecha:"2026-08-16", concepto:"L'Occitane Perisur",                 monto:660.00,  tarjeta:"elite" },
    { fecha:"2026-08-16", concepto:"H&M Perisur",                        monto:249.00,  tarjeta:"elite" },
    /* En la app salen TRES líneas de $843.70: el cargo, una devolución en
       verde ("Restaurante Mifel") y el cargo otra vez. Es un solo consumo
       que se duplicó y el banco ya revirtió el duplicado: neto uno. */
    { fecha:"2026-08-16", concepto:"Café Bucra Perisur",                 monto:843.70,  tarjeta:"elite",
      nota:"aparece duplicado con su devolución — es un solo cargo" },
    { fecha:"2026-08-16", concepto:"Mango Perisur",                      monto:1103.00, tarjeta:"elite" },
    /* A débito, no a tarjeta: reembolso a su mamá por el cargador del BYD que
       ella compró. No tiene nada que ver con el crédito de los $42,636 — es
       gasto suelto y sale de la bolsa del mes. Ya salió de la cuenta. */
    { fecha:"2026-08-17", concepto:"Cargador del BYD (reembolso a mamá)", monto:1000.00, tarjeta:"debito", pagado:true }
  ],

  /* ── Suscripciones ── */
  suscripciones: [
    { servicio: "Claude (Anthropic)", monto: 359.72, nota: "USD $20 · cobrado el 30 jul", tarjeta: "Amex Gold Elite" },
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
    /* Del estado de cuenta del corte del 22 de julio de 2026, sección
       "Resumen de Planes de Pagos Diferidos". Ya no hay nada supuesto aquí. */
    { id:"serv-amz",  tarjeta:"Amex Gold Servicios", label:"Amazon",
      montoOriginal:3029.90, monto:504.95, desde:"2026-08", hasta:"2026-08", pagados:5, total:6,
      nota:"último pago · saldo pendiente $504.95" },
    /* La membresía del gym se compró el 15 de enero en UN pago de $15,400.80
       y Amex la difirió a 12 meses. NO es un gasto fijo mensual: se acaba en
       el corte de diciembre. Si la renuevas en enero vuelve a empezar. */
    /* Del estado de cuenta de la Joy del corte del 4 de agosto: compra del
       4 de julio en Ticketmaster por $5,942.50 diferida a 3 meses. Van 2 de
       3 pagados (el primero se liquidó con el abono del 15 de julio), queda
       $1,980.84 que se cobra en el corte del 4 de septiembre. */
    { id:"joy-tm",    tarjeta:"Joy Banamex", label:"Ticketmaster",
      montoOriginal:5942.50, monto:1980.84, desde:"2026-09", hasta:"2026-09", pagados:2, total:3,
      nota:"último pago · vence el 24 de septiembre" },
    { id:"serv-gym",  tarjeta:"Amex Gold Servicios", label:"Gym FITSI (anualidad)",
      montoOriginal:15400.80, monto:1283.40, desde:"2026-08", hasta:"2026-12", pagados:7, total:12,
      nota:"saldo pendiente $6,417.00 · renueva en enero 2027" }
  ],

  /* ── Anualidad Amex (se difiere a 3 meses) ── */
  /* Está en DÓLARES, no en pesos, y sube el 22 de septiembre de 2026:
     de $450 USD + IVA a $600 USD + IVA, diferida a 3 meses.
     A 17.13 por dólar son $11,922.48 MXN al año contra $8,941.86 antes.
     Además la bonificación de $3,000 de viajes deja de aplicar en vuelos,
     paquetes y renta de auto: queda solo para hotel. */
  anualidadAmex: {
    usd: 600, usdAnterior: 450, tipoCambio: 17.13,
    total: 11922.48, rangoConIva: [11922.48, 11922.48], mensualidad: 3974.16,
    /* Amex confirmó que se cobra en el primer corte de octubre. La Gold Card
       corta el 22, así que cae en el corte del 22 de octubre y se difiere a
       tres pagos: 11 de noviembre, diciembre y enero.
       CANCELAR ANTES DEL 22 DE OCTUBRE LA EVITA POR COMPLETO. */
    meses: ["2026-11", "2026-12", "2027-01"],
    fechas: ["2026-11-11", "2026-12-11", "2027-01-11"],
    seCobraEnCorte: "2026-10-22",
    cancelarAntesDe: "2026-10-22",
    nota: "se cobra en el corte del 22 de octubre · cancelar antes la evita"
  },

  /* ── Tarjetas ── */
  tarjetas: [
    { id:"elite", alias:"Amex Gold Elite", term:"11005", emisor:"American Express",
      /* LIQUIDADA el 14 de agosto: se pagaron los $10,922.74 del corte del 3.
         Lo único vivo es el Headway del 4 de agosto, que entró después del
         corte y se paga hasta el 24 de septiembre. */
      /* Saldo y disponible como los muestra Amex el 17 de agosto. El saldo
         sigue en $525.00 porque los $3,291.70 de Perisur están "Pendientes"
         y todavía no se aplican — pero el crédito disponible SÍ bajó
         ($87,510 → $84,219), que es la prueba de que ya están apartados.
         Lo que de verdad debes es $3,816.70; el pago del 24 de septiembre
         ya lo contempla. */
      tipo:"revolvente", linea:92000, disponible:84219.00, saldo:525.00, tasa:61.48,
      pendiente:3291.70,
      corte:3, vence:24,
      proximoPago:{ fecha:"2026-09-24", monto:7543.09, estimado:true },
      puntos:4040,
      tono:"grafito" },
    { id:"servicios", alias:"Amex Gold Servicios", term:"21009", emisor:"American Express",
      /* Adelantada el 17 de agosto, antes de su corte del 22: quedó en cero.
         Al corte del 22 solo llegan el gym y el último Amazon MSI, así que
         el pago del 11 de septiembre baja de $3,994.84 a $1,788.35. */
      tipo:"cargo", linea:null, disponible:null, saldo:0, tasa:null,
      /* Tiene tarjeta adicional a nombre de Aleli (cuenta ...21017): su
         gasto cae en este mismo estado de cuenta. */
      adicional: "Aleli Michel Pérez Martínez",
      corte:22, vence:11, proximoPago:{ fecha:"2026-09-11", monto:2387.35, estimado:true },
      pendiente:599.00,
      puntos:4413,
      tono:"oro" },
    { id:"costco", alias:"Costco Banamex Visa", term:"104", emisor:"Banamex",
      /* Adelantada el 17 de agosto: se pagaron los $2,427.70 del estado de
         cuenta. Lo que queda son los cargos del 14 y 15, que van al corte
         del 13 de septiembre. */
      tipo:"revolvente", linea:50000, disponible:43641.48, saldo:1155.58, tasa:60.58,
      /* Corte del 13 de agosto YA EMITIDO: pago para no generar intereses
         $2,427.70, mínimo $630.00, fecha límite 2 de septiembre. Ya no es
         estimación — es el estado de cuenta. Estaba modelado en $1,997.11
         (MSI + gasolina) y le faltaban $430.59 de consumo del ciclo.
         Ojo: vence el 2, no el 3 como se venía suponiendo. */
      corte:13, vence:2, proximoPago:{ fecha:"2026-10-02", monto:4613.58, estimado:true },
      tono:"azul" },
    /* Ya estrenada, pero todavía sin estado de cuenta: la app marca "Tu
       próximo pago —", así que sigue sin conocerse el corte ni el
       vencimiento. Hasta que salga el primero, su saldo no tiene fecha de
       pago en el flujo. */
    { id:"bbva", alias:"BBVA TC M", term:"9871", emisor:"BBVA",
      tipo:"revolvente", linea:81300, disponible:81139.98, saldo:160.02, tasa:null,
      corte:null, vence:null, proximoPago:null,
      tono:"azul" },
    /* Estado de cuenta del corte del 4 de agosto. El saldo de $1,980.84 NO es
       consumo nuevo: es el capital que falta del Ticketmaster a 3 meses. Por
       eso el pago para no generar intereses del 24 de agosto fue de $360 (el
       AT&T) y no de $2,340.84 — y ese $360 ya se pagó.
       OJO con la comisión por inactividad: $149 + IVA al mes si no le haces
       al menos una compra de $300. El cargo recurrente de AT&T la exenta,
       así que no muevas el teléfono de aquí sin darle otro uso a la tarjeta. */
    { id:"joy", alias:"Joy Banamex", term:"331", emisor:"Banamex",
      tipo:"revolvente", linea:41000, disponible:39019.16, saldo:1980.84, tasa:62.98,
      corte:4, vence:24, proximoPago:{ fecha:"2026-09-24", monto:2340.84, estimado:true },
      tono:"rojo" },
    { id:"santander", alias:"Santander LikeU", term:"6240", emisor:"Santander",
      tipo:"revolvente", linea:170400, disponible:170220, saldo:180.00, tasa:null,
      /* corte desconocido. El 31 de julio la app marcaba pago mínimo $0 y pago
         para no generar intereses $0 con límite el 3 de agosto: o sea que los
         $880 son consumo POSTERIOR al último corte y no se deben todavía —
         entran al siguiente estado de cuenta y se pagan el 3 de septiembre. */
      /* El corte real sigue sin conocerse. `corteSupuesto` asume el estándar
         de ~20 días antes del vencimiento (vence día 3 → corta día 13). Todo
         lo que dependa de esto queda marcado como supuesto hasta confirmarlo
         con el primer estado de cuenta. */
      corte:null, corteSupuesto:13, vence:3,
      proximoPago:{ fecha:"2026-09-03", monto:180.00, estimado:true },
      tono:"rojo" }
  ],

  /* ── Meta de mudanza ── */
  metaMuebles: {
    objetivo: "Depto de 60 m² con Aleli",
    metaDeclarada: 90000,
    inicioAhorro: "2026-11",
    fechaLimite: "2027-09",
    /* Nunca ahorrar por debajo de esto: es la regla que manda.
       El ahorro mensual sale de lo que sobre encima de este piso, así que
       no es parejo — noviembre da poco y de marzo en adelante da más. */
    pisoGastoLibre: 10000,
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
  /* `total` NO se escribe a mano: se calcula sumando lo que sigue pendiente.
     Lo que ya se pagó se marca con `pagado` para dejar el registro. */
  planJulio: {
    fecha: "2026-07-30",
    acciones: [
      { concepto:"Pago 1 de 5 a mamá",             monto:10659.00, tipo:"salida", pagado:"2026-08-01",
        nota:"se recorrió unos días, pero salió del dinero de julio" },
      { concepto:"Adelanto Amex Gold Servicios",   monto:3542.94,  tipo:"salida", pagado:"2026-07-30",
        nota:"fueron 3,542.94, no los 2,882.85 planeados; dejó la tarjeta en cero" },
      { concepto:"Mensualidad de agosto del auto", monto:6209.00,  tipo:"salida", pagado:"2026-07-30",
        nota:"adelantada: agosto ya no la paga" },
      { concepto:"Adelanto Costco Banamex",        monto:2317.03,  tipo:"salida", pagado:"2026-07-27" },
      { concepto:"Adelanto Santander LikeU",       monto:600.00,   tipo:"salida", pagado:"2026-07-27" }
    ]
  },

  /* ── Calendario de vencimientos ── */
  fechasClave: [
    { fecha:"2026-08-03", concepto:"Vence Santander LikeU",     monto:600.00,   tipo:"pagado", nota:"liquidado el 27 de julio" },
    { fecha:"2026-08-03", concepto:"Vence Costco Banamex",      monto:2317.03,  tipo:"pagado", nota:"liquidado el 27 de julio" },
    { fecha:"2026-08-11", concepto:"Vence Amex Gold Servicios", monto:1788.35,  tipo:"cubierto", nota:"cubierto por el adelanto de $2,882.85 del 30 jul" },
    { fecha:"2026-08-15", concepto:"1ª mensualidad auto BYD",   monto:6209.00,  tipo:"pagado",   nota:"adelantada el 30 de julio" },
    { fecha:"2026-08-24", concepto:"Vence Amex Gold Elite",     monto:10922.74, tipo:"pagado",   nota:"liquidada el 14 de agosto, diez días antes" },
    { fecha:"2026-08-30", concepto:"Pago 2 de 5 a mamá",        monto:10659.00, tipo:"salida",   nota:"" },
    { fecha:"2026-09-02", concepto:"Vence Costco Banamex",      monto:2427.70,  tipo:"salida",   nota:"estado de cuenta del corte del 13 de agosto · mínimo $630" },
    { fecha:"2026-09-11", concepto:"Vence Amex Gold Servicios", monto:3994.84,  tipo:"salida",   nota:"gym + último Amazon MSI + consumo de agosto" },
    { fecha:"2026-09-15", concepto:"Mensualidad auto BYD",      monto:6209.00,  tipo:"salida",   nota:"" },
    { fecha:"2026-09-24", concepto:"Vence Amex Gold Elite",     monto:4251.39,  tipo:"salida",   nota:"MSI julio 3/3 + Alo Yoga 2/3 + suscripciones + Headway" },
    { fecha:"2026-09-30", concepto:"Pago 3 de 5 a mamá",        monto:7106.00,  tipo:"salida",   nota:"sujeto a la renegociación" }
  ],

  /* ── Flujo diario de caja ──
     Pagos con fecha y monto reales. Los que dicen `estimado` todavía no
     cortan, así que el monto es cálculo, no dato del banco.
     Aquí NO va gasto diario: el gasto no es parejo (hay días de $1,000 y
     días de $0). El mapa muestra solo movimientos reales con fecha, y el
     gasto libre se maneja como bolsa mensual. */
  flujo: {
    /* Arranca el 16 y no el 1 a propósito: el efectivo de arriba está medido
       el 14, ya con la quincena del 15 adentro. Si la ventana empezara antes,
       el mapa volvería a sumar esa quincena y a restar la Amex que ya se
       pagó. Del 1 al 15 de agosto ya no hay nada que proyectar: pasó. */
    desde: "2026-08-16",
    hasta: "2026-10-31",
    colchonMinimo: 2000,
    /* `previo` = cuánto de ese pago es deuda de ANTES de la ventana (consumo
       de julio, el pago a mamá que se recorrió). No lo genera ningún mes del
       plan: sale del efectivo que ya traías, y por eso hay que restarlo del
       colchón para saber cuánto de ese colchón es de verdad tuyo. */
    pagos: [
      /* El 1 de agosto se pagaron el crédito de julio a mamá ($10,659) y el saldo
         de la Costco ($3,461.26). Ya no aparecen aquí: el efectivo de arriba es
         posterior a los dos. La Costco quedó en CERO ese día. */
      /* La Amex Elite del corte del 3 ($10,922.74) se pagó el 14 de agosto,
         diez días antes de vencer. Ya no aparece aquí: el efectivo de arriba
         es posterior a ese pago. */
      { fecha:"2026-08-30", concepto:"Pago 2 de 5 a mamá",             monto:10659.00, cat:"mama" },
      /* El Costco del 2 de septiembre ya no aparece: se adelantó completo el
         17 de agosto y el efectivo de arriba ya lo refleja. */
      { fecha:"2026-09-03", concepto:"Santander LikeU",                monto:180.00,   cat:"tarjeta", estimado:true, tarjeta:"santander",
        nota:"consumo posterior al corte de julio — el 3 de agosto no debías nada" },
      { fecha:"2026-09-11", concepto:"Amex Gold Servicios",            monto:2387.35,  cat:"tarjeta", estimado:true, tarjeta:"servicios",
        nota:"gym $1,283.40 + último Amazon MSI $504.95 + Sendero $599 del 15 de agosto — el resto del consumo se adelantó" },
      { fecha:"2026-09-15", concepto:"Mensualidad auto BYD",           monto:6209.00,  cat:"auto" },
      { fecha:"2026-09-24", concepto:"Joy Banamex",                    monto:2340.84,  cat:"tarjeta", estimado:true, tarjeta:"joy",
        nota:"último pago del Ticketmaster $1,980.84 + teléfono AT&T $360" },
      { fecha:"2026-09-24", concepto:"Amex Gold Elite",                monto:7543.09,  cat:"tarjeta", estimado:true, tarjeta:"elite",
        nota:"MSI julio 3/3 + Alo Yoga 2/3 + suscripciones + Headway $525 + los $3,291.70 de Perisur del 16 de agosto" },
      { fecha:"2026-09-30", concepto:"Pago 3 de 5 a mamá",             monto:7106.00,  cat:"mama",
        nota:"ya con el reparto que hay que negociar" },
      /* Octubre sale del mismo modelo de cortes: cada pago es lo que cerró en
         el corte anterior de esa tarjeta, con los MSI que siguen vivos. */
      { fecha:"2026-10-02", concepto:"Costco Banamex",                 monto:4613.58,  cat:"tarjeta", estimado:true, tarjeta:"costco",
        nota:"MSI $1,155.58 + gasolina $2,200 + los $1,258 del 14 y 15 de agosto, que entraron después del corte" },
      /* En octubre el Amazon de la Gold Card ya se acabó (último pago en
         agosto): solo queda el gym. Lo que gastes en septiembre se suma. */
      { fecha:"2026-10-11", concepto:"Amex Gold Servicios",            monto:1283.40,  cat:"tarjeta", estimado:true, tarjeta:"servicios",
        nota:"solo el gym — el Amazon MSI terminó en agosto · falta sumarle tu consumo de septiembre" },
      { fecha:"2026-10-15", concepto:"Mensualidad auto BYD",           monto:6209.00,  cat:"auto" },
      { fecha:"2026-10-24", concepto:"Joy Banamex",                    monto:360.00,   cat:"tarjeta", estimado:true, tarjeta:"joy",
        nota:"solo el teléfono AT&T — el Ticketmaster se acaba en septiembre" },
      { fecha:"2026-10-24", concepto:"Amex Gold Elite",                monto:1755.39,  cat:"tarjeta", estimado:true, tarjeta:"elite",
        nota:"Alo Yoga 3/3 + suscripciones — ya sin los MSI de junio y julio" },
      { fecha:"2026-10-30", concepto:"Pago 4 de 5 a mamá",             monto:7106.00,  cat:"mama" }
    ]
  },

  /* ── Horizonte de la proyección de compromisos ── */
  horizonte: { desde: "2026-08", hasta: "2027-09" },

  /* ── Hasta dónde llega el calendario de quincenas ── */
  horizonteIngresos: { hasta: "2027-12" }
};
