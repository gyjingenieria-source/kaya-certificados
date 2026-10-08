'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { REQUIRED_FIELDS } = require('../assets/js/validation.js');
const { validCertificate } = require('./fixtures.cjs');

const root = path.resolve(__dirname, '..');
const confirmations = ['cantidadesConfirmadas', 'documentacionVerificada', 'aprobado'];
const imageFixture = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="white"/><path d="M10 10h50v50H10zM120 10h50v50h-50zM10 120h50v50H10zM80 80h20v20H80zM120 120h50v50h-50z" fill="black"/></svg>';
let browser;
let server;
let baseUrl;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Ruta inválida');
      const content = await fs.readFile(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.KAYA_TEST_CHROMIUM_EXECUTABLE || chromium.executablePath(),
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function newPage(t, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1450, height: 1100 },
    locale: 'es-CO', timezoneId: 'America/Sao_Paulo', ...options,
  });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no hay excepciones de JavaScript'));
  // Los servicios de bandera/QR se simulan: estas pruebas no dependen de la red
  // ni prueban el algoritmo QR de terceros. Sí verifican el estado de su payload.
  await page.route('https://flagcdn.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: imageFixture }));
  await page.route('https://quickchart.io/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: imageFixture }));
  return page;
}

async function openPage(page) {
  await page.goto(baseUrl);
  await page.waitForFunction(() => !document.getElementById('btnPrint').disabled);
}

async function confirmAll(page) {
  for (const field of confirmations) await page.locator('#' + field).check();
}

async function fillCertificate(page) {
  const data = validCertificate();
  await page.evaluate((data) => {
    const form = document.getElementById('certificateForm');
    for (const [key, value] of Object.entries(data)) {
      const field = form.elements.namedItem(key);
      if (!field || field.type === 'checkbox' || field.readOnly) continue;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    for (const item of data.materials) {
      const field = document.getElementById(item.id);
      field.value = item.qty;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, data);
  await confirmAll(page);
}

async function mockPrint(page, { events = true, afterPrint = false } = {}) {
  await page.evaluate(({ events, afterPrint }) => {
    window.__prints = [];
    window.print = () => {
      if (events) window.dispatchEvent(new Event('beforeprint'));
      window.__prints.push({
        state: document.body.dataset.certificateState,
        stamp: document.getElementById('approvalStamp').innerText,
        qr: new URL(document.querySelector('.qr-img').src).searchParams.get('text'),
        signatureVisible: getComputedStyle(document.querySelector('.script-signature')).display !== 'none',
        bannersVisible: Array.from(document.querySelectorAll('.draft-banner')).every((el) => getComputedStyle(el).display !== 'none'),
      });
      if (afterPrint) window.dispatchEvent(new Event('afterprint'));
    };
  }, { events, afterPrint });
}

async function printed(page) {
  await page.waitForFunction(() => window.__prints.length > 0);
  return page.evaluate(() => window.__prints[0]);
}

test('inicio seguro: sin aprobación, firma ni cantidades precargadas; bloquea emisión incompleta', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
  assert.deepEqual(await page.locator('.material-input').evaluateAll((inputs) => inputs.map((input) => input.value)), Array(8).fill(''));
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
  await page.locator('#btnPrint').click();
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
  assert.equal(await page.locator('#validationSummary').isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'validationSummary');
  assert.equal(await page.locator('#cliente').getAttribute('aria-invalid'), 'true');
  await page.locator('#validationErrors a[href="#cliente"]').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cliente');
});

test('marcar aprobación en un formulario incompleto no muestra ni imprime aprobación', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page);
  await confirmAll(page);
  await page.locator('#btnPrint').click();
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
});

for (const field of Object.keys(REQUIRED_FIELDS).filter((field) => !['responsable', 'cargoResponsable', 'pais'].includes(field))) {
  test(`emisión real bloqueada cuando falta ${field}`, async (t) => {
    const page = await newPage(t);
    await openPage(page);
    await mockPrint(page);
    await fillCertificate(page);
    await page.locator('#' + field).fill('');
    await confirmAll(page);
    await page.locator('#btnPrint').click();
    assert.equal(await page.evaluate(() => window.__prints.length), 0);
    assert.equal(await page.locator('#' + field).getAttribute('aria-invalid'), 'true');
  });
}

test('datos completos con cualquiera de las confirmaciones desmarcada no imprimen', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page);
  await fillCertificate(page);
  for (const field of confirmations) {
    await page.locator('#' + field).uncheck();
    await page.locator('#btnPrint').click();
    assert.equal(await page.evaluate(() => window.__prints.length), 0);
    assert.equal(await page.locator('#' + field).getAttribute('aria-invalid'), 'true');
    await page.locator('#' + field).check();
  }
});

test('emisión válida activa aprobación y firma autorizada; después vuelve a borrador', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page, { afterPrint: true });
  await fillCertificate(page);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  await page.locator('#btnPrint').click();
  const result = await printed(page);
  assert.equal(result.state, 'final');
  assert.match(result.stamp, /INSTALACIÓN APROBADA/);
  assert.match(result.qr, /EMISIÓN DEFINITIVA/);
  assert.equal(result.signatureVisible, true);
  assert.equal(result.bannersVisible, false);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
  assert.equal(await page.locator('.kaya-logo').first().getAttribute('src'), 'assets/img/logo-kaya.svg?v=20260604-03');
});

test('borrador incompleto imprime con marca en ambas hojas, QR de borrador y sin firma emitida', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page);
  await page.locator('#btnDraft').click();
  const result = await printed(page);
  assert.equal(result.state, 'draft');
  assert.equal(result.bannersVisible, true);
  assert.equal(result.signatureVisible, false);
  assert.match(result.qr, /BORRADOR - SIN APROBACIÓN EMITIDA/);
  assert.equal(await page.locator('#materialsBody tr').first().locator('td').first().innerText(), '--');
});

test('impresión directa del navegador sigue siendo borrador con todos los datos confirmados', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  assert.equal(await page.locator('.draft-banner').first().isVisible(), true);
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
  assert.match(await page.locator('#approvalStamp').innerText(), /BORRADOR/);
});

test('editar datos o cantidades revoca las tres confirmaciones', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  for (const [field, value] of [['cliente', 'Cliente modificado'], ['qty-ANB100A', '3'], ['soporteDocumental', 'Nueva revisión']]) {
    await page.locator('#' + field).fill(value);
    for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
    await confirmAll(page);
  }
});

test('cantidad vacía, negativa, fraccionaria o todos los componentes en 0 bloquean impresión', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await mockPrint(page);
  await fillCertificate(page);
  for (const value of ['', '-1', '1.5']) {
    await page.locator('#qty-ANB100A').fill(value);
    await confirmAll(page);
    await page.locator('#btnPrint').click();
    assert.equal(await page.evaluate(() => window.__prints.length), 0);
  }
  await page.locator('.material-input').evaluateAll((inputs) => inputs.forEach((input) => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  await confirmAll(page);
  await page.locator('#btnPrint').click();
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
});

test('recupera datos antiguos sin restaurar aprobación ni aceptar la firma de otra persona', async (t) => {
  const page = await newPage(t);
  await page.addInitScript(() => localStorage.setItem('kayaCertificateDraft', JSON.stringify({
    cliente: 'Cliente recuperado', aprobado: true, cantidadesConfirmadas: true,
    documentacionVerificada: true, responsable: 'Otra persona',
    materials: { 'qty-ANB100A': '2', 'qty-EA200EN': '1', 'qty-EA200CA': '1' },
  })));
  await openPage(page);
  assert.equal(await page.locator('#cliente').inputValue(), 'Cliente recuperado');
  assert.equal(await page.locator('#qty-ANB100A').inputValue(), '2');
  assert.equal(await page.locator('#qty-LL200A').inputValue(), '');
  assert.equal(await page.locator('#responsable').inputValue(), 'Ing. Gerardo Montañez');
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
});

test('recargar conserva datos pero exige confirmar nuevamente; borrador guardado no autoriza', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kayaCertificateDraft')));
  for (const id of confirmations) assert.equal(saved[id], false);
  await page.reload();
  assert.equal(await page.locator('#cliente').inputValue(), 'Cliente de prueba');
  assert.equal(await page.locator('#qty-LL200A').inputValue(), '24.75');
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
});

test('borradores corruptos o almacenamiento deshabilitado no impiden iniciar ni validar', async (t) => {
  for (const storageMode of ['corrupt', 'blocked']) {
    const page = await newPage(t);
    await page.addInitScript((mode) => {
      if (mode === 'corrupt') localStorage.setItem('kayaCertificateDraft', '{invalid-json');
      else {
        Storage.prototype.getItem = () => { throw new Error('Storage no disponible'); };
        Storage.prototype.setItem = () => { throw new Error('Storage no disponible'); };
      }
    }, storageMode);
    await openPage(page);
    await mockPrint(page);
    await page.locator('#btnPrint').click();
    assert.equal(await page.evaluate(() => window.__prints.length), 0);
    assert.equal(await page.locator('#validationSummary').isVisible(), true);
  }
});

test('nuevo certificado limpia cantidades y confirmaciones sin cambiar logo ni firmante', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('#btnClear').click();
  assert.equal(await page.locator('#consecutivo').inputValue(), 'KAYA-LATAM-2026-100');
  assert.equal(await page.locator('#descripcion').inputValue(), '');
  assert.equal(await page.locator('#soporteDocumental').inputValue(), '');
  assert.deepEqual(await page.locator('.material-input').evaluateAll((inputs) => inputs.map((input) => input.value)), Array(8).fill(''));
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
  assert.equal(await page.locator('#responsable').inputValue(), 'Ing. Gerardo Montañez');
});

test('error de carga del QR definitivo impide emitir y conserva un borrador', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await mockPrint(page);
  await page.route('https://quickchart.io/**', (route) => {
    const payload = new URL(route.request().url()).searchParams.get('text');
    return payload.includes('EMISIÓN DEFINITIVA') ? route.abort() : route.fulfill({ contentType: 'image/svg+xml', body: imageFixture });
  });
  await page.locator('#btnPrint').click();
  await page.waitForFunction(() => document.getElementById('validationErrors').textContent.includes('No se cargaron'));
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
});

test('cambio silencioso durante la carga del QR impide emitir datos distintos de los revisados', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await mockPrint(page);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  t.after(release);
  await page.route('https://quickchart.io/**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('text').includes('EMISIÓN DEFINITIVA')) await gate;
    await route.fulfill({ contentType: 'image/svg+xml', body: imageFixture });
  });
  await page.locator('#btnPrint').click();
  await page.waitForFunction(() => document.getElementById('emissionStatus').textContent.includes('Preparando'));
  await page.evaluate(() => { document.getElementById('cliente').value = 'Cambio sin evento'; });
  release();
  await page.waitForFunction(() => document.getElementById('validationErrors').textContent.includes('Los datos cambiaron'));
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
});

test('impresión nativa durante la preparación no emite aprobación ni un QR anterior', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await mockPrint(page);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  t.after(release);
  await page.route('https://quickchart.io/**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('text').includes('EMISIÓN DEFINITIVA')) await gate;
    await route.fulfill({ contentType: 'image/svg+xml', body: imageFixture });
  });
  await page.locator('#btnPrint').click();
  await page.waitForFunction(() => document.getElementById('emissionStatus').textContent.includes('Preparando'));
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('body').getAttribute('data-certificate-state'), 'draft');
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
  for (const img of await page.locator('.qr-img').all()) {
    const safe = await img.evaluate((el) => getComputedStyle(el).visibility === 'hidden' ||
      new URL(el.src).searchParams.get('text').includes('BORRADOR - SIN APROBACIÓN EMITIDA'));
    assert.equal(safe, true);
  }
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  release();
  await page.waitForFunction(() => !document.getElementById('btnPrint').disabled &&
    !document.getElementById('aprobado').checked);
  assert.equal(await page.evaluate(() => window.__prints.length), 0);
});

test('última comprobación antes de imprimir detecta un cambio sin evento y retira aprobación', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await mockPrint(page);
  await page.evaluate(() => {
    const capture = window.print;
    window.print = () => {
      document.getElementById('cliente').value = '';
      capture();
    };
  });
  await page.locator('#btnPrint').click();
  const result = await printed(page);
  assert.equal(result.state, 'draft');
  assert.equal(result.signatureVisible, false);
  assert.equal(result.bannersVisible, true);
  assert.match(result.qr, /BORRADOR - SIN APROBACIÓN EMITIDA/);
  for (const id of confirmations) assert.equal(await page.locator('#' + id).isChecked(), false);
});

test('HTML sin JavaScript permanece marcado como borrador y no muestra firma ni aprobación', async (t) => {
  const page = await newPage(t, { javaScriptEnabled: false });
  await page.goto(baseUrl);
  assert.equal(await page.locator('#btnPrint').isDisabled(), true);
  assert.equal(await page.locator('.script-signature').first().isVisible(), false);
  assert.equal(await page.locator('.draft-banner').count(), 2);
  assert.equal(await page.locator('.draft-banner').first().isVisible(), true);
  assert.match(await page.locator('#approvalStamp').innerText(), /BORRADOR/);
});

test('motor de impresión real genera PDF definitivo en dos páginas y PDF directo como borrador', async (t) => {
  const page = await newPage(t);
  await openPage(page);
  await fillCertificate(page);
  await mockPrint(page, { events: false });
  await page.evaluate(() => {
    window.__nativePrints = [];
    window.addEventListener('beforeprint', () => window.__nativePrints.push({
      state: document.body.dataset.certificateState,
      signature: getComputedStyle(document.querySelector('.script-signature')).display !== 'none',
      banners: Array.from(document.querySelectorAll('.draft-banner')).every((el) => getComputedStyle(el).display !== 'none'),
    }));
  });
  await page.locator('#btnPrint').click();
  await printed(page);
  await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
  const finalPdf = await page.pdf({ path: path.join(root, 'test-results/definitivo-prueba.pdf'), preferCSSPageSize: true, printBackground: true });
  assert.equal((finalPdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 2);
  const draftPdf = await page.pdf({ path: path.join(root, 'test-results/borrador-prueba.pdf'), preferCSSPageSize: true, printBackground: true });
  assert.equal((draftPdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 2);
  const captures = await page.evaluate(() => window.__nativePrints);
  assert.deepEqual(captures, [
    { state: 'final', signature: true, banners: false },
    { state: 'draft', signature: false, banners: true },
  ]);
});
