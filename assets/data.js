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
    /* MEDIDO el 8 de septiembre, DESPUÉS de pagar los $7,420.93 de la Amex
       Elite: vació Banamex y una parte de Mercado Pago para cubrirlo. El
       modelo esperaba solo −$1,544.45 (con el efectivo del 31 de agosto sin
       tocar); la diferencia contra el $0.00 real es dinero que ya traía
       antes y no estaba en este modelo. */
    ahorro: 310.00, asOf: "2026-09-08",
    cuentas: [
      { nombre: "Banamex Priority ···329", monto: 0.00,
        nota: "vaciada el 8 de septiembre para pagar la Amex Elite" },
      /* Mifel se vació: traía $5,100 el 20 de agosto. Es la única cuenta que
         paga rendimiento (~10% a la vista) y quedó casi en cero, mientras que
         el dinero se juntó en la de Banamex, que no paga nada. */
      { nombre: "Mifel ···5910",           monto: 310.00,  nota: "a la vista · ~10% anual" },
      /* Tercera cuenta. Rinde 12% a la vista — más que Mifel y mucho más que
         Banamex. Sigue MEZCLADA con dinero de Felpuditos, sin saber cuál es
         cuál — por eso sigue con `fuera`, aunque ahora esté en $0.00: parte
         de esa mezcla se usó el 8 de septiembre para pagar la Amex Elite,
         junto con todo Banamex. En cuanto separe las dos bolsas (un Apartado
         de Mercado Pago basta) esto deja de importar. */
      { nombre: "Mercado Pago",            monto: 0.00, fuera: true,
        nota: "a la vista · 12% anual · mezclado con dinero de Felpuditos" }
    ],
    /* Quincenas que YA están dentro del saldo de arriba. El calendario de
       ingresos las descuenta para no prometerlas otra vez como dinero por
       llegar: el 15 cayó en sábado y se depositó el viernes 14. */
    quincenasCobradas: ["2026-08-15", "2026-08-30"],
    /* Compromisos que YA salieron de este saldo pero que el modelo sigue
       cobrando en el mes al que pertenecen. Se revierten para recuperar el
       saldo con el que arrancó agosto ($5,500). Adelantar el pago de una
       tarjeta no cambia la bolsa de ningún mes: solo mueve la fecha. */
    compromisosPagados: [
      { concepto: "Amex Gold Elite",       monto: 10922.74, fecha: "2026-08-14" },
      { concepto: "Costco Banamex",        monto: 2427.70,  fecha: "2026-08-17",
        nota: "adelantada · vencía el 2 de septiembre" },
      { concepto: "Amex Gold Servicios",   monto: 2206.49,  fecha: "2026-08-17",
        nota: "adelantada antes de su corte del 22" },
      { concepto: "Pago 2 de 5 a mamá",    monto: 10659.00, fecha: "2026-08-30" },
      { concepto: "Amex Gold Servicios",   monto: 341.00,   fecha: "2026-08-31",
        nota: "adelantada · vencía el 11 de septiembre" },
      { concepto: "BBVA TC M",             monto: 539.02,   fecha: "2026-08-31",
        nota: "adelantada · vencía el 14 de septiembre" }
    ],
    nota: "cierre de agosto · seis adelantos y la quincena del 30 ya adentro"
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
      nota: "se recorrió al 1 de agosto, pero sale del dinero de julio" },
    /* La mensualidad de septiembre se pagó el 26 de agosto, tres semanas
       antes de vencer. Septiembre ya no la paga — pero el dinero salió del
       efectivo de agosto, así que el colchón la absorbe. No crea dinero:
       lo mueve de mes, igual que adelantar una tarjeta. */
    { mes: "2026-09", monto: 6209,
      concepto: "Mensualidad del auto",
      nota: "pagada por adelantado el 26 de agosto con dinero de agosto" },
    /* Adelantó el mes 1 de 4 de la laminadora el mismo 5 de septiembre, con
       el saldo de Mercado Pago. Adelantar unos MSI no ahorra un peso —
       aquí solo mueve el gasto de octubre a septiembre. */
    { mes: "2026-10", monto: 445.34,
      concepto: "Laminadora · mes 1 de 4",
      nota: "adelantada el 5 de septiembre con el saldo de Mercado Pago" },
    /* El estado de cuenta de la Elite del corte del 3 ($7,420.93) se pagó el
       8 de septiembre, antes de que cayera la primera quincena del mes —
       tuvo que salir del efectivo que ya traía (vació Banamex y parte de
       Mercado Pago), no del sueldo de septiembre. De ese pago, $2,967.67 son
       MSI que sí le tocan a septiembre (jul $1,971 + Alo Yoga $996.67); el
       resto es gasto suelto de agosto, ya contado en agosto.
       El estado de cuenta desglosado confirma los dos "MESES EN AUTOMÁTICO
       NACIONAL" del 3 de septiembre ($1,971.00 y $996.67) y el Claude del
       30 de agosto ($350.05) — los tres son compromisos de septiembre que
       ya se pagaron con dinero de antes. */
    { mes: "2026-09", monto: 3317.72,
      concepto: "MSI Elite + Claude de septiembre",
      nota: "pagados el 8 de septiembre con efectivo de antes de la quincena" }
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
    nota: "ACORDADO con ella: los últimos dos pagos repartidos en tres",
    acordado: "2026-08-26"
  },

  /* ── Auto ── */
  /* Del estado de cuenta del crédito PR···4474: $209,800 a 36 recibos, saldo
     pendiente $208,454.87 después del recibo 2. */
  auto: {
    modelo: "BYD King DM-i PHEV 2026",
    financiera: "BBVA",
    credito: 209800, saldoPendiente: 208454.87, recibosPagados: 2,
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
    /* Rol nuevo: le dieron un día más de home office. Antes eran 3 y 3 días
       de oficina por cada dos semanas; ahora son 3 y 2.
       SUPUESTO: la semana A es la del bloque izquierdo del calendario del
       equipo, o sea la que arranca en el `ancla`. Si resulta al revés, hay
       que intercambiar los dos renglones. */
    patron: [
      { nombre: "A", dias: [1, 4, 5] },   // lunes, jueves, viernes
      { nombre: "B", dias: [2, 4] }       // martes, jueves
    ],
    /* CONFIRMADO el 4 de septiembre: los $156 son SOLO LA IDA. Un día de
       oficina son $312 de casetas, no $156 — el modelo llevaba semanas
       contando la mitad. Se nota en las recargas: con $156 salían dos en
       agosto y tú hiciste tres, más otra el 2 de septiembre.
       La comisión son 10 pesos por recarga, sin importar el monto, y el
       saldo NO se pierde: se acumula. Por eso el costo real depende de cada
       cuánto recargas, no solo de cuántos días vas. */
    costoCaseta: 312,
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
       tarjeta la difiere hasta que vence esa tarjeta.
       CONFIRMADO en los movimientos de la LikeU: las recargas aparecen como
       "PAYPAL *PASESERVICI" de $600 (13 y 19 de agosto). Van a la tarjeta, no
       a débito — o sea que no salen de la cuenta el día de la recarga sino
       cuando vence la LikeU. */
    via: "santander",
    nota: "recargas de $600 por PayPal, cargadas a la Santander LikeU"
  },

  /* ── Gastos fijos de vida (todos los meses) ──
     `corto` es el nombre que usan las gráficas, donde el espacio manda.
     El Tag Pase no está aquí: se calcula mes a mes desde `oficina`. */
  vidaFija: [
    /* La gasolina del commute NO es fija al mes: depende de cuántos días vas.
       Medido: el regreso son 44 km (la ida va en eléctrico). A ~5.5 L/100km
       y ~$24.50 el litro son $59.29 por día; se redondea a $65 para dejar
       margen de tráfico, clima y precio. Con 11 días son $715 al mes contra
       los $2,200 fijos que traía el modelo, que se estimaron antes de saber
       que la ida iba en eléctrico. */
    { concepto: "Gasolina · ida a la oficina", corto: "Gasolina", porDia: 65, monto: 715,
      detalle: "44 km de regreso por día de oficina · la ida va en eléctrico", via: "costco" },
    /* Fines de semana y vueltas. ESTIMADO: no hay con qué medirlo todavía
       porque el cargador es nuevo y no hay un mes completo de historia.
       Es el número más flojo del modelo — corregir con el corte del 13 de
       septiembre de la Costco. */
    { concepto: "Gasolina · otros trayectos", corto: "Gas otros", monto: 400,
      detalle: "estimado · falta un mes completo para medirlo", via: "costco" },
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
    /* Todos los sueltos de la Elite del 4 de agosto al 3 de septiembre van
       `pagado:true`: ya están dentro de los $7,420.93 del estado de cuenta
       "ya emitido" del corte del 3, que se pagó el 8 de septiembre. Sin la
       bandera, el mapa de caja los volvía a cobrar aparte el 23 de
       septiembre — se descubrió al mover el pago de la Elite del 23 al 8. */
    { fecha:"2026-08-04", concepto:"Headway (suscripción anual)", monto:525.00, tarjeta:"elite", pagado:true },
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
    /* El saldo de $3,416.00 de la LikeU ya está desglosado y casi nada de él
       es gasto libre:
         · $1,200 de PayPal*PASESERVICI son recargas del tag (13 y 19 de
           agosto). El tag ya va como gasto fijo en `vidaFija`, así que aquí
           NO se cuentan — se contaban dos veces.
         · $2,036.00 de MercadoPago del 15 de agosto los pidió su mamá. El 4
           de septiembre dijo que no los iba a devolver, pero el estado de
           cuenta de la LikeU muestra un "ABONO CARGO TRASPASO" de −$2,036.00
           el 25 de agosto — se revirtió antes de esa conversación. Neto
           cero: no es gasto suyo, no aparece en `gastoLibre`.
       El Samsung del 12 de agosto NO es gasto suelto: es el pago 10 de 18
       de un MSI que arrancó en octubre de 2025 — vive en `msi`, no aquí. */
    /* Cargo de la tarjeta adicional de Aleli — cae en el mismo estado de
       cuenta de la Gold Card. */
    { fecha:"2026-08-11", concepto:"TikTok Shop (adicional de Aleli)",   monto:185.00, tarjeta:"servicios", pagado:true },
    /* La BBVA dejó de estar en ceros. Falta identificar qué fue: su estado de
       cuenta del corte del 24 cerró en $539.02 y solo $160.02 estaban
       registrados, así que hay $379.00 más sin identificar. */
    { fecha:"2026-08-12", concepto:"Cargo sin identificar (BBVA)",       monto:160.02, tarjeta:"bbva", pagado:true },
    { fecha:"2026-08-20", concepto:"Cargos sin identificar (BBVA)",      monto:379.00, tarjeta:"bbva", pagado:true },
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
    { fecha:"2026-08-15", concepto:"330 Sendero Ixtapaluca",             monto:599.00, tarjeta:"servicios", pagado:true },
    /* Tarde en Perisur del 16 de agosto, toda a la Elite. Cae en el corte
       del 3 de septiembre y se paga el 24 de septiembre. */
    { fecha:"2026-08-16", concepto:"MixUp Perisur",                      monto:436.00,  tarjeta:"elite", pagado:true },
    { fecha:"2026-08-16", concepto:"L'Occitane Perisur",                 monto:660.00,  tarjeta:"elite", pagado:true },
    { fecha:"2026-08-16", concepto:"H&M Perisur",                        monto:249.00,  tarjeta:"elite", pagado:true },
    /* En la app salen TRES líneas de $843.70: el cargo, una devolución en
       verde ("Restaurante Mifel") y el cargo otra vez. Es un solo consumo
       que se duplicó y el banco ya revirtió el duplicado: neto uno. */
    { fecha:"2026-08-16", concepto:"Café Bucra Perisur",                 monto:843.70,  tarjeta:"elite", pagado:true,
      nota:"aparece duplicado con su devolución — es un solo cargo" },
    { fecha:"2026-08-16", concepto:"Mango Perisur",                      monto:1103.00, tarjeta:"elite", pagado:true },
    /* A débito, no a tarjeta: reembolso a su mamá por el cargador del BYD que
       ella compró. No tiene nada que ver con el crédito de los $42,636 — es
       gasto suelto y sale de la bolsa del mes. Ya salió de la cuenta. */
    { fecha:"2026-08-17", concepto:"Cargador del BYD (reembolso a mamá)", monto:1000.00, tarjeta:"debito", pagado:true },
    { fecha:"2026-08-18", concepto:"Restaurante La Cuchara 2",           monto:110.00,  tarjeta:"elite", pagado:true },
    { fecha:"2026-08-19", concepto:"Google · FaceApp",                   monto:100.00,  tarjeta:"elite", pagado:true },
    { fecha:"2026-08-19", concepto:"Maison Kayser Tlalpan",              monto:70.00,   tarjeta:"elite", pagado:true },
    /* Datos extra de AT&T, compra de una sola vez. NO es una segunda línea:
       el plan mensual de $360 sigue siendo el de la Joy. Por eso va aquí como
       gasto suelto y no en `vidaFija`. */
    { fecha:"2026-08-19", concepto:"AT&T · datos extra",                 monto:179.00,  tarjeta:"servicios", pagado:true },
    /* Los 3,640 puntos de la Gold Card se aplicaron el 21 de agosto en dos
       créditos: −$185.00 y −$179.00. Salieron a $0.10 por punto, el doble de
       lo que suele pagar Amex por reducir compras. El segundo dejó el AT&T
       de arriba en cero. Va como gasto NEGATIVO: es gasto de agosto que se
       deshizo. */
    { fecha:"2026-08-21", concepto:"Crédito por redención de puntos",    monto:-364.00, tarjeta:"servicios", pagado:true },
    { fecha:"2026-08-23", concepto:"Carl's Jr Bosques Esmeralda",        monto:220.00,  tarjeta:"servicios" },
    /* Tres compras en Costco después del corte del 13: van al corte del 13 de
       septiembre y se pagan el 2 de octubre. Las dos del 26 todavía están
       "en proceso" y por eso no aparecen en el saldo, pero el crédito
       disponible ya bajó.
       El comercio sale como "Costco" a secas, pero ya están identificadas:
       las dos del 26 son regalos, no gasolina. No hay doble cobro. */
    { fecha:"2026-08-21", concepto:"Costco",                             monto:60.00,   tarjeta:"costco" },
    { fecha:"2026-08-26", concepto:"Regalo para Aleli (Costco)",         monto:494.00,  tarjeta:"costco" },
    { fecha:"2026-08-26", concepto:"Regalo para Aleli (Costco)",         monto:85.00,   tarjeta:"costco" },
    { fecha:"2026-08-25", concepto:"Facebook",                           monto:12.49,   tarjeta:"santander" },
    { fecha:"2026-08-30", concepto:"Google",                             monto:129.00,  tarjeta:"elite", pagado:true },
    /* Ajuste para cuadrar contra el estado de cuenta real del corte del 3:
       $7,420.93 = MSI $2,967.67 + Claude $350.05 + $4,103.21 de gasto
       suelto. Lo registrado sumaba $4,225.70, así que sobran $122.49 —
       algún cargo de agosto está de más o con monto inflado. Va negativo
       para que el total cuadre al peso mientras se identifica. */
    { fecha:"2026-08-30", concepto:"Ajuste al corte real (Elite)",       monto:-122.49, tarjeta:"elite", pagado:true },
    { fecha:"2026-08-30", concepto:"Cargos sin identificar (BBVA)",      monto:733.11,  tarjeta:"bbva" },
    { fecha:"2026-08-30", concepto:"Cargos sin identificar (Costco)",    monto:129.00,  tarjeta:"costco" },
    /* ── septiembre ── */
    /* Se compró el 3 pero NO entró al corte de ese día: la app lo agrupa en
       el ciclo "sep 04 - presente", que se paga hasta el 23 de octubre. Va
       fechado el 4 para que caiga en el ciclo correcto — con fecha 3 el
       modelo lo mandaba al pago del 23 de septiembre, que ya está pagado. */
    { fecha:"2026-09-04", concepto:"Google · Cafe Live Video",           monto:119.00,  tarjeta:"elite" },
    { fecha:"2026-09-03", concepto:"Bodega Ayotla (adicional de Aleli)", monto:236.00,  tarjeta:"servicios" },
    { fecha:"2026-09-11", concepto:"Uber Eats (adicional de Aleli)",     monto:300.82,  tarjeta:"servicios" },
    { fecha:"2026-09-03", concepto:"Cargos sin identificar (Costco)",    monto:179.00,  tarjeta:"costco" },
    /* Regalo de cumpleaños para su hermana, pagado de un jalón (no a MSI).
       Cae después del corte del 3, así que se paga hasta el 23 de octubre. */
    { fecha:"2026-09-06", concepto:"Regalo cumpleaños hermana (labial Dior Addict)", monto:970.00, tarjeta:"elite" },
    { fecha:"2026-09-06", concepto:"Café Sirena",                        monto:84.00,   tarjeta:"elite" },
    { fecha:"2026-09-07", concepto:"Maison Kayser Salinas Tlalpan",      monto:160.00,  tarjeta:"elite" },
    /* Cargo distinto al "Google · Cafe Live Video" del 4 de septiembre: mismo
       comercio (mismo texto "GOOGLE *CAFE LIVE VIDE" en el estado de cuenta),
       pero fecha y monto diferentes — confirmado con la captura del 13 de
       septiembre, NO es un duplicado. */
    { fecha:"2026-09-08", concepto:"Google · Cafe Live Video (cargo aparte)", monto:169.00, tarjeta:"elite" },
    /* Cargo del 5 de septiembre, todavía "en proceso" en el estado de cuenta. */
    { fecha:"2026-09-06", concepto:"Tidal",                              monto:74.00,   tarjeta:"santander" },
    { fecha:"2026-09-08", concepto:"Cojines para tu mamá (MercadoPago)", monto:187.60,  tarjeta:"santander" },
    /* Muestras de China para Felpuditos, pagadas con SU tarjeta personal.
       Es gasto del negocio, no suyo — igual que la laminadora, Felpuditos
       debería regresarle este dinero cuando separen las cuentas. Mientras
       tanto sí sale de su bolsa, así que cuenta como gasto libre de
       septiembre hasta que se lo reembolsen. */
    { fecha:"2026-09-08", concepto:"Muestras de China (Felpuditos) — PayPal AISGECO", monto:623.10, tarjeta:"santander",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    /* Confirmó que SkyDropX (paquetería) y Facebook (publicidad) son de
       Felpuditos, pagados con la misma tarjeta personal — mismo patrón que
       las muestras de China y la laminadora. Los $153 y $157 de SkyDropX
       ya se identificaron; el par de +$1.00/-$1.00 del 9 de septiembre neta
       en cero y no se registra. */
    { fecha:"2026-09-09", concepto:"SkyDropX (envío, Felpuditos)",          monto:153.00,  tarjeta:"santander",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    { fecha:"2026-09-09", concepto:"Facebook (publicidad, Felpuditos)",     monto:60.74,   tarjeta:"santander",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    { fecha:"2026-09-11", concepto:"SkyDropX (envío, Felpuditos)",          monto:157.00,  tarjeta:"santander",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    { fecha:"2026-09-12", concepto:"Estacionamiento (Parco)",               monto:28.00,   tarjeta:"santander" },
    { fecha:"2026-09-12", concepto:"Estacionamiento (Parco)",               monto:10.00,   tarjeta:"santander" },
    { fecha:"2026-09-13", concepto:"Vinil (Felpuditos)",                    monto:463.66,  tarjeta:"santander",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    /* Cargos del 7 de septiembre, "en tránsito" en el estado de cuenta. */
    { fecha:"2026-09-07", concepto:"Elevenlabs.io",                      monto:106.94,  tarjeta:"bbva" },
    { fecha:"2026-09-07", concepto:"Uber Eats",                          monto:16.95,   tarjeta:"bbva" },
    /* Corregido con el estado de cuenta real: no eran $355.95, son $339.00. */
    { fecha:"2026-09-07", concepto:"Uber Eats",                          monto:339.00,  tarjeta:"bbva" },
    /* Segundo vinil de la semana, esta vez en la BBVA — igual que el de
       Santander, es insumo de Felpuditos pagado con tarjeta personal. */
    { fecha:"2026-09-08", concepto:"Vinil (Felpuditos, Amazon)",          monto:1286.00, tarjeta:"bbva",
      nota:"gasto del negocio pagado con tarjeta personal · pendiente de reembolso" },
    { fecha:"2026-09-08", concepto:"Pluma (Amazon)",                      monto:20.00,   tarjeta:"bbva" },
    { fecha:"2026-09-11", concepto:"Melimas (suscripción)",                monto:49.90,   tarjeta:"bbva",
      nota:"ya la canceló · este es el último cobro" }
    /* El Maison Kayser de $73 del 25 de agosto se cargó y se devolvió el
       mismo día: neto cero, no se registra. */
  ],

  /* ── Suscripciones ── */
  /* `hasta` = último mes en que se cobra. Sin ese campo, cancelar una
     suscripción la borraba también de los meses en que SÍ se pagó. */
  suscripciones: [
    /* Monto real del estado de cuenta de la Elite: $350.05 el 30 de agosto,
       no los $359.72 que se venían suponiendo. Es cargo en dólares, así que
       se mueve con el tipo de cambio. */
    { servicio: "Claude (Anthropic)", monto: 350.05, nota: "USD $20 · cobrado el 30 de cada mes", tarjeta: "Amex Gold Elite" },
    /* REVIVIÓ. Se había cancelado el 21 de agosto, pero el 5 de septiembre
       volvió a cobrar $399.00 ("OPENAI SAN FRANCISCO" en la Elite). Vuelve
       al modelo desde septiembre: son $399 al mes que no se estaban
       contando. Cae después del corte del 3, así que su primer cobro nuevo
       se paga hasta el 23 de octubre. */
    { servicio: "ChatGPT",            monto: 399.00, desde: "2026-09", tarjeta: "Amex Gold Elite",
      nota: "reactivada · volvió a cobrar el 5 de septiembre" }
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
    /* Corregido con el estado de cuenta real: el pago del 14 de agosto dice
       explícito "9 de 12" (no 7 de 12 como tenía yo) — quedan 3 pagos
       (sep, oct, nov), así que termina en noviembre, no en diciembre. */
    { id:"costco-a",  tarjeta:"Costco Banamex", label:"Amazon",
      montoOriginal:10998, monto:916.50,  desde:"2026-08", hasta:"2026-11", pagados:9, total:12 },
    /* Mismo estado de cuenta: "7 de 12" (no 5 de 12) — quedan 5 pagos
       (sep-ene), termina en enero de 2027, no en febrero. */
    { id:"costco-b",  tarjeta:"Costco Banamex", label:"Amazon",
      montoOriginal:2869,  monto:239.08,  desde:"2026-08", hasta:"2027-01", pagados:7, total:12 },
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
    /* Ottocast Ai Box P3 Pro comprado el 1 de septiembre en MercadoLibre a
       15 MSI. Entra al corte del 24 de septiembre de la BBVA, así que el
       primer pago cae el 14 de octubre y el último el 14 de diciembre de
       2027. Es el plazo más largo de todos sus planes. */
    { id:"bbva-otto", tarjeta:"BBVA TC M", label:"Ottocast Ai Box",
      montoOriginal:3772.32, monto:251.49, desde:"2026-10", hasta:"2027-12", pagados:0, total:15 },
    { id:"joy-tm",    tarjeta:"Joy Banamex", label:"Ticketmaster",
      montoOriginal:5942.50, monto:1980.84, desde:"2026-09", hasta:"2026-09", pagados:2, total:3,
      nota:"último pago · vence el 24 de septiembre" },
    /* Laminadora en frío comprada el 5 de septiembre con la tarjeta Mercado
       Pago recién emitida. Precio de lista $2,375.46, con promo de MeLi
       $2,081.33, y la tarjeta bajó $300 más (20% con tope): pagó $1,781.33.
       Entra al corte del 21 de septiembre, así que el primer pago cae el 1 de
       octubre y el último el 1 de enero. La app marca $445.34 mensuales.
       El mes 1 lo adelantó ese mismo día, así que el corte del 21 de
       septiembre cierra en $0.00 y el 1 de octubre no se debe nada: va como
       prefondeo de octubre. Quedan 3 pagos de $445.33. */
    /* Sudadera $1,790 + otra prenda $1,990 en Abercrombie, compradas el 6 de
       septiembre y diferidas a 3 MSI en la Elite. Compradas después del
       corte del 3, así que el primer pago cae el 23 de octubre y el último
       el 23 de diciembre. */
    { id:"elite-ropa", tarjeta:"Amex Gold Elite", label:"Ropa Abercrombie",
      montoOriginal:3780, monto:1260.00, desde:"2026-10", hasta:"2026-12", pagados:0, total:3 },
    /* Alo Yoga Satélite, comprado el 12 de septiembre a 3 MSI en la Elite.
       Distinto del plan "Alo Yoga Antara" que ya traía corriendo (termina en
       octubre) — este es nuevo. Cae después del corte del 3, así que el
       primer pago es el 23 de octubre y el último el 23 de diciembre. */
    { id:"elite-alo2", tarjeta:"Amex Gold Elite", label:"Alo Yoga Satélite",
      montoOriginal:3690, monto:1230.00, desde:"2026-10", hasta:"2026-12", pagados:0, total:3 },
    { id:"mp-lam",    tarjeta:"Mercado Pago", label:"Laminadora en frío",
      montoOriginal:1781.33, monto:445.33, desde:"2026-10", hasta:"2027-01", pagados:1, total:4,
      nota:"mes 1 adelantado el 5 de septiembre · restan 3 pagos" },
    /* La mesa de inversión de $2,036 del 15 de agosto (la que pidió su mamá)
       se había dado por revertida el 25 de agosto. Reapareció el 11 de
       septiembre como "3msi nueva línea" en la Santander — misma tarjeta,
       mismo monto exacto ($678.67 x 3 = $2,036.01): Mercado Libre la
       recobró, ahora diferida. PENDIENTE DE CONFIRMAR si su mamá la cubre
       esta vez o vuelve a quedar como gasto suyo. */
    { id:"sant-mesa", tarjeta:"Santander LikeU", label:"Mesa de inversión (mamá)",
      montoOriginal:2036.01, monto:678.67, desde:"2026-09", hasta:"2026-11", pagados:1, total:3,
      nota:"recobrada el 11 de septiembre tras la reversión de agosto · sin confirmar quién la paga" },
    /* CONFIRMADO en el estado de cuenta oficial del corte del 12 de agosto
       (página 3, "Compras y cargos diferidos a meses sin interés"): MSI de
       18 meses desde el 28 de octubre de 2025 por $6,894.24, tasa 0%. El
       pago del 12 de agosto fue el 10 de 18 — el mismo cargo que se veía
       "duplicado" en septiembre es el pago 11 de 18, no un error ni fraude.
       Llevaba desde octubre de 2025 sin contarse como compromiso recurrente
       en el modelo; solo se registraba como gasto suelto de un mes. */
    { id:"sant-samsung", tarjeta:"Santander LikeU", label:"Samsung (MSI 18 meses)",
      montoOriginal:6894.24, monto:383.01, desde:"2026-09", hasta:"2027-04", pagados:10, total:18,
      nota:"confirmado en el estado de cuenta del 12 de agosto · pago 10 de 18 ya hecho, restan 8" },
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
      /* Al 19 de agosto los cargos de Perisur ya se aplicaron: el saldo pasó
         de $525.00 a $4,096.70 (los $3,291.70 más $280 de La Cuchara, FaceApp
         y Maison Kayser). Ya no hay nada pendiente. */
      tipo:"revolvente", linea:92000, disponible:81632.00, saldo:9371.00, tasa:61.48,
      /* Estado de cuenta del corte del 3 de septiembre: $7,420.93 con fecha
         límite el 23. Lo pagó anticipado en línea el 8 de septiembre, 15 días
         antes — el pago salió como "pendiente" en la app.
         Confirmado con la captura del 13 de septiembre: saldo $9,371.00,
         disponible $81,632.00, puntos 1,870. Cuadra al peso desde el checkpoint
         anterior ($5,512.00): + Alo Yoga Satélite completo ($3,690.00, ya
         reservado como capital de MSI) + un cargo de Google *Cafe Live Vide
         separado del 8 de septiembre ($169.00, no antes registrado) =
         $9,371.00. El disponible bajó más de lo que explican esos dos cargos
         solos — probablemente porque el capital completo de la ropa
         Abercrombie ($3,780.00, comprada el 6) apenas se reservó contra la
         línea — pero no afecta ningún cálculo de gasto libre, solo la vista
         de la tarjeta. */
      corte:3, vence:23,
      proximoPago:{ fecha:"2026-10-23", monto:5737.72, estimado:true },
      puntos:1870,
      tono:"grafito" },
    { id:"servicios", alias:"Amex Gold Servicios", term:"21009", emisor:"American Express",
      /* Adelantada el 17 de agosto, antes de su corte del 22: quedó en cero.
         Al corte del 22 solo llegan el gym y el último Amazon MSI, así que
         el pago del 11 de septiembre baja de $3,994.84 a $1,788.35. */
      /* Al 26 de agosto: $1,917.40. Cuadra al peso con sus movimientos —
         Sendero $599 + AT&T $179 − $364 de créditos por puntos + gym
         $1,283.40 + Carl's Jr $220, y el Maison Kayser de $73 que se cargó y
         se devolvió el mismo día.
         De ese saldo solo vencen $341.00 el 11 de septiembre: el gym y el
         Carl's Jr entraron el 23, un día DESPUÉS del corte del 22, así que
         se van al estado de cuenta que se paga el 11 de octubre. */
      tipo:"cargo", linea:null, disponible:null, saldo:2040.22, tasa:null,
      /* Tiene tarjeta adicional a nombre de Aleli (cuenta ...21017): su
         gasto cae en este mismo estado de cuenta. */
      adicional: "Aleli Michel Pérez Martínez",
      /* Los $341 del corte del 22 se pagaron el 31 de agosto, adelantados.
         Lo que queda son el gym y el Carl's Jr del 23, más consumo de
         septiembre, que van al corte del 22 y se pagan el 11 de octubre.
         Al 8 de septiembre subió a $1,739.40 — el faltante de $73 contra la
         Bodega Ayotla de $236 era un crédito por redención de Membership
         Rewards del 7 de septiembre, ya identificado. Al 13 de septiembre
         sube a $2,040.22 con el Uber Eats de Aleli ($300.82). */
      corte:22, vence:11, proximoPago:{ fecha:"2026-10-11", monto:2040.22, estimado:true },
      puntos:579,
      tono:"oro" },
    { id:"costco", alias:"Costco Banamex Visa", term:"104", emisor:"Banamex",
      /* Al 26 de agosto. El adelanto del 17 funcionó: el estado de cuenta del
         corte del 13 marca $0.00 a pagar el 2 de septiembre.
         El saldo de $2,473.58 son los cargos del 14 al 21; las dos compras
         del 26 ($494 y $85) siguen "en proceso" y todavía no entran ahí,
         aunque el crédito disponible ya las descontó. */
      /* Confirmado con el estado de cuenta real del corte del 11 de
         septiembre: saldo $4,961.57, disponible $40,912.49, pago para no
         generar intereses $4,961.57 (todo, no hay revolvente), mínimo
         $630.00, fecha límite 5 de octubre. El corte es el 11, no el 13
         como se venía suponiendo, y vence el 5, no el 2. Los 17 movimientos
         del periodo (14 ago - 9 sep) suman exacto: $4,961.57. */
      tipo:"revolvente", linea:50000, disponible:40912.49, saldo:4961.57, tasa:60.58,
      corte:11, vence:5, proximoPago:{ fecha:"2026-10-05", monto:4961.57, estimado:false },
      tono:"azul" },
    /* PRIMER ESTADO DE CUENTA, corte del 24 de agosto: $539.02 con fecha
       límite el 14 de septiembre. Con eso quedan confirmados el corte (24) y
       el vencimiento (14), que era el dato que llevaba semanas faltando.
       Vence ANTES del corte, así que cada corte se paga hasta el mes
       siguiente: 21 días de flote. */
    { id:"bbva", alias:"BBVA TC M", term:"9871", emisor:"BBVA",
      /* Confirmado con el estado de cuenta oficial del corte del 24 de agosto:
         el $539.02 adelantado el 31 de agosto es EXACTO al "pago para no
         generar intereses" de ese corte — cuadra al peso.
         Al 13 de septiembre: $6,863.24. Sube desde el $5,524.29 del 8 de
         septiembre así: el Uber Eats del 7 se corrige de $355.95 a $339.00
         (−$16.95, visto en la app), más el vinil de Felpuditos ($1,286.00),
         un Amazon de $20.00 "en tránsito" y un Merpago*Melimas de $49.90,
         ambos del 8-11 de septiembre y todavía sin identificar. El MSI del
         Ottocast sigue cobrándose a $251.49/mes — esto solo es cómo la app
         reserva el crédito. */
      tipo:"revolvente", linea:81300, disponible:74436.76, saldo:6863.24, tasa:null,
      /* Los $539.02 del primer corte se pagaron el 31 de agosto, adelantados.
         Lo que queda va al corte del 24 de septiembre y se paga el 14 de octubre. */
      corte:24, vence:14, proximoPago:{ fecha:"2026-10-14", monto:1272.13, estimado:true },
      tono:"azul" },
    /* Estado de cuenta del corte del 4 de agosto. El saldo de $1,980.84 NO es
       consumo nuevo: es el capital que falta del Ticketmaster a 3 meses. Por
       eso el pago para no generar intereses del 24 de agosto fue de $360 (el
       AT&T) y no de $2,340.84 — y ese $360 ya se pagó.
       OJO con la comisión por inactividad: $149 + IVA al mes si no le haces
       al menos una compra de $300. El cargo recurrente de AT&T la exenta,
       así que no muevas el teléfono de aquí sin darle otro uso a la tarjeta. */
    { id:"joy", alias:"Joy Banamex", term:"331", emisor:"Banamex",
      tipo:"revolvente", linea:41000, disponible:38659.16, saldo:2340.84, tasa:62.98,
      corte:4, vence:24, proximoPago:{ fecha:"2026-09-24", monto:2340.84, estimado:true },
      tono:"rojo" },
    { id:"santander", alias:"Santander LikeU", term:"6240", emisor:"Santander",
      /* Al 13 de septiembre: $6,385.59. Reconciliado contra el estado de
         cuenta oficial del corte del 12 de agosto (saldo deudor real ese
         día: $180.00, no los supuestos de antes). Desde ahí a hoy: sube por
         el pago 11/18 del MSI Samsung ($383.01, confirmado — ver `msi`), el
         primer pago de la mesa de inversión ($678.67), SkyDropX y Facebook
         (confirmados como envío/publicidad de Felpuditos), estacionamiento
         Parco ($38) y vinil de Felpuditos ($463.66). Con todo lo confirmado
         sigue faltando ~$974 sin identificar — hay movimientos entre el 13
         de agosto y hoy que ninguna captura alcanzó a mostrar. */
      tipo:"revolvente", linea:238500, disponible:232114.41, saldo:6385.59, tasa:null,
      /* corte desconocido. El 31 de julio la app marcaba pago mínimo $0 y pago
         para no generar intereses $0 con límite el 3 de agosto: o sea que los
         $880 son consumo POSTERIOR al último corte y no se deben todavía —
         entran al siguiente estado de cuenta y se pagan el 3 de septiembre. */
      /* CONFIRMADO en la app: la fecha límite de pago es el día 1, no el 3, y
         el pago del 1 de septiembre es de $0.00 — o sea que el último corte
         cerró en cero y TODO el saldo actual es consumo posterior, que se
         cobra hasta el 1 de octubre.
         El corte sigue sin conocerse; `corteSupuesto` asume el estándar de
         ~20 días antes del vencimiento (vence día 1 → corta día 11). */
      corte:null, corteSupuesto:11, vence:1,
      proximoPago:{ fecha:"2026-10-01", monto:6385.59, estimado:true },
      tono:"rojo" },
    /* Emitida el 5 de septiembre de 2026 al comprar la laminadora. Sin
       anualidad, 2% de cashback en MercadoLibre y supermercados. Su único
       saldo son los 4 MSI de la laminadora; no traer nada más aquí sin
       decidirlo antes. Los últimos 4 dígitos todavía no se conocen. */
    /* Al 5 de septiembre, ya con el mes 1 adelantado: el disponible subió de
       $17,118.67 a $17,564.01 y el corte del 21 cierra en $0.00, así que el
       1 de octubre no se debe nada. El siguiente pago real es el 1 de
       noviembre. */
    { id:"mercadopago", alias:"Mercado Pago", term:null, emisor:"Mercado Lending",
      tipo:"revolvente", linea:18900, disponible:17564.01, saldo:1335.99, tasa:null,
      corte:21, vence:1,
      proximoPago:{ fecha:"2026-11-01", monto:445.33 },
      tono:"indigo" }
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
    { fecha:"2026-09-11", concepto:"Vence Amex Gold Servicios", monto:2566.35,  tipo:"salida",   nota:"gym + último Amazon MSI + Sendero + AT&T" },
    { fecha:"2026-09-15", concepto:"Mensualidad auto BYD",      monto:6209.00,  tipo:"salida",   nota:"" },
    { fecha:"2026-09-24", concepto:"Vence Amex Gold Elite",     monto:7823.09,  tipo:"salida",   nota:"MSI julio 3/3 + Alo Yoga 2/3 + suscripciones + Headway" },
    { fecha:"2026-09-30", concepto:"Pago 3 de 5 a mamá",        monto:7106.00,  tipo:"salida",   nota:"sujeto a la renegociación" }
  ],

  /* ── Flujo diario de caja ──
     Pagos con fecha y monto reales. Los que dicen `estimado` todavía no
     cortan, así que el monto es cálculo, no dato del banco.
     Aquí NO va gasto diario: el gasto no es parejo (hay días de $1,000 y
     días de $0). El mapa muestra solo movimientos reales con fecha, y el
     gasto libre se maneja como bolsa mensual. */
  flujo: {
    /* Arranca el 9 y no el 8 a propósito: el efectivo de arriba ya está
       medido AL 8 de septiembre, con el pago de la Elite adentro. Si la
       ventana empezara el 8, el mapa volvería a restarlo — ya se restó al
       llegar a $0.00 en las cuentas. */
    desde: "2026-09-09",
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
      /* La LikeU ya no paga nada el 3 de septiembre: la app confirma $0.00 con
         límite el 1 de septiembre. Todo su saldo es consumo posterior al corte
         y cae hasta el 1 de octubre. */
      /* La BBVA y la Gold Card de septiembre se adelantaron el 31 de agosto. */
      /* El auto de septiembre ya no aparece: se pagó el 26 de agosto. */
      { fecha:"2026-09-24", concepto:"Joy Banamex",                    monto:2340.84,  cat:"tarjeta", estimado:true, tarjeta:"joy",
        nota:"último pago del Ticketmaster $1,980.84 + teléfono AT&T $360" },
      /* El pago de la Elite del 8 de septiembre ($7,420.93, anticipado 15
         días antes del vencimiento del 23) ya no aparece aquí: el efectivo
         de arriba es posterior a ese pago — vació Banamex y parte de
         Mercado Pago para cubrirlo. */
      { fecha:"2026-09-30", concepto:"Pago 3 de 5 a mamá",             monto:7106.00,  cat:"mama",
        nota:"ya con el reparto que hay que negociar" },
      /* Octubre sale del mismo modelo de cortes: cada pago es lo que cerró en
         el corte anterior de esa tarjeta, con los MSI que siguen vivos. */
      { fecha:"2026-10-01", concepto:"Santander LikeU",                monto:6385.59,  cat:"tarjeta", estimado:true, tarjeta:"santander",
        nota:"tag + Samsung $383 + Tidal $74 + cojines $187.60 + muestras de China $623.10 + mesa de inversión 1/3 $678.67 + ~$373 sin identificar — más lo que le cargues de aquí al corte" },
      { fecha:"2026-10-05", concepto:"Costco Banamex",                 monto:4961.57,  cat:"tarjeta", estimado:false, tarjeta:"costco",
        nota:"confirmado con el estado de cuenta real del corte del 11 de septiembre" },
      /* En octubre el Amazon de la Gold Card ya se acabó (último pago en
         agosto): solo queda el gym. Lo que gastes en septiembre se suma. */
      { fecha:"2026-10-14", concepto:"BBVA TC M",                      monto:2003.46,  cat:"tarjeta", estimado:true, tarjeta:"bbva",
        nota:"lo que quedó del adelanto del 31 de agosto + primer pago del Ottocast + $479.84 de consumo suelto del 7 de septiembre (Elevenlabs + 2 Uber Eats)" },
      { fecha:"2026-10-11", concepto:"Amex Gold Servicios",            monto:2040.22,  cat:"tarjeta", estimado:true, tarjeta:"servicios",
        nota:"gym $1,283.40 + Carl's Jr $220 + Bodega Ayotla $236 + Uber Eats de Aleli $300.82 − crédito MR $73 — ya reflejado en el saldo al 13 de septiembre" },
      { fecha:"2026-10-15", concepto:"Mensualidad auto BYD",           monto:6209.00,  cat:"auto" },
      { fecha:"2026-10-24", concepto:"Joy Banamex",                    monto:360.00,   cat:"tarjeta", estimado:true, tarjeta:"joy",
        nota:"solo el teléfono AT&T — el Ticketmaster se acaba en septiembre" },
      /* Vence el 23, no el 24 — con la fecha mal, el regalo del 6 de
         septiembre no se agrupaba aquí y salía como evento aparte.
         El monto traía $399 de ChatGPT, que se canceló en agosto, y le
         faltaba el primer pago de la ropa. */
      /* El ciclo "sep 04 - presente" venía con $5,512.00 en 6 movimientos, más
         el Alo Yoga Satélite de $3,690 del 12 de septiembre a 3 MSI. Al corte
         del 3 de octubre, los $3,780 de la ropa se cambian por su primer pago
         de $1,260 y los $3,690 del Alo Yoga nuevo por su primer pago de
         $1,230, y se suman el Alo Yoga Antara 3/3 y el Claude del 30. */
      { fecha:"2026-10-23", concepto:"Amex Gold Elite",                monto:5737.72,  cat:"tarjeta", estimado:true, tarjeta:"elite",
        nota:"ropa 1/3 $1,260 + Alo Yoga Satélite 1/3 $1,230 + Alo Yoga Antara 3/3 $996.67 + regalo $970 + OpenAI $399 + Claude $350.05 + Maison Kayser $160 + Google $119 + Google (cargo aparte) $169 + Café Sirena $84" },
      { fecha:"2026-10-30", concepto:"Pago 4 de 5 a mamá",             monto:7106.00,  cat:"mama" }
    ]
  },

  /* ── Horizonte de la proyección de compromisos ── */
  /* Llega hasta diciembre de 2027 para alcanzar el último pago del Ottocast:
     con el horizonte en septiembre, sus tres últimas mensualidades quedaban
     fuera del modelo. */
  horizonte: { desde: "2026-08", hasta: "2027-12" },

  /* ── Hasta dónde llega el calendario de quincenas ── */
  horizonteIngresos: { hasta: "2027-12" }
};
