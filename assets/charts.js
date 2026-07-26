/* ══════════════════════════════════════════════════════════════════════
   Primitivas de gráfica — SVG puro, sin dependencias.

   Especificaciones fijas: barras de ≤26px con extremo redondeado de 4px
   anclado a la base, separador de 2px en color de superficie entre
   segmentos apilados, líneas de 2px, rejilla de 1px sólida y recesiva.
   Cada gráfica lleva leyenda cuando hay 2+ series y su tabla equivalente
   vive en la interfaz, así ningún valor depende del color.
   ══════════════════════════════════════════════════════════════════════ */

const GAP = 2;        // separador de superficie
const BAR_MAX = 26;   // grosor máximo de barra

/* ── helpers ── */
function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg","g","rect","line","path","text","circle","tspan","polyline","defs","clipPath"]);

function el(tag, attrs, kids) {
  const n = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  (kids || []).forEach(c => c && n.appendChild(c));
  return n;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Mide texto de verdad para poder recortar antes de dibujar: una etiqueta
   nunca se recorta ni se desborda de su propia marca. */
const _measureCtx = document.createElement("canvas").getContext("2d");
function textWidth(str, fontPx, weight) {
  _measureCtx.font = `${weight || 400} ${fontPx}px ${getComputedStyle(document.body).fontFamily}`;
  return _measureCtx.measureText(str).width;
}
function truncate(str, maxPx, fontPx, weight) {
  if (textWidth(str, fontPx, weight) <= maxPx) return str;
  let s = str;
  while (s.length > 1 && textWidth(s + "…", fontPx, weight) > maxPx) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const s of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]) if (v <= s * pow) return s * pow;
  return 10 * pow;
}

/* rectángulo con las dos esquinas superiores redondeadas y la base cuadrada */
function topRoundedRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, Math.max(0, h));
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
         `L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}
/* rectángulo con las dos esquinas derechas redondeadas (barra horizontal) */
function endRoundedRect(x, y, w, h, r) {
  r = Math.min(r, h / 2, Math.max(0, w));
  return `M${x},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} ` +
         `L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x},${y + h} Z`;
}

/* ── tooltip compartido ── */
const TT = document.getElementById("tooltip");

function ttShow(html, ev) {
  TT.innerHTML = html;
  TT.classList.add("on");
  const r = TT.getBoundingClientRect();
  let x = ev.clientX + 16, y = ev.clientY - r.height / 2;
  if (x + r.width > innerWidth - 10) x = ev.clientX - r.width - 16;
  TT.style.left = clamp(x, 10, Math.max(10, innerWidth - r.width - 10)) + "px";
  TT.style.top  = clamp(y, 10, Math.max(10, innerHeight - r.height - 10)) + "px";
}
function ttHide() { TT.classList.remove("on"); }
addEventListener("scroll", ttHide, true);

function ttRows(items, totalLabel, totalVal, fmt) {
  let h = items.filter(i => i.value > 0).map(i =>
    `<div class="tt-row"><span class="lhs"><span class="dot" style="background:${i.color}"></span>${i.label}</span>` +
    `<span class="val">${fmt(i.value)}</span></div>`).join("");
  if (totalLabel != null) {
    h += `<div class="tt-row tt-total"><span>${totalLabel}</span><span class="val">${fmt(totalVal)}</span></div>`;
  }
  return h;
}

/* ══════════════════════════════════════════════════════════════════════
   Columnas apiladas con línea de referencia opcional
   ══════════════════════════════════════════════════════════════════════ */
function stackedColumns(host, opts) {
  host.innerHTML = "";
  const { series, rows, fmt } = opts;
  /* En modo compacto la gráfica cabe entera en pantalla de celular:
     banda más angosta, menos margen y una etiqueta de mes sí y una no. */
  const compact = !!opts.compact;
  const minBand = compact ? 22 : 50;
  const minW = Math.max(opts.minWidth || 0, rows.length * minBand + (compact ? 40 : 66));
  const W = Math.max((host.parentElement || host).clientWidth || 560, minW);
  const H = opts.height || 300;
  const P = compact ? { t: 20, r: 6, b: 22, l: 32 } : { t: 26, r: 12, b: 34, l: 42 };
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b;

  const maxVal = niceMax(Math.max(...rows.map(r => r.total), opts.refValue || 0) * 1.08);
  const y = v => P.t + plotH - (v / maxVal) * plotH;
  const band = plotW / rows.length;
  const bw = Math.min(BAR_MAX, band * (compact ? 0.62 : 0.58));
  const xStep = compact && band < 34 ? 2 : 1;   // etiquetas de mes alternadas

  const svg = el("svg", { class:"chart", width:W, height:H, viewBox:`0 0 ${W} ${H}`,
                          role:"img", "aria-label": opts.aria || "" });

  /* rejilla + eje Y */
  const ticks = compact ? 2 : 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (maxVal / ticks) * i;
    svg.appendChild(el("line", { x1:P.l, x2:W - P.r, y1:y(v), y2:y(v),
      stroke: i === 0 ? css("--axis") : css("--grid"), "stroke-width":1 }));
    svg.appendChild(el("text", { x:P.l - 7, y:y(v) + 4, "text-anchor":"end", "font-size":10,
      fill:css("--ink-muted"), "font-variant-numeric":"tabular-nums",
      text: v === 0 ? "0" : Math.round(v / 1000) + "k" }));
  }

  /* columnas */
  rows.forEach((row, i) => {
    const cx = P.l + band * i + band / 2;
    const x0 = cx - bw / 2;
    let acc = 0;
    const segs = series.map(s => ({ s, v: row.values[s.id] || 0 })).filter(d => d.v > 0);

    segs.forEach((d, si) => {
      const yTop = y(acc + d.v), yBot = y(acc);
      let h = yBot - yTop;
      if (si > 0) h -= GAP;                       // separador de superficie
      if (h > 0.4) {
        svg.appendChild(el("path", {
          d: topRoundedRect(x0, yTop, bw, h, si === segs.length - 1 ? 4 : 0),
          fill: css(d.s.v)
        }));
      }
      acc += d.v;
    });

    /* etiqueta directa del total (secondary encoding para la paleta) */
    if (row.total > 0 && (!compact || i % xStep === 0)) {
      svg.appendChild(el("text", { x:cx, y:y(row.total) - 7, "text-anchor":"middle",
        "font-size": compact ? 9 : 10, fill:css("--ink-2"), "font-variant-numeric":"tabular-nums",
        text: Math.round(row.total / 1000) + "k" }));
    }

    if (i % xStep === 0) {
      svg.appendChild(el("text", { x:cx, y:H - (compact ? 8 : 18), "text-anchor":"middle",
        "font-size": compact ? 9.5 : 10.5, fill:css("--ink-muted"),
        text: compact ? row.label.split(" ")[0] : row.label }));
    }
    if (row.sublabel && !compact) {
      svg.appendChild(el("text", { x:cx, y:H - 6, "text-anchor":"middle", "font-size":9.5,
        fill:css("--ink-faint"), text: row.sublabel }));
    }

    /* zona de hover del ancho completo de la banda */
    svg.appendChild(el("rect", {
      x: P.l + band * i, y: P.t, width: band, height: plotH, fill:"transparent",
      onmousemove: ev => ttShow(
        `<div class="tt-title">${row.tipLabel || row.label}</div>` +
        ttRows(series.map(s => ({ label:s.label, color:css(s.v), value:row.values[s.id] || 0 })),
               opts.totalLabel, row.total, fmt) +
        (opts.tipExtra ? opts.tipExtra(row) : ""), ev),
      onmouseleave: ttHide
    }));
  });

  /* línea de referencia — la etiqueta va sobre la columna más baja
     para que nunca choque con la etiqueta de total de una columna alta */
  if (opts.refValue) {
    const ry = y(opts.refValue);
    svg.appendChild(el("line", { x1:P.l, x2:W - P.r, y1:ry, y2:ry, stroke:css("--ink-2"), "stroke-width":2 }));
    let lowest = 0;
    rows.forEach((r, i) => { if (r.total < rows[lowest].total) lowest = i; });
    const halfW = opts.refLabel.length * 3.1;
    const lx = clamp(P.l + band * lowest + band / 2, P.l + halfW + 2, W - P.r - halfW - 2);
    svg.appendChild(el("text", { x:lx, y:ry - 8, "text-anchor":"middle", "font-size":10.5,
      fill:css("--ink-2"), "font-weight":600, text: opts.refLabel }));
  }

  host.appendChild(svg);
}

/* ══════════════════════════════════════════════════════════════════════
   Barras horizontales, una sola serie (comparar magnitud)
   ══════════════════════════════════════════════════════════════════════ */
function barsH(host, opts) {
  host.innerHTML = "";
  const rows = opts.rows, fmt = opts.fmt;
  const W = (host.parentElement || host).clientWidth || 520;
  const rowH = 34;
  /* El hueco del valor se dimensiona con el texto más largo que se va a
     dibujar, no con una constante, para que nunca se salga del lienzo. */
  const valGutter = Math.ceil(Math.max(...rows.map(r => textWidth(fmt(r.value), 11.5, 500)))) + 14;
  const P = { t: 6, r: 4, b: 6, l: Math.min(opts.labelW || 130, W * 0.4) };
  const H = P.t + P.b + rows.length * rowH;
  const plotW = Math.max(40, W - P.l - P.r - valGutter);
  const maxVal = Math.max(...rows.map(r => r.value));

  const svg = el("svg", { class:"chart", width:W, height:H, viewBox:`0 0 ${W} ${H}`,
                          role:"img", "aria-label": opts.aria || "" });

  rows.forEach((r, i) => {
    const cy = P.t + i * rowH + rowH / 2;
    const bh = Math.min(BAR_MAX * 0.62, 15);
    const w = Math.max(3, (r.value / maxVal) * plotW);

    svg.appendChild(el("text", { x:P.l - 10, y:cy + 4, "text-anchor":"end", "font-size":12,
      fill:css("--ink-2"), text: truncate(r.label, P.l - 14, 12) }));
    svg.appendChild(el("path", {
      d: endRoundedRect(P.l, cy - bh / 2, w, bh, 4), fill: css(opts.color || "--s1") }));
    svg.appendChild(el("text", { x:P.l + w + 9, y:cy + 4, "font-size":11.5, fill:css("--ink"),
      "font-variant-numeric":"tabular-nums", "font-weight":500, text: fmt(r.value) }));

    svg.appendChild(el("rect", {
      x:0, y:P.t + i * rowH, width:W, height:rowH, fill:"transparent",
      onmousemove: ev => ttShow(
        `<div class="tt-title">${r.label}</div>` +
        ttRows([{ label: opts.valueLabel, color: css(opts.color || "--s1"), value: r.value }], null, 0, fmt) +
        (r.detalle ? `<div class="tt-row"><span class="lhs">${r.detalle}</span></div>` : "") +
        `<div class="tt-row tt-total"><span>Del total fijo</span><span class="val">${
          Math.round((r.value / rows.reduce((a, b) => a + b.value, 0)) * 100)}%</span></div>`, ev),
      onmouseleave: ttHide
    }));
  });

  host.appendChild(svg);
}

/* ══════════════════════════════════════════════════════════════════════
   Línea acumulada con crosshair y línea de meta
   ══════════════════════════════════════════════════════════════════════ */
function lineChart(host, opts) {
  host.innerHTML = "";
  const rows = opts.rows, fmt = opts.fmt;
  /* 26px por punto: una serie de 11-14 meses cabe entera en un celular */
  const minW = Math.max(opts.minWidth || 0, rows.length * 26 + 62);
  const W = Math.max((host.parentElement || host).clientWidth || 520, minW);
  const H = opts.height || 250;
  const P = { t: 24, r: 16, b: 30, l: 40 };
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b;
  const maxVal = niceMax(Math.max(...rows.map(r => r.value), opts.refValue || 0) * 1.12);
  const x = i => P.l + (rows.length === 1 ? plotW / 2 : (plotW / (rows.length - 1)) * i);
  const y = v => P.t + plotH - (v / maxVal) * plotH;

  const svg = el("svg", { class:"chart", width:W, height:H, viewBox:`0 0 ${W} ${H}`,
                          role:"img", "aria-label": opts.aria || "" });

  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    svg.appendChild(el("line", { x1:P.l, x2:W - P.r, y1:y(v), y2:y(v),
      stroke: i === 0 ? css("--axis") : css("--grid"), "stroke-width":1 }));
    svg.appendChild(el("text", { x:P.l - 8, y:y(v) + 4, "text-anchor":"end", "font-size":10.5,
      fill:css("--ink-muted"), "font-variant-numeric":"tabular-nums",
      text: v === 0 ? "0" : Math.round(v / 1000) + "k" }));
  }

  if (opts.refValue) {
    const ry = y(opts.refValue);
    svg.appendChild(el("line", { x1:P.l, x2:W - P.r, y1:ry, y2:ry, stroke:css("--ink-2"), "stroke-width":2 }));
    svg.appendChild(el("text", { x:P.l + 5, y:ry - 7, "font-size":10.5, "font-weight":600,
      fill:css("--ink-2"), text: opts.refLabel }));
  }

  const pts = rows.map((r, i) => [x(i), y(r.value)]);
  svg.appendChild(el("path", {
    d: `M${pts[0][0]},${y(0)} ` + pts.map(p => `L${p[0]},${p[1]}`).join(" ") +
       ` L${pts[pts.length - 1][0]},${y(0)} Z`,
    fill: css("--s1"), opacity: 0.10 }));
  svg.appendChild(el("path", { d: "M" + pts.map(p => p.join(",")).join(" L"), fill:"none",
    stroke:css("--s1"), "stroke-width":2, "stroke-linejoin":"round", "stroke-linecap":"round" }));

  const last = pts[pts.length - 1];
  svg.appendChild(el("circle", { cx:last[0], cy:last[1], r:5, fill:css("--s1"),
    stroke:css("--card"), "stroke-width":2 }));
  svg.appendChild(el("text", { x:last[0], y:last[1] - 12, "text-anchor":"end", "font-size":11,
    "font-weight":600, fill:css("--ink"), text: fmt(rows[rows.length - 1].value) }));

  /* una etiqueta cada N puntos, según el espacio real que hay entre ellos */
  const spacing = plotW / Math.max(1, rows.length - 1);
  const step = Math.max(1, Math.ceil(46 / spacing));
  rows.forEach((r, i) => {
    if (i % step === 0 || i === rows.length - 1) {
      svg.appendChild(el("text", { x:x(i), y:H - 10, "text-anchor":"middle", "font-size":10.5,
        fill:css("--ink-muted"), text: r.label }));
    }
  });

  const hair = el("line", { y1:P.t, y2:P.t + plotH, stroke:css("--axis"), "stroke-width":1, opacity:0 });
  const knob = el("circle", { r:5, fill:css("--s1"), stroke:css("--card"), "stroke-width":2, opacity:0 });
  svg.appendChild(hair); svg.appendChild(knob);
  svg.appendChild(el("rect", {
    x:P.l, y:P.t, width:plotW, height:plotH, fill:"transparent",
    onmousemove: ev => {
      const bb = svg.getBoundingClientRect();
      const scale = bb.width / W;
      const rel = (ev.clientX - bb.left) / scale;
      const i = clamp(Math.round((rel - P.l) / plotW * (rows.length - 1)), 0, rows.length - 1);
      hair.setAttribute("x1", x(i)); hair.setAttribute("x2", x(i)); hair.setAttribute("opacity", 1);
      knob.setAttribute("cx", x(i)); knob.setAttribute("cy", y(rows[i].value)); knob.setAttribute("opacity", 1);
      ttShow(`<div class="tt-title">${rows[i].tipLabel || rows[i].label}</div>` +
             ttRows([{ label: opts.valueLabel, color: css("--s1"), value: rows[i].value }], null, 0, fmt) +
             (rows[i].extra || ""), ev);
    },
    onmouseleave: () => { hair.setAttribute("opacity", 0); knob.setAttribute("opacity", 0); ttHide(); }
  }));

  host.appendChild(svg);
}

/* ── leyenda ── */
function legend(host, items) {
  host.innerHTML = "";
  items.forEach(i => host.appendChild(el("span", { class:"legend-item" }, [
    el("span", { class: i.line ? "ln" : "sw", style: "background:" + i.color }),
    el("span", { text: i.label })
  ])));
}
