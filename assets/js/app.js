const form = document.getElementById('certificateForm');
const materialInputs = Array.from(document.querySelectorAll('.material-input'));
const qrImages = Array.from(document.querySelectorAll('.qr-img'));
const kayaLogoImages = Array.from(document.querySelectorAll('.kaya-logo'));

const KAYA_LOGO_URL = 'assets/img/logo-kaya.svg?v=20260604-03';
const FLAG_BASE_URL = 'https://flagcdn.com';
const QR_BASE_URL = 'https://quickchart.io/qr';

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
  cargoResponsable: document.getElementById('cargoResponsable'),
  observaciones: document.getElementById('observaciones'),
  aprobado: document.getElementById('aprobado'),
};

const preview = {
  consecutivo: document.getElementById('vConsecutivo'),
  fecha: document.getElementById('vFecha'),
  pais: document.getElementById('vPais'),
  pais2: document.getElementById('vPais2'),
  flag: document.getElementById('vFlag'),
  flag2: document.getElementById('vFlag2'),
  ciudad: document.getElementById('vCiudad'),
  cliente: document.getElementById('vCliente'),
  proyecto: document.getElementById('vProyecto'),
  sistema: document.getElementById('vSistema'),
  referencia: document.getElementById('vReferencia'),
  descripcion: document.getElementById('vDescripcion'),
  instalador: document.getElementById('vInstalador'),
  responsable: document.getElementById('vResponsable'),
  cargoResponsable: document.getElementById('vCargoResponsable'),
  observaciones: document.getElementById('vObservaciones'),
  approvalStamp: document.getElementById('approvalStamp'),
  materialsBody: document.getElementById('materialsBody'),
};

function valueOrDash(value) {
  return value && value.trim() ? value.trim() : '--';
}

function formatDate(dateValue) {
  if (!dateValue) return '--';
  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

function getSelectedOption() {
  return fields.pais.options[fields.pais.selectedIndex];
}

function getSelectedCountryCode() {
  const option = getSelectedOption();
  return option ? option.dataset.code || 'co' : 'co';
}

function getSelectedCountryName() {
  const option = getSelectedOption();
  return option ? option.value : 'Colombia';
}

function updateLogoImages() {
  kayaLogoImages.forEach((img) => {
    img.src = KAYA_LOGO_URL;
  });
}

function updateFlags() {
  const country = getSelectedCountryName();
  const code = getSelectedCountryCode();
  const flagUrl = `${FLAG_BASE_URL}/${code}.svg`;

  [preview.flag, preview.flag2].forEach((img) => {
    if (!img) return;
    img.src = flagUrl;
    img.alt = `Bandera de ${country}`;
    img.loading = 'eager';
    img.decoding = 'sync';
  });

  preview.pais.textContent = country;
  preview.pais2.textContent = country;
}

function getMaterials() {
  return materialInputs.map((input) => ({
    qty: input.value === '' ? 0 : Number(input.value),
    ref: input.dataset.ref,
    desc: input.dataset.desc,
  }));
}

function buildQrPayload() {
  const materials = getMaterials()
    .filter((item) => Number(item.qty) > 0)
    .map((item) => `${item.qty} x ${item.ref}`)
    .join(', ');

  return [
    'KAYA SAFETY LATINOAMÉRICA',
    'DEPARTAMENTO DE PROYECTOS E INGENIERÍA',
    `Certificado: ${valueOrDash(fields.consecutivo.value)}`,
    `Fecha: ${formatDate(fields.fecha.value)}`,
    `Cliente: ${valueOrDash(fields.cliente.value)}`,
    `Proyecto: ${valueOrDash(fields.proyecto.value)}`,
    `Sistema: ${valueOrDash(fields.sistema.value)}`,
    `Referencia: ${valueOrDash(fields.referencia.value)}`,
    `País: ${getSelectedCountryName()}`,
    `Firmante: ${valueOrDash(fields.responsable.value)} - ${valueOrDash(fields.cargoResponsable.value)}`,
    `Estado: ${fields.aprobado.checked ? 'Instalación aprobada' : 'Pendiente de aprobación'}`,
    `Componentes: ${materials || 'Sin cantidades declaradas'}`,
  ].join('\n');
}

function buildQrUrl() {
  const payload = encodeURIComponent(buildQrPayload());
  return `${QR_BASE_URL}?text=${payload}&size=180&margin=2&ecLevel=M&format=png`;
}

function renderQr() {
  const qrUrl = buildQrUrl();
  qrImages.forEach((img) => {
    img.src = qrUrl;
    img.loading = 'eager';
    img.decoding = 'sync';
  });
}

function renderMaterialsTable() {
  const rows = getMaterials();
  preview.materialsBody.innerHTML = '';

  rows.forEach((item) => {
    const tr = document.createElement('tr');
    const qty = Number.isFinite(item.qty) ? item.qty : 0;
    tr.innerHTML = `
      <td>${qty}</td>
      <td>${item.ref}</td>
      <td>${item.desc}</td>
      <td>${qty > 0 ? 'Referencia declarada para el sistema instalado.' : 'No utilizada / pendiente por definir.'}</td>
    `;
    preview.materialsBody.appendChild(tr);
  });
}

function updateApprovalStamp() {
  preview.approvalStamp.classList.toggle('hidden', !fields.aprobado.checked);
  const stampText = preview.approvalStamp.querySelector('strong');
  const stampSubtext = preview.approvalStamp.querySelector('span');
  stampText.textContent = fields.aprobado.checked ? 'INSTALACIÓN APROBADA' : 'PENDIENTE DE APROBACIÓN';
  stampSubtext.textContent = fields.aprobado.checked
    ? 'Conforme a verificación técnica visual y documental.'
    : 'El certificado requiere validación final antes de su emisión.';
}

function updatePreview() {
  preview.consecutivo.textContent = valueOrDash(fields.consecutivo.value);
  preview.fecha.textContent = formatDate(fields.fecha.value);
  preview.ciudad.textContent = valueOrDash(fields.ciudad.value);
  preview.cliente.textContent = valueOrDash(fields.cliente.value);
  preview.proyecto.textContent = valueOrDash(fields.proyecto.value);
  preview.sistema.textContent = valueOrDash(fields.sistema.value);
  preview.referencia.textContent = valueOrDash(fields.referencia.value);
  preview.descripcion.textContent = valueOrDash(fields.descripcion.value);
  preview.instalador.textContent = valueOrDash(fields.instalador.value);
  preview.responsable.textContent = valueOrDash(fields.responsable.value);
  preview.cargoResponsable.textContent = valueOrDash(fields.cargoResponsable.value);
  preview.observaciones.textContent = valueOrDash(fields.observaciones.value);

  updateLogoImages();
  updateFlags();
  updateApprovalStamp();
  renderMaterialsTable();
  renderQr();
  persistForm();
}

function persistForm() {
  const data = {};
  Object.entries(fields).forEach(([key, field]) => {
    data[key] = field.type === 'checkbox' ? field.checked : field.value;
  });
  data.materials = {};
  materialInputs.forEach((input) => {
    data.materials[input.id] = input.value;
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
    if (data.materials) {
      materialInputs.forEach((input) => {
        if (Object.prototype.hasOwnProperty.call(data.materials, input.id)) {
          input.value = data.materials[input.id];
        }
      });
    }
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
  const nextConsecutive = suggestNextConsecutive();
  form.reset();
  localStorage.removeItem('kayaCertificateDraft');
  fields.consecutivo.value = nextConsecutive;
  fields.sistema.value = 'Línea de vida horizontal K2010A';
  fields.referencia.value = 'K2010A';
  fields.responsable.value = 'Ing. Gerardo Montañez';
  fields.cargoResponsable.value = 'Representante Técnico para Latinoamérica';
  fields.descripcion.value = 'Sistema de línea de vida horizontal K2010A KAYA SAFETY instalado para tránsito seguro de usuarios conectados mediante carro compatible, con verificación visual de componentes, terminales, intermedios, cable y señalización.';
  fields.observaciones.value = 'Certificado sujeto a uso, inspección, mantenimiento y condiciones de instalación indicadas por el fabricante y por el responsable técnico del proyecto.';
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
