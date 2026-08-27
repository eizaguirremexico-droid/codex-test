import { negocio } from "./config.js";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const partes = (fecha) => {
  const { zona } = negocio.horarioAtencion;
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha);
  const v = (t) => f.find((x) => x.type === t)?.value;
  return {
    dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday")),
    hora: Number(v("hour")) % 24,
    minuto: Number(v("minute")),
  };
};

export const abierto = (fecha = new Date()) => {
  const { dias, abre, cierra } = negocio.horarioAtencion;
  const { dia, hora } = partes(fecha);
  return dias.includes(dia) && hora >= abre && hora < cierra;
};

// "mañana a las 9", "el lunes a las 9" — lo que le sirve al cliente saber.
const cuandoAbre = (fecha) => {
  const { dias, abre, cierra } = negocio.horarioAtencion;
  const { dia, hora } = partes(fecha);

  // Hoy es día hábil y todavía no abren.
  if (dias.includes(dia) && hora < abre) return `hoy a las ${abre}`;

  for (let d = 1; d <= 7; d++) {
    const siguiente = (dia + d) % 7;
    if (!dias.includes(siguiente)) continue;
    if (d === 1) return `mañana a las ${abre}`;
    return `el ${DIAS[siguiente]} a las ${abre}`;
  }
  return `a las ${abre}`;
};

// Esta línea se le antepone al mensaje del cliente, NO al prompt de sistema:
// el prompt tiene que ser idéntico byte a byte o se rompe el cacheo.
export const contexto = (fecha = new Date()) => {
  const { dia, hora, minuto } = partes(fecha);
  const reloj = `${DIAS[dia]} ${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  return abierto(fecha)
    ? `[${reloj}, estamos abiertos]`
    : `[${reloj}, estamos cerrados; abrimos ${cuandoAbre(fecha)}]`;
};
