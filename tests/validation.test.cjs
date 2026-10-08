'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REQUIRED_FIELDS, MATERIAL_RULES, validateCertificate, isValidDate } = require('../assets/js/validation.js');
const { validCertificate } = require('./fixtures.cjs');

test('acepta datos completos y aprobación, revisión y cantidades confirmadas', () => {
  assert.deepEqual(validateCertificate(validCertificate()), { valid: true, errors: [] });
});

test('observaciones adicionales son opcionales', () => {
  const data = validCertificate();
  data.observaciones = '';
  assert.equal(validateCertificate(data).valid, true);
});

for (const field of Object.keys(REQUIRED_FIELDS)) {
  test(`bloquea ${field} vacío, espacios, marcador o ausente`, () => {
    for (const value of ['', '   ', '--', undefined]) {
      const data = validCertificate();
      data[field] = value;
      const result = validateCertificate(data);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((error) => error.field === field));
    }
  });
}

for (const field of ['aprobado', 'documentacionVerificada', 'cantidadesConfirmadas']) {
  test(`exige confirmación booleana expresa para ${field}`, () => {
    for (const value of [false, undefined, 'true', 'false', 1]) {
      const data = validCertificate();
      data[field] = value;
      assert.ok(validateCertificate(data).errors.some((error) => error.field === field));
    }
  });
}

for (const rule of MATERIAL_RULES) {
  test(`${rule.ref}: bloquea cantidad vacía, negativa, inválida o no declarada`, () => {
    for (const value of ['', '-1', 'NaN', 'Infinity', '1e3', '   ', undefined]) {
      const data = validCertificate();
      data.materials.find((item) => item.id === rule.id).qty = value;
      assert.ok(validateCertificate(data).errors.some((error) => error.field === rule.id));
    }
    const data = validCertificate();
    data.materials = data.materials.filter((item) => item.id !== rule.id);
    assert.ok(validateCertificate(data).errors.some((error) => error.field === rule.id));
  });
}

test('las piezas no admiten fracciones; el cable admite metros con dos decimales', () => {
  for (const rule of MATERIAL_RULES.filter((item) => item.unit === 'ud')) {
    const data = validCertificate();
    data.materials.find((item) => item.id === rule.id).qty = '1.5';
    assert.equal(validateCertificate(data).valid, false);
  }
  for (const value of ['0.01', '24.75', '24.7']) {
    const data = validCertificate();
    data.materials.find((item) => item.id === 'qty-LL200A').qty = value;
    assert.equal(validateCertificate(data).valid, true);
  }
  const data = validCertificate();
  data.materials.find((item) => item.id === 'qty-LL200A').qty = '24.751';
  assert.equal(validateCertificate(data).valid, false);
});

test('0 es una declaración explícita; todos los componentes en 0 no permiten emitir', () => {
  const data = validCertificate();
  data.materials[1].qty = '0';
  assert.equal(validateCertificate(data).valid, true);
  data.materials.forEach((item) => { item.qty = '0'; });
  assert.equal(validateCertificate(data).valid, false);
});

test('rechaza cantidades duplicadas, entrada inválida del navegador y enteros inseguros', () => {
  const duplicate = validCertificate();
  duplicate.materials.push({ ...duplicate.materials[0] });
  assert.equal(validateCertificate(duplicate).valid, false);
  const badInput = validCertificate();
  badInput.materials[0].badInput = true;
  assert.equal(validateCertificate(badInput).valid, false);
  const unsafe = validCertificate();
  unsafe.materials[0].qty = '9007199254740992';
  assert.equal(validateCertificate(unsafe).valid, false);
});

test('valida fechas reales, incluidos años bisiestos', () => {
  for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '08/10/2026', '0000-01-01']) {
    assert.equal(isValidDate(value), false);
    const data = validCertificate();
    data.fecha = value;
    assert.equal(validateCertificate(data).valid, false);
  }
  assert.equal(isValidDate('2028-02-29'), true);
});

test('no permite un firmante distinto para la firma corporativa disponible', () => {
  for (const field of ['responsable', 'cargoResponsable']) {
    const data = validCertificate();
    data[field] = 'Otra persona / cargo';
    assert.equal(validateCertificate(data).valid, false);
  }
});

test('rechaza un país fuera del selector y componentes omitidos', () => {
  const data = validCertificate();
  data.pais = 'País desconocido';
  assert.equal(validateCertificate(data).valid, false);
  delete data.materials;
  assert.equal(validateCertificate(data).valid, false);
});
