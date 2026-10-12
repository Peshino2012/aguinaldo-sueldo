// Cálculos de sueldo para trabajadores en relación de dependencia en Argentina
// (Ley de Contrato de Trabajo). Sin DOM ni red: se prueba con node --test.
// Todas las fechas son textos 'AAAA-MM-DD' y se operan en UTC para evitar
// corrimientos por zona horaria.

const DIA_MS = 86400000;

export function fecha(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [a, m, d] = texto.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d);
  const f = new Date(t);
  return f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? t : null;
}

/** Días corridos entre dos fechas, contando ambas puntas. */
export function diasEntre(desde, hasta) {
  return Math.round((hasta - desde) / DIA_MS) + 1;
}

// --- Aportes del trabajador -----------------------------------------------------
export const APORTES = [
  { clave: 'jubilacion', nombre: 'Jubilación', porcentaje: 0.11 },
  { clave: 'pami', nombre: 'PAMI, ley 19.032', porcentaje: 0.03 },
  { clave: 'obraSocial', nombre: 'Obra social', porcentaje: 0.03 },
];

/**
 * Sueldo neto a partir del bruto: descuenta los aportes de ley (17%) y, si se
 * indica, un aporte sindical en porcentaje. No contempla impuesto a las
 * ganancias ni el tope de la base imponible.
 */
export function sueldoNeto(bruto, { sindicato = 0 } = {}) {
  if (!Number.isFinite(bruto) || bruto < 0) return null;
  const descuentos = APORTES.map((a) => ({ ...a, monto: redondear(bruto * a.porcentaje) }));
  if (sindicato > 0) {
    descuentos.push({ clave: 'sindicato', nombre: 'Aporte sindical', porcentaje: sindicato, monto: redondear(bruto * sindicato) });
  }
  const totalDescuentos = redondear(descuentos.reduce((s, d) => s + d.monto, 0));
  return { bruto, descuentos, totalDescuentos, neto: redondear(bruto - totalDescuentos) };
}

// --- Aguinaldo (SAC) ------------------------------------------------------------
export function semestre(anio, numero) {
  const inicio = Date.UTC(anio, numero === 1 ? 0 : 6, 1);
  const fin = Date.UTC(anio, numero === 1 ? 5 : 11, numero === 1 ? 30 : 31);
  return { inicio, fin, dias: diasEntre(inicio, fin) };
}

/**
 * Aguinaldo: la mitad de la mejor remuneración mensual del semestre (LCT arts.
 * 121-122). Si no se trabajó el semestre completo, es proporcional a los días
 * trabajados. Método 'dias': sobre los días reales del semestre (181/182 o 184);
 * método '180': la regla práctica de 180 días que usan muchas liquidaciones.
 */
export function aguinaldo({ mejorSueldo, anio, numero, ingreso = null, egreso = null, metodo = 'dias', sindicato = 0 }) {
  if (!Number.isFinite(mejorSueldo) || mejorSueldo <= 0) return { error: 'Ingresá el mejor sueldo bruto del semestre.' };
  if (numero !== 1 && numero !== 2) return { error: 'Elegí el semestre.' };
  const s = semestre(anio, numero);
  const desde = Math.max(s.inicio, ingreso ?? s.inicio);
  const hasta = Math.min(s.fin, egreso ?? s.fin);
  if (ingreso != null && egreso != null && egreso < ingreso) return { error: 'La fecha de egreso es anterior a la de ingreso.' };
  if (desde > hasta) return { error: 'Con esas fechas no trabajaste en ese semestre.' };
  const trabajados = diasEntre(desde, hasta);
  const divisor = metodo === '180' ? 180 : s.dias;
  const proporcion = Math.min(1, trabajados / divisor);
  const bruto = redondear((mejorSueldo / 2) * proporcion);
  const neto = sueldoNeto(bruto, { sindicato });
  return {
    bruto,
    neto: neto.neto,
    descuentos: neto.descuentos,
    totalDescuentos: neto.totalDescuentos,
    diasTrabajados: trabajados,
    diasSemestre: s.dias,
    completo: proporcion === 1,
    proporcion,
    pago: numero === 1 ? `30 de junio de ${anio}` : `18 de diciembre de ${anio}`,
  };
}

// --- Vacaciones -----------------------------------------------------------------
/** Suma años a una fecha (UTC). Un 29 de febrero cae en 1 de marzo si el año no es bisiesto. */
function sumarAnios(t, anios) {
  const f = new Date(t);
  return Date.UTC(f.getUTCFullYear() + anios, f.getUTCMonth(), f.getUTCDate());
}

/** Días hábiles (lunes a viernes) entre dos fechas, ambas incluidas. */
export function diasHabiles(desde, hasta) {
  let n = 0;
  for (let t = desde; t <= hasta; t += DIA_MS) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

/**
 * Días de vacaciones según LCT art. 150: la antigüedad se cuenta al 31 de
 * diciembre del año de las vacaciones. Hasta 5 años: 14 días corridos; más de
 * 5 y hasta 10: 21; más de 10 y hasta 20: 28; más de 20: 35.
 * Si se trabajó menos de la mitad de los días hábiles del año (art. 153),
 * corresponde 1 día por cada 20 días de trabajo (estimado con días de lunes a viernes).
 * El valor de cada día es el sueldo dividido 25 (art. 155, mensualizados).
 */
export function vacaciones({ ingreso, anio, sueldo = null }) {
  if (ingreso == null) return { error: 'Ingresá tu fecha de ingreso.' };
  const finAnio = Date.UTC(anio, 11, 31);
  if (ingreso > finAnio) return { error: 'La fecha de ingreso es posterior a ese año.' };

  let dias;
  if (finAnio <= sumarAnios(ingreso, 5)) dias = 14;
  else if (finAnio <= sumarAnios(ingreso, 10)) dias = 21;
  else if (finAnio <= sumarAnios(ingreso, 20)) dias = 28;
  else dias = 35;

  let proporcional = false;
  const inicioAnio = Date.UTC(anio, 0, 1);
  if (ingreso > inicioAnio) {
    const trabajados = diasHabiles(ingreso, finAnio);
    const delAnio = diasHabiles(inicioAnio, finAnio);
    if (trabajados < delAnio / 2) {
      dias = Math.floor(trabajados / 20);
      proporcional = true;
    }
  }
  const resultado = { dias, proporcional };
  if (Number.isFinite(sueldo) && sueldo > 0) {
    resultado.valorDia = redondear(sueldo / 25);
    resultado.total = redondear((sueldo / 25) * dias);
    // Lo que se cobra de más frente a un mes normal (sueldo/30 por día).
    resultado.plus = redondear((sueldo / 25 - sueldo / 30) * dias);
  }
  return resultado;
}

// --- Formato --------------------------------------------------------------------
export function redondear(n) {
  return Math.round(n * 100) / 100;
}

const fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pesos = (n) => (n == null || Number.isNaN(n) ? '—' : fmtPesos.format(n));

/** Acepta montos escritos a la argentina: "1.500.000,50", "1500,5" o "1500.5". */
export function leerMonto(texto) {
  if (typeof texto !== 'string') return NaN;
  let t = texto.trim().replace(/\s|\$/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
