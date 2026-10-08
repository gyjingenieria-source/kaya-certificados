'use strict';

const form = document.getElementById('certificateForm');
const materialInputs = Array.from(document.querySelectorAll('.material-input'));
const qrImages = Array.from(document.querySelectorAll('.qr-img'));
const kayaLogoImages = Array.from(document.querySelectorAll('.kaya-logo'));
const printButtons = ['btnPrint', 'btnDraft'].map((id) => document.getElementById(id));
const validationSummary = document.getElementById('validationSummary');
const validationErrors = document.getElementById('validationErrors');
const emissionStatus = document.getElementById('emissionStatus');
const { validateCertificate, isValidQuantity } = KayaValidation;

const KAYA_LOGO_URL = 'assets/img/logo-kaya.svg?v=20260604-03';
const FLAG_BASE_URL = 'https://flagcdn.com';
const QR_BASE_URL = 'https://quickchart.io/qr';
const DRAFT_KEY = 'kayaCertificateDraft';
const CONFIRMATION_FIELDS = ['cantidadesConfirmadas', 'documentacionVerificada', 'aprobado'];

const fields = Object.fromEntries([
  'consecutivo', 'fecha', 'pais', 'ciudad', 'cliente', 'proyecto', 'sistema',
  'referencia', 'descripcion', 'instalador', 'responsable', 'cargoResponsable',
  'observaciones', 'soporteDocumental', ...CONFIRMATION_FIELDS,
].map((id) => [id, document.getElementById(id)]));

const preview = Object.fromEntries([
  'consecutivo', 'fecha', 'ciudad', 'cliente', 'proyecto', 'sistema', 'referencia',
  'descripcion', 'instalador', 'responsable', 'cargoResponsable', 'observaciones',
  'soporteDocumental',
].map((id) => [id, document.getElementById('v' + id[0].toUpperCase() + id.slice(1))]));
preview.approvalStamp = document.getElementById('approvalStamp');
preview.materialsBody = document.getElementById('materialsBody');

let printIntent = null;
let preparedSnapshot = null;
let printPrepared = false;
let preparingPrint = false;
let validationAttempted = false;

function valueOrDash(value) {
  return value && value.trim() ? value.trim() : '--';
}

function formatDate(dateValue) {
  if (!dateValue) return '--';
  const [year, month, day] = dateValue.split('-');
  return day + '/' + month + '/' + year;
}

function readCertificate() {
  const data = Object.fromEntries(Object.entries(fields).map(([key, field]) =>
    [key, field.type === 'checkbox' ? field.checked : field.value]));
  // Conservar el valor crudo: vacío no equivale a 0, ni NaN a ausencia de uso.
  data.materials = materialInputs.map((input) => ({
    id: input.id, qty: input.value, ref: input.dataset.ref, desc: input.dataset.desc,
    unit: input.dataset.unit, badInput: input.validity.badInput,
  }));
  return data;
}

function setImageSource(img, src) {
  if (img.getAttribute('src') !== src) img.src = src;
  img.loading = 'eager';
  img.decoding = 'sync';
}

function updateFlags() {
  const option = fields.pais.options[fields.pais.selectedIndex];
  const country = option ? option.value : '--';
  ['vFlag', 'vFlag2'].forEach((id) => {
    const img = document.getElementById(id);
    if (option) setImageSource(img, FLAG_BASE_URL + '/' + option.dataset.code + '.svg');
    else img.removeAttribute('src');
    img.alt = 'Bandera de ' + country;
  });
  ['vPais', 'vPais2'].forEach((id) => { document.getElementById(id).textContent = country; });
}

function buildQrPayload(data) {
  const finalDocument = document.body.dataset.certificateState === 'final';
  const materials = data.materials.filter((item) =>
    isValidQuantity(item.qty, item.unit) && Number(item.qty) > 0)
    .map((item) => item.qty + ' ' + item.unit + ' x ' + item.ref).join(', ');
  return [
    'KAYA SAFETY LATINOAMÉRICA',
    'DEPARTAMENTO DE PROYECTOS E INGENIERÍA',
    'Certificado: ' + valueOrDash(data.consecutivo),
    'Fecha: ' + formatDate(data.fecha),
    'Cliente: ' + valueOrDash(data.cliente),
    'Proyecto: ' + valueOrDash(data.proyecto),
    'Sistema: ' + valueOrDash(data.sistema),
    'Referencia: ' + valueOrDash(data.referencia),
    'País: ' + valueOrDash(data.pais),
    'Firmante: ' + valueOrDash(data.responsable) + ' - ' + valueOrDash(data.cargoResponsable),
    'Estado: ' + (finalDocument ? 'INSTALACIÓN APROBADA - EMISIÓN DEFINITIVA' : 'BORRADOR - SIN APROBACIÓN EMITIDA'),
    'Soporte técnico y documental: ' + valueOrDash(data.soporteDocumental),
    'Componentes: ' + (materials || 'Sin cantidades válidas declaradas'),
  ].join('\n');
}

function renderQr(data) {
  const url = QR_BASE_URL + '?text=' + encodeURIComponent(buildQrPayload(data)) +
    '&size=180&margin=2&ecLevel=M&format=png';
  qrImages.forEach((img) => setImageSource(img, url));
}

function renderMaterialsTable(data) {
  preview.materialsBody.replaceChildren();
  data.materials.forEach((item) => {
    const tr = document.createElement('tr');
    const valid = !item.badInput && isValidQuantity(item.qty, item.unit);
    const observation = valid
      ? (Number(item.qty) > 0 ? 'Componente declarado para la instalación.' : 'No utilizado (0 declarado).')
      : 'Cantidad pendiente o inválida.';
    [valid ? item.qty + ' ' + item.unit : '--', item.ref, item.desc, observation].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    preview.materialsBody.appendChild(tr);
  });
}

function updateApprovalStamp(finalDocument) {
  const stamp = preview.approvalStamp;
  stamp.classList.toggle('hidden', !finalDocument);
  stamp.querySelector('.checkmark').textContent = finalDocument ? '✓' : '!';
  stamp.querySelector('strong').textContent = finalDocument
    ? 'INSTALACIÓN APROBADA' : 'BORRADOR · SIN EMISIÓN DEFINITIVA';
  stamp.querySelector('span').textContent = finalDocument
    ? 'Conforme a verificación técnica visual y documental.'
    : 'Requiere validación final antes de su emisión.';
}

function clearValidationErrors() {
  [...Object.values(fields), ...materialInputs].forEach((field) => {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  });
  validationErrors.replaceChildren();
  validationSummary.hidden = true;
}

function showErrors(errors, focus = false) {
  clearValidationErrors();
  document.getElementById('validationHeading').textContent = 'No se puede emitir el certificado definitivo:';
  errors.forEach((error, index) => {
    const li = document.createElement('li');
    li.id = 'validation-error-' + index;
    const link = document.createElement('a');
    link.href = '#' + error.field;
    link.textContent = error.message;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById(error.field)?.focus();
    });
    li.appendChild(link);
    validationErrors.appendChild(li);
    const field = document.getElementById(error.field);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      const descriptions = [field.getAttribute('aria-describedby'), li.id].filter(Boolean);
      field.setAttribute('aria-describedby', descriptions.join(' '));
    }
  });
  validationSummary.hidden = errors.length === 0;
  if (focus && errors.length) validationSummary.focus();
}

function showPrintError(message) {
  clearValidationErrors();
  document.getElementById('validationHeading').textContent = 'No se pudo preparar el PDF:';
  const li = document.createElement('li');
  li.textContent = message;
  validationErrors.appendChild(li);
  validationSummary.hidden = false;
  validationSummary.focus();
}

function updatePreview() {
  const data = readCertificate();
  const result = validateCertificate(data);
  // Solo la acción de emisión puede activar la firma y la conformidad definitiva.
  const finalDocument = printIntent === 'final' && result.valid;
  document.body.dataset.certificateState = finalDocument ? 'final' : 'draft';
  Object.entries(preview).forEach(([key, element]) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      element.textContent = key === 'fecha' ? formatDate(data[key]) : valueOrDash(data[key]);
    }
  });
  document.getElementById('vConsecutivo2').textContent = valueOrDash(data.consecutivo);
  document.getElementById('vFecha2').textContent = formatDate(data.fecha);
  kayaLogoImages.forEach((img) => setImageSource(img, KAYA_LOGO_URL));
  updateFlags();
  updateApprovalStamp(finalDocument);
  renderMaterialsTable(data);
  renderQr(data);
  emissionStatus.textContent = result.valid
    ? 'Datos validados. Use «Emitir certificado / PDF definitivo» para emitir con aprobación y firma.'
    : 'Borrador: complete los datos y las confirmaciones para emitir el certificado definitivo.';
  if (validationAttempted) showErrors(result.errors);
  persistForm(data);
  return { data, result };
}

function persistForm(data) {
  const draft = { ...data, schemaVersion: 2, materials: {} };
  CONFIRMATION_FIELDS.forEach((key) => { draft[key] = false; });
  materialInputs.forEach((input) => { draft.materials[input.id] = input.value; });
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('No fue posible guardar el borrador local.', error);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    Object.entries(fields).forEach(([key, field]) => {
      // Ni los borradores antiguos ni los nuevos autorizan una emisión futura.
      if (field.type === 'checkbox' || field.readOnly) return;
      if (typeof data[key] === 'string') field.value = data[key];
    });
    if (data.materials && typeof data.materials === 'object') {
      materialInputs.forEach((input) => {
        const value = data.materials[input.id];
        if (typeof value === 'string' || typeof value === 'number') input.value = String(value);
      });
    }
  } catch (error) {
    console.warn('No fue posible cargar el borrador local.', error);
  }
}

function revokeConfirmations() {
  CONFIRMATION_FIELDS.forEach((key) => { fields[key].checked = false; });
  printIntent = null;
  preparedSnapshot = null;
  printPrepared = false;
}

function setTodayIfEmpty() {
  if (fields.fecha.value) return;
  const today = new Date();
  fields.fecha.value = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')].join('-');
}

function clearForm() {
  if (!confirm('¿Desea limpiar el formulario para crear un nuevo certificado?')) return;
  const nextConsecutive = suggestNextConsecutive();
  form.reset();
  revokeConfirmations();
  validationAttempted = false;
  clearValidationErrors();
  fields.consecutivo.value = nextConsecutive;
  setTodayIfEmpty();
  updatePreview();
}

function suggestNextConsecutive() {
  const fallback = 'KAYA-LATAM-' + new Date().getFullYear() + '-001';
  const current = fields.consecutivo.value || fallback;
  const match = current.match(/(.*?)(\d+)$/);
  if (!match) return fallback;
  const next = String(Number(match[2]) + 1).padStart(match[2].length, '0');
  return match[1] + next;
}

function waitForImage(img) {
  const source = img.getAttribute('src');
  if (img.complete) return Promise.resolve(img.naturalWidth > 0);
  return new Promise((resolve) => {
    const finish = (loaded) => {
      clearTimeout(timer);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      resolve(loaded && img.getAttribute('src') === source);
    };
    const onLoad = () => finish(img.naturalWidth > 0);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), 8000);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
  });
}

async function printCertificate(mode) {
  if (preparingPrint) return;
  validationAttempted = mode === 'final';
  printIntent = null;
  printPrepared = false;
  const { data, result } = updatePreview();
  if (mode === 'final' && !result.valid) {
    showErrors(result.errors, true);
    return;
  }
  clearValidationErrors();
  preparingPrint = true;
  printButtons.forEach((button) => { button.disabled = true; });
  form.inert = true;
  printIntent = mode;
  preparedSnapshot = JSON.stringify(data);
  updatePreview();
  emissionStatus.textContent = 'Preparando documento para impresión / PDF…';
  try {
    const loaded = await Promise.all(Array.from(document.querySelectorAll('.certificate-page img')).map(waitForImage));
    // Comprobar nuevamente tras las cargas asíncronas; no imprimir datos cambiados.
    const current = readCertificate();
    if (preparedSnapshot !== JSON.stringify(current) || (mode === 'final' && !validateCertificate(current).valid)) {
      revokeConfirmations();
      throw new Error('Los datos cambiaron durante la preparación. Revise y confirme nuevamente antes de emitir.');
    }
    if (mode === 'final' && loaded.some((ok) => !ok)) {
      throw new Error('No se cargaron completamente el logo, la bandera o el QR. Compruebe la conexión y vuelva a emitir.');
    }
    printPrepared = true;
    window.print();
  } catch (error) {
    printIntent = null;
    preparedSnapshot = null;
    printPrepared = false;
    updatePreview();
    showPrintError(error.message || 'Vuelva a intentar la impresión.');
  } finally {
    preparingPrint = false;
    printButtons.forEach((button) => { button.disabled = false; });
    form.inert = false;
  }
}

function handleFormChange(event) {
  if (!CONFIRMATION_FIELDS.includes(event.target.id)) revokeConfirmations();
  else {
    printIntent = null;
    preparedSnapshot = null;
    printPrepared = false;
  }
  updatePreview();
}

form.addEventListener('input', handleFormChange);
form.addEventListener('change', handleFormChange);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  printCertificate('final');
});
document.getElementById('btnPrint').addEventListener('click', () => printCertificate('final'));
document.getElementById('btnDraft').addEventListener('click', () => printCertificate('draft'));
document.getElementById('btnClear').addEventListener('click', clearForm);

// Ctrl+P y el menú del navegador nunca eluden la validación: sin una solicitud
// de emisión preparada, siempre imprimen un borrador, incluso con casillas marcadas.
window.addEventListener('beforeprint', () => {
  const data = readCertificate();
  const imagesReady = Array.from(document.querySelectorAll('.certificate-page img'))
    .every((img) => img.complete && img.naturalWidth > 0);
  const finalReady = printPrepared && imagesReady && printIntent === 'final' &&
    preparedSnapshot === JSON.stringify(data) && validateCertificate(data).valid;
  if (printIntent === 'final' && preparedSnapshot !== JSON.stringify(data)) revokeConfirmations();
  printIntent = finalReady ? 'final' : 'draft';
  updatePreview();
  // La impresión nativa no espera cargas de red: ocultar un QR pendiente evita
  // imprimir la imagen del estado anterior mientras llega el nuevo payload.
  qrImages.forEach((img) => {
    img.style.visibility = img.complete && img.naturalWidth > 0 ? '' : 'hidden';
  });
  // Consumir la solicitud para impedir que otra impresión reutilice la autorización.
  printIntent = null;
  preparedSnapshot = null;
  printPrepared = false;
});
window.addEventListener('afterprint', () => {
  printIntent = null;
  preparedSnapshot = null;
  printPrepared = false;
  qrImages.forEach((img) => { img.style.visibility = ''; });
  updatePreview();
});

loadDraft();
revokeConfirmations();
setTodayIfEmpty();
updatePreview();
printButtons.forEach((button) => { button.disabled = false; });
