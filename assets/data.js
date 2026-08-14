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
  efectivo: {
    ahorro: 7011.18, asOf: "2026-08-14",
    cuenta: "Santander Priority ...329 (nómina)",
    /* Quincenas que YA están dentro del saldo de arriba. El calendario de
       ingresos las descuenta para no prometerlas otra vez como dinero por
       llegar: el 15 cayó en sábado y se depositó el viernes 14. */
    quincenasCobradas: ["2026-08-15"],
    compromisoPagado: 10922.74,    /* Amex Elite, liquidada el 14 de agosto */
    nota: "medido el 14 de agosto, ya sin la Amex Elite"
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
    { concepto: "Teléfono",             corto: "Teléfono", monto: 350,
      detalle: "cargo mensual — falta confirmar dónde se cobra", via: "tarjetas" }
  ],

  /* ── Gasto libre ya hecho ──
     Esto NO es compromiso: es tu bolsa del mes, ya gastada. Sirve para dos
     cosas: restarlo de lo que te queda por gastar, y saber en qué corte cae
     para que salga de la cuenta el día correcto. */
  gastoLibre: [
    { fecha:"2026-08-01", concepto:"Restaurante LCDP Galerías", monto:445.50, tarjeta:"servicios" },
    { fecha:"2026-08-01", concepto:"Liverpool Atizapán",        monto:278.60, tarjeta:"servicios" },
    { fecha:"2026-08-01", concepto:"Miniso Cúspide",            monto:329.80, tarjeta:"servicios" },
    { fecha:"2026-08-01", concepto:"Cinépolis dulcería",        monto:728.00, tarjeta:"servicios" },
    { fecha:"2026-08-04", concepto:"Headway (suscripción anual)", monto:525.00, tarjeta:"elite" },
    /* Cargos a la Costco después de liquidarla el 1 de agosto.
       El cargo de $824.70 del 7 de agosto NO está aquí: es la gasolina,
       que ya se cuenta como gasto fijo. Meterla también aquí la cobraría
       dos veces. */
    { fecha:"2026-08-02", concepto:"Tesco China",                monto:248.00, tarjeta:"costco" },
    { fecha:"2026-08-05", concepto:"Restaurante La Cuchara",     monto:110.00, tarjeta:"costco" },
    { fecha:"2026-08-06", concepto:"Clip",                       monto:150.00, tarjeta:"costco" },
    /* Diferencia entre el saldo medido de la Gold Card ($2,021.49) y los
       cuatro cargos del 1 de agosto. Falta identificar qué fue. */
    { fecha:"2026-08-06", concepto:"Cargos sin identificar (Gold Card)", monto:239.59, tarjeta:"servicios" },
    { fecha:"2026-08-06", concepto:"Cargo sin identificar (LikeU)",      monto:180.00, tarjeta:"santander" },
    /* Cargo de la tarjeta adicional de Aleli — cae en el mismo estado de
       cuenta de la Gold Card. */
    { fecha:"2026-08-11", concepto:"TikTok Shop (adicional de Aleli)",   monto:185.00, tarjeta:"servicios" },
    /* La BBVA dejó de estar en ceros. Falta identificar qué fue. */
    { fecha:"2026-08-12", concepto:"Cargo sin identificar (BBVA)",       monto:160.02, tarjeta:"bbva" }
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
      tipo:"revolvente", linea:92000, disponible:87510, saldo:525.00, tasa:61.48,
      corte:3, vence:24,
      proximoPago:{ fecha:"2026-09-24", monto:4251.39, estimado:true },
      puntos:4040,
      tono:"grafito" },
    { id:"servicios", alias:"Amex Gold Servicios", term:"21009", emisor:"American Express",
      tipo:"cargo", linea:null, disponible:null, saldo:2206.49, tasa:null,
      /* El pago del 11 de septiembre = gym $1,283.40 + último Amazon MSI
         $504.95 + los $2,206.49 de consumo de agosto. */
      /* Tiene tarjeta adicional a nombre de Aleli (cuenta ...21017): su
         gasto cae en este mismo estado de cuenta. */
      adicional: "Aleli Michel Pérez Martínez",
      corte:22, vence:11, proximoPago:{ fecha:"2026-09-11", monto:3994.84, estimado:true },
      puntos:4413,
      tono:"oro" },
    { id:"costco", alias:"Costco Banamex Visa", term:"104", emisor:"Banamex",
      tipo:"revolvente", linea:50000, disponible:42471.78, saldo:2427.70, tasa:60.58,
      /* Corte del 13 de agosto YA EMITIDO: pago para no generar intereses
         $2,427.70, mínimo $630.00, fecha límite 2 de septiembre. Ya no es
         estimación — es el estado de cuenta. Estaba modelado en $1,997.11
         (MSI + gasolina) y le faltaban $430.59 de consumo del ciclo.
         Ojo: vence el 2, no el 3 como se venía suponiendo. */
      corte:13, vence:2, proximoPago:{ fecha:"2026-09-02", monto:2427.70 },
      tono:"azul" },
    /* Ya estrenada, pero todavía sin estado de cuenta: la app marca "Tu
       próximo pago —", así que sigue sin conocerse el corte ni el
       vencimiento. Hasta que salga el primero, su saldo no tiene fecha de
       pago en el flujo. */
    { id:"bbva", alias:"BBVA TC M", term:"9871", emisor:"BBVA",
      tipo:"revolvente", linea:81300, disponible:81139.98, saldo:160.02, tasa:null,
      corte:null, vence:null, proximoPago:null,
      tono:"azul" },
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
      { concepto:"Pago 1 de 5 a mamá",             monto:10659.00, tipo:"salida" },
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
      { fecha:"2026-09-02", concepto:"Costco Banamex",                 monto:2427.70,  cat:"tarjeta", tarjeta:"costco",
        nota:"estado de cuenta emitido del corte del 13 de agosto · mínimo $630" },
      { fecha:"2026-09-03", concepto:"Santander LikeU",                monto:180.00,   cat:"tarjeta", estimado:true, tarjeta:"santander",
        nota:"consumo posterior al corte de julio — el 3 de agosto no debías nada" },
      { fecha:"2026-09-11", concepto:"Amex Gold Servicios",            monto:3994.84,  cat:"tarjeta", estimado:true, tarjeta:"servicios",
        nota:"gym $1,283.40 + último Amazon MSI $504.95 + consumo de agosto $2,206.49" },
      { fecha:"2026-09-15", concepto:"Mensualidad auto BYD",           monto:6209.00,  cat:"auto" },
      { fecha:"2026-09-24", concepto:"Amex Gold Elite",                monto:4251.39,  cat:"tarjeta", estimado:true, tarjeta:"elite",
        nota:"MSI julio 3/3 + Alo Yoga 2/3 + suscripciones + Headway $525, que entró después del corte del 3" },
      { fecha:"2026-09-30", concepto:"Pago 3 de 5 a mamá",             monto:7106.00,  cat:"mama",
        nota:"ya con el reparto que hay que negociar" },
      /* Octubre sale del mismo modelo de cortes: cada pago es lo que cerró en
         el corte anterior de esa tarjeta, con los MSI que siguen vivos. */
      { fecha:"2026-10-02", concepto:"Costco Banamex",                 monto:3355.58,  cat:"tarjeta", estimado:true, tarjeta:"costco",
        nota:"MSI + gasolina del ciclo — baja a $1,156 si la dejas en cero antes del corte" },
      /* En octubre el Amazon de la Gold Card ya se acabó (último pago en
         agosto): solo queda el gym. Lo que gastes en septiembre se suma. */
      { fecha:"2026-10-11", concepto:"Amex Gold Servicios",            monto:1283.40,  cat:"tarjeta", estimado:true, tarjeta:"servicios",
        nota:"solo el gym — el Amazon MSI terminó en agosto · falta sumarle tu consumo de septiembre" },
      { fecha:"2026-10-15", concepto:"Mensualidad auto BYD",           monto:6209.00,  cat:"auto" },
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
