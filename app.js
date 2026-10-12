import { fecha, sueldoNeto, aguinaldo, vacaciones, leerMonto, pesos } from './logic.js';

const $ = (id) => document.getElementById(id);
const CLAVE = 'sueldo-ar:datos';
const CAMPOS = ['ag-sueldo', 'ag-semestre', 'ag-anio', 'ag-parcial', 'ag-ingreso', 'ag-egreso', 'ag-metodo', 'ag-sindicato',
  'ne-bruto', 'ne-sindicato', 'va-ingreso', 'va-anio', 'va-sueldo'];

// --- Guardar lo escrito entre sesiones (solo en esta computadora) ---------------
function guardar() {
  const datos = {};
  for (const id of CAMPOS) {
    const el = $(id);
    datos[id] = el.type === 'checkbox' ? el.checked : el.value;
  }
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
}
function restaurar() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch { /* nada guardado */ }
  if (!datos) return false;
  for (const id of CAMPOS) {
    if (!(id in datos)) continue;
    const el = $(id);
    if (el.type === 'checkbox') el.checked = !!datos[id];
    else el.value = datos[id];
  }
  return true;
}

// --- Render de recibos -------------------------------------------------------
function linea(texto, monto, clase = '') {
  const div = document.createElement('div');
  div.className = `linea ${clase}`.trim();
  const a = document.createElement('span');
  a.textContent = texto;
  const b = document.createElement('span');
  b.textContent = monto;
  div.append(a, b);
  return div;
}
function bloque(titulo, grande, sub) {
  const frag = document.createDocumentFragment();
  const t = document.createElement('p');
  t.className = 'titulo';
  t.textContent = titulo;
  const g = document.createElement('p');
  g.className = 'grande';
  g.textContent = grande;
  frag.append(t, g);
  if (sub) {
    const s = document.createElement('p');
    s.className = 'sub';
    s.textContent = sub;
    frag.append(s);
  }
  return frag;
}
function nota(texto, clase = 'nota') {
  const p = document.createElement('p');
  p.className = clase;
  p.textContent = texto;
  return p;
}
function porcentaje(texto) {
  const n = leerMonto(texto || '0');
  return Number.isNaN(n) || n < 0 ? 0 : n / 100;
}

function renderAguinaldo() {
  const caja = $('r-aguinaldo');
  const sueldo = leerMonto($('ag-sueldo').value);
  if (Number.isNaN(sueldo)) {
    caja.replaceChildren(nota('Escribí tu mejor sueldo bruto del semestre para ver cuánto te toca.', 'vacio'));
    return;
  }
  const parcial = $('ag-parcial').checked;
  const r = aguinaldo({
    mejorSueldo: sueldo,
    anio: Number($('ag-anio').value),
    numero: Number($('ag-semestre').value),
    ingreso: parcial ? fecha($('ag-ingreso').value) : null,
    egreso: parcial ? fecha($('ag-egreso').value) : null,
    metodo: $('ag-metodo').value,
    sindicato: porcentaje($('ag-sindicato').value),
  });
  if (r.error) { caja.replaceChildren(nota(r.error, 'error')); return; }
  const lineas = document.createElement('div');
  lineas.className = 'lineas';
  lineas.append(linea(r.completo ? 'Aguinaldo bruto (50% del mejor sueldo)' : 'Aguinaldo bruto proporcional', pesos(r.bruto)));
  for (const d of r.descuentos) lineas.append(linea(`${d.nombre} (${(d.porcentaje * 100).toLocaleString('es-AR')}%)`, `− ${pesos(d.monto)}`, 'menos'));
  lineas.append(linea('Aguinaldo neto', pesos(r.neto), 'total'));
  caja.replaceChildren(
    bloque('Te corresponde cobrar', pesos(r.neto), `Bruto ${pesos(r.bruto)} · se paga hasta el ${r.pago}`),
    lineas,
    nota(r.completo
      ? 'Trabajaste el semestre completo: cobrás la mitad de tu mejor sueldo.'
      : `Trabajaste ${r.diasTrabajados} de ${r.diasSemestre} días del semestre, por eso es proporcional.`),
  );
}

function renderNeto() {
  const caja = $('r-neto');
  const bruto = leerMonto($('ne-bruto').value);
  if (Number.isNaN(bruto)) {
    caja.replaceChildren(nota('Escribí tu sueldo bruto para ver cuánto cobrás en mano.', 'vacio'));
    return;
  }
  const r = sueldoNeto(bruto, { sindicato: porcentaje($('ne-sindicato').value) });
  const lineas = document.createElement('div');
  lineas.className = 'lineas';
  lineas.append(linea('Sueldo bruto', pesos(r.bruto)));
  for (const d of r.descuentos) lineas.append(linea(`${d.nombre} (${(d.porcentaje * 100).toLocaleString('es-AR')}%)`, `− ${pesos(d.monto)}`, 'menos'));
  lineas.append(linea('Sueldo neto', pesos(r.neto), 'total'));
  caja.replaceChildren(
    bloque('Cobrás en mano', pesos(r.neto), `Descuentos: ${pesos(r.totalDescuentos)}`),
    lineas,
    nota('No incluye el impuesto a las ganancias ni el tope de aportes, que afectan solo a sueldos altos.'),
  );
}

function renderVacaciones() {
  const caja = $('r-vacaciones');
  const ingreso = fecha($('va-ingreso').value);
  if (ingreso == null) {
    caja.replaceChildren(nota('Elegí tu fecha de ingreso para ver cuántos días de vacaciones te tocan.', 'vacio'));
    return;
  }
  const sueldo = leerMonto($('va-sueldo').value);
  const r = vacaciones({ ingreso, anio: Number($('va-anio').value), sueldo: Number.isNaN(sueldo) ? null : sueldo });
  if (r.error) { caja.replaceChildren(nota(r.error, 'error')); return; }
  const partes = [bloque('Te corresponden', `${r.dias} días`, r.proporcional ? 'Proporcional: 1 día por cada 20 trabajados' : 'Días corridos')];
  if (r.total != null) {
    const lineas = document.createElement('div');
    lineas.className = 'lineas';
    lineas.append(linea('Valor de cada día (sueldo ÷ 25)', pesos(r.valorDia)));
    lineas.append(linea(`Total por ${r.dias} días de vacaciones`, pesos(r.total), 'total'));
    partes.push(lineas, nota(`Cobrás ${pesos(r.plus)} más que si trabajaras esos días, porque cada día de vacaciones se paga como sueldo ÷ 25 en vez de ÷ 30. Montos brutos.`));
  }
  partes.push(nota(r.proporcional
    ? 'Como trabajaste menos de la mitad de los días hábiles del año, las vacaciones son proporcionales (estimado con días de lunes a viernes).'
    : 'La antigüedad se cuenta al 31 de diciembre: hasta 5 años, 14 días; hasta 10, 21; hasta 20, 28; más de 20, 35.'));
  caja.replaceChildren(...partes);
}

function renderTodo() {
  $('ag-fechas').hidden = !$('ag-parcial').checked;
  renderAguinaldo();
  renderNeto();
  renderVacaciones();
  guardar();
}

// --- Pestañas accesibles ------------------------------------------------------
function iniciarPestanias() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const elegir = (tab) => {
    for (const t of tabs) {
      const activo = t === tab;
      t.setAttribute('aria-selected', String(activo));
      t.tabIndex = activo ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !activo;
    }
    try { localStorage.setItem('sueldo-ar:tab', tab.id); } catch { /* sin almacenamiento */ }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => elegir(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const otro = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      elegir(otro);
      otro.focus();
    });
  });
  let guardada = null;
  try { guardada = localStorage.getItem('sueldo-ar:tab'); } catch { /* nada */ }
  const pedida = location.hash ? `tab-${location.hash.slice(1)}` : guardada;
  const inicial = tabs.find((t) => t.id === pedida);
  if (inicial) elegir(inicial);
}

function valoresIniciales() {
  const hoy = new Date();
  $('ag-anio').value = hoy.getFullYear();
  $('ag-semestre').value = hoy.getMonth() < 6 ? '1' : '2';
  $('va-anio').value = hoy.getFullYear();
}

valoresIniciales();
restaurar();
iniciarPestanias();
document.querySelectorAll('input, select').forEach((el) => {
  el.addEventListener('input', renderTodo);
  el.addEventListener('change', renderTodo);
});
document.querySelectorAll('form').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
renderTodo();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
