const form = document.getElementById('certificateForm');
const qrContainers = document.querySelectorAll('.qrcode');
const materialInputs = Array.from(document.querySelectorAll('.material-input'));

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

function getSelectedFlag() {
  const option = fields.pais.options[fields.pais.selectedIndex];
  return option ? option.dataset.flag || '🏳️' : '🏳️';
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
    `País: ${fields.pais.value}`,
    `Firmante: ${valueOrDash(fields.responsable.value)} - ${valueOrDash(fields.cargoResponsable.value)}`,
    `Estado: ${fields.aprobado.checked ? 'Instalación aprobada' : 'Pendiente de aprobación'}`,
    `Componentes: ${materials || 'Sin cantidades declaradas'}`,
  ].join('\n');
}

function renderQr() {
  qrContainers.forEach((container) => {
    container.innerHTML = '';
    if (typeof QRCode === 'undefined') {
      container.textContent = 'QR';
      container.title = buildQrPayload();
      return;
    }
    new QRCode(container, {
      text: buildQrPayload(),
      width: 98,
      height: 98,
      correctLevel: QRCode.CorrectLevel.M,
    });
  });
}

function getMaterials() {
  return materialInputs.map((input) => ({
    qty: input.value === '' ? 0 : Number(input.value),
    ref: input.dataset.ref,
    desc: input.dataset.desc,
  }));
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

function updatePreview() {
  preview.consecutivo.textContent = valueOrDash(fields.consecutivo.value);
  preview.fecha.textContent = formatDate(fields.fecha.value);
  preview.pais.textContent = fields.pais.value;
  preview.pais2.textContent = fields.pais.value;
  preview.flag.textContent = getSelectedFlag();
  preview.flag2.textContent = getSelectedFlag();
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

  preview.approvalStamp.classList.toggle('hidden', !fields.aprobado.checked);
  const stampText = preview.approvalStamp.querySelector('strong');
  const stampSubtext = preview.approvalStamp.querySelector('span');
  stampText.textContent = fields.aprobado.checked ? 'INSTALACIÓN APROBADA' : 'PENDIENTE DE APROBACIÓN';
  stampSubtext.textContent = fields.aprobado.checked
    ? 'Conforme a verificación técnica visual y documental.'
    : 'El certificado requiere validación final antes de su emisión.';

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
  form.reset();
  localStorage.removeItem('kayaCertificateDraft');
  fields.consecutivo.value = suggestNextConsecutive();
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
