const form = document.getElementById('certificateForm');
const qrContainer = document.getElementById('qrcode');

const fields = {
  consecutivo: document.getElementById('consecutivo'),
  fecha: document.getElementById('fecha'),
  pais: document.getElementById('pais'),
  ciudad: document.getElementById('ciudad'),
  cliente: document.getElementById('cliente'),
  proyecto: document.getElementById('proyecto'),
  sistema: document.getElementById('sistema'),
  referencia: document.getElementById('referencia'),
  descripcion: document.getElementById('descripcion'),
  instalador: document.getElementById('instalador'),
  responsable: document.getElementById('responsable'),
  observaciones: document.getElementById('observaciones'),
  aprobado: document.getElementById('aprobado'),
};

const preview = {
  consecutivo: document.getElementById('vConsecutivo'),
  fecha: document.getElementById('vFecha'),
  pais: document.getElementById('vPais'),
  flag: document.getElementById('vFlag'),
  ciudad: document.getElementById('vCiudad'),
  cliente: document.getElementById('vCliente'),
  proyecto: document.getElementById('vProyecto'),
  sistema: document.getElementById('vSistema'),
  referencia: document.getElementById('vReferencia'),
  descripcion: document.getElementById('vDescripcion'),
  instalador: document.getElementById('vInstalador'),
  responsable: document.getElementById('vResponsable'),
  observaciones: document.getElementById('vObservaciones'),
  approvalStamp: document.getElementById('approvalStamp'),
};

function valueOrDash(value) {
  return value && value.trim() ? value.trim() : '--';
}

function formatDate(dateValue) {
  if (!dateValue) return '--';
  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

function getSelectedFlag() {
  const option = fields.pais.options[fields.pais.selectedIndex];
  return option ? option.dataset.flag || '🏳️' : '🏳️';
}

function buildQrPayload() {
  return [
    'KAYA SAFETY LATINOAMÉRICA',
    `Certificado: ${valueOrDash(fields.consecutivo.value)}`,
    `Fecha: ${formatDate(fields.fecha.value)}`,
    `Cliente: ${valueOrDash(fields.cliente.value)}`,
    `Proyecto: ${valueOrDash(fields.proyecto.value)}`,
    `Sistema: ${valueOrDash(fields.sistema.value)}`,
    `Referencia: ${valueOrDash(fields.referencia.value)}`,
    `País: ${fields.pais.value}`,
    `Estado: ${fields.aprobado.checked ? 'Instalación aprobada' : 'Pendiente de aprobación'}`,
  ].join('\n');
}

function renderQr() {
  qrContainer.innerHTML = '';
  if (typeof QRCode === 'undefined') {
    qrContainer.textContent = 'QR';
    return;
  }
  new QRCode(qrContainer, {
    text: buildQrPayload(),
    width: 96,
    height: 96,
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function updatePreview() {
  preview.consecutivo.textContent = valueOrDash(fields.consecutivo.value);
  preview.fecha.textContent = formatDate(fields.fecha.value);
  preview.pais.textContent = fields.pais.value;
  preview.flag.textContent = getSelectedFlag();
  preview.ciudad.textContent = valueOrDash(fields.ciudad.value);
  preview.cliente.textContent = valueOrDash(fields.cliente.value);
  preview.proyecto.textContent = valueOrDash(fields.proyecto.value);
  preview.sistema.textContent = valueOrDash(fields.sistema.value);
  preview.referencia.textContent = valueOrDash(fields.referencia.value);
  preview.descripcion.textContent = valueOrDash(fields.descripcion.value);
  preview.instalador.textContent = valueOrDash(fields.instalador.value);
  preview.responsable.textContent = valueOrDash(fields.responsable.value);
  preview.observaciones.textContent = valueOrDash(fields.observaciones.value);

  preview.approvalStamp.classList.toggle('hidden', !fields.aprobado.checked);
  const stampText = preview.approvalStamp.querySelector('strong');
  const stampSubtext = preview.approvalStamp.querySelector('span');
  stampText.textContent = fields.aprobado.checked ? 'INSTALACIÓN APROBADA' : 'PENDIENTE DE APROBACIÓN';
  stampSubtext.textContent = fields.aprobado.checked
    ? 'Conforme a verificación técnica visual y documental.'
    : 'El certificado requiere validación final antes de su emisión.';

  renderQr();
  persistForm();
}

function persistForm() {
  const data = {};
  Object.entries(fields).forEach(([key, field]) => {
    data[key] = field.type === 'checkbox' ? field.checked : field.value;
  });
  localStorage.setItem('kayaCertificateDraft', JSON.stringify(data));
}

function loadDraft() {
  const raw = localStorage.getItem('kayaCertificateDraft');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([key, value]) => {
      if (!fields[key]) return;
      if (fields[key].type === 'checkbox') {
        fields[key].checked = Boolean(value);
      } else {
        fields[key].value = value;
      }
    });
  } catch (error) {
    console.warn('No fue posible cargar el borrador local.', error);
  }
}

function setTodayIfEmpty() {
  if (fields.fecha.value) return;
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  fields.fecha.value = isoDate;
}

function clearForm() {
  if (!confirm('¿Desea limpiar el formulario para crear un nuevo certificado?')) return;
  form.reset();
  localStorage.removeItem('kayaCertificateDraft');
  fields.consecutivo.value = suggestNextConsecutive();
  fields.responsable.value = 'Departamento de Proyectos e Ingeniería';
  setTodayIfEmpty();
  updatePreview();
}

function suggestNextConsecutive() {
  const current = fields.consecutivo.value || 'KAYA-LATAM-2026-001';
  const match = current.match(/(.*?)(\d+)$/);
  if (!match) return 'KAYA-LATAM-2026-001';
  const prefix = match[1];
  const numberText = match[2];
  const next = String(Number(numberText) + 1).padStart(numberText.length, '0');
  return `${prefix}${next}`;
}

form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);
document.getElementById('btnPrint').addEventListener('click', () => window.print());
document.getElementById('btnClear').addEventListener('click', clearForm);

loadDraft();
setTodayIfEmpty();
updatePreview();
