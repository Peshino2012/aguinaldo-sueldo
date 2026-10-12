import test from 'node:test';
import assert from 'node:assert/strict';
import { fecha, diasEntre, sueldoNeto, semestre, aguinaldo, vacaciones, diasHabiles, leerMonto, pesos } from '../logic.js';

test('fechas: valida el formato y días inexistentes', () => {
  assert.equal(fecha('2026-02-30'), null);
  assert.equal(fecha('30/12/2026'), null);
  assert.equal(diasEntre(fecha('2026-10-01'), fecha('2026-12-31')), 92);
});

test('sueldo neto: descuenta 11% + 3% + 3% y el sindicato si se indica', () => {
  const r = sueldoNeto(1000000);
  assert.deepEqual(r.descuentos.map((d) => d.monto), [110000, 30000, 30000]);
  assert.equal(r.totalDescuentos, 170000);
  assert.equal(r.neto, 830000);
  assert.equal(sueldoNeto(1000000, { sindicato: 0.02 }).neto, 810000);
  assert.equal(sueldoNeto(-1), null);
});

test('semestres: días reales, con año bisiesto', () => {
  assert.equal(semestre(2026, 1).dias, 181);
  assert.equal(semestre(2028, 1).dias, 182);
  assert.equal(semestre(2026, 2).dias, 184);
});

test('aguinaldo completo: la mitad del mejor sueldo', () => {
  const r = aguinaldo({ mejorSueldo: 1000000, anio: 2026, numero: 2 });
  assert.equal(r.bruto, 500000);
  assert.equal(r.neto, 415000);
  assert.equal(r.completo, true);
  assert.equal(r.pago, '18 de diciembre de 2026');
});

test('aguinaldo proporcional por días, con los dos métodos', () => {
  const base = { mejorSueldo: 1000000, anio: 2026, numero: 2, ingreso: fecha('2026-10-01') };
  const dias = aguinaldo(base);
  assert.equal(dias.diasTrabajados, 92);
  assert.equal(dias.bruto, 250000);
  assert.equal(aguinaldo({ ...base, metodo: '180' }).bruto, 255555.56);
  // Con 180 días nunca supera el aguinaldo completo.
  assert.equal(aguinaldo({ mejorSueldo: 1000000, anio: 2026, numero: 2, metodo: '180' }).bruto, 500000);
  // Egreso en el medio del semestre.
  const egreso = aguinaldo({ mejorSueldo: 1000000, anio: 2026, numero: 1, egreso: fecha('2026-03-31') });
  assert.equal(egreso.diasTrabajados, 90);
  assert.equal(egreso.bruto, Math.round(500000 * 90 / 181 * 100) / 100);
});

test('aguinaldo: errores entendibles', () => {
  assert.match(aguinaldo({ mejorSueldo: 0, anio: 2026, numero: 1 }).error, /mejor sueldo/);
  assert.match(aguinaldo({ mejorSueldo: 1, anio: 2026, numero: 1, ingreso: fecha('2026-08-01') }).error, /no trabajaste/);
  assert.match(aguinaldo({ mejorSueldo: 1, anio: 2026, numero: 2, ingreso: fecha('2026-08-01'), egreso: fecha('2026-07-01') }).error, /anterior/);
});

test('vacaciones: días según antigüedad al 31 de diciembre (LCT art. 150)', () => {
  assert.equal(vacaciones({ ingreso: fecha('2021-12-31'), anio: 2026 }).dias, 14); // justo 5 años
  assert.equal(vacaciones({ ingreso: fecha('2021-12-30'), anio: 2026 }).dias, 21);
  assert.equal(vacaciones({ ingreso: fecha('2016-12-31'), anio: 2026 }).dias, 21); // justo 10 años
  assert.equal(vacaciones({ ingreso: fecha('2016-12-30'), anio: 2026 }).dias, 28);
  assert.equal(vacaciones({ ingreso: fecha('2006-12-31'), anio: 2026 }).dias, 28); // justo 20 años
  assert.equal(vacaciones({ ingreso: fecha('2006-12-30'), anio: 2026 }).dias, 35);
});

test('vacaciones: menos de medio año trabajado → 1 día cada 20 (art. 153)', () => {
  assert.equal(diasHabiles(fecha('2026-01-01'), fecha('2026-12-31')), 261);
  const r = vacaciones({ ingreso: fecha('2026-10-01'), anio: 2026 });
  assert.equal(r.proporcional, true);
  assert.equal(r.dias, 3); // 66 días hábiles / 20
  const completo = vacaciones({ ingreso: fecha('2026-03-02'), anio: 2026 });
  assert.deepEqual([completo.dias, completo.proporcional], [14, false]);
  assert.match(vacaciones({ ingreso: fecha('2027-01-05'), anio: 2026 }).error, /posterior/);
});

test('vacaciones: valor del día = sueldo / 25 y plus frente a un mes normal', () => {
  const r = vacaciones({ ingreso: fecha('2020-03-01'), anio: 2026, sueldo: 1000000 });
  assert.equal(r.dias, 21);
  assert.equal(r.valorDia, 40000);
  assert.equal(r.total, 840000);
  assert.equal(r.plus, 140000);
});

test('montos a la argentina y formato en pesos', () => {
  assert.equal(leerMonto('1.250.000,50'), 1250000.5);
  assert.equal(leerMonto('$ 800.000'), 800000);
  assert.ok(Number.isNaN(leerMonto('')));
  assert.equal(pesos(1234.5).replace(/\s/g, ' '), '$ 1.234,50');
});
