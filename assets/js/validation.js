(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KayaValidation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const AUTHORIZED_SIGNER = Object.freeze({
    responsable: 'Ing. Gerardo Montañez',
    cargoResponsable: 'Representante Técnico para Latinoamérica',
  });

  const REQUIRED_FIELDS = Object.freeze({
    consecutivo: 'Consecutivo',
    fecha: 'Fecha de emisión',
    pais: 'País',
    ciudad: 'Ciudad',
    cliente: 'Empresa / Cliente',
    proyecto: 'Proyecto / Ubicación',
    sistema: 'Tipo de sistema instalado',
    referencia: 'Referencia / Modelo',
    descripcion: 'Descripción técnica de la instalación',
    instalador: 'Instalador / Empresa instaladora',
    responsable: 'Responsable técnico',
    cargoResponsable: 'Cargo del responsable técnico',
    soporteDocumental: 'Soporte de verificación técnica y documental',
  });

  const MATERIAL_RULES = Object.freeze([
    { id: 'qty-ANB100A', ref: 'ANB 100 A', unit: 'ud' },
    { id: 'qty-ARB100A', ref: 'ARB 100A', unit: 'ud' },
    { id: 'qty-ARB100AC1', ref: 'ARB 100A C1', unit: 'ud' },
    { id: 'qty-EA200EN', ref: 'EA-200 EN', unit: 'ud' },
    { id: 'qty-EA200CA', ref: 'EA-200 CA', unit: 'ud' },
    { id: 'qty-LL200A', ref: 'LL-200A', unit: 'm' },
    { id: 'qty-SRY50', ref: 'SRY-50', unit: 'ud' },
    { id: 'qty-SRY200', ref: 'SRY-200', unit: 'ud' },
  ].map(Object.freeze));

  const COUNTRY_NAMES = Object.freeze([
    'Colombia', 'Ecuador', 'Perú', 'Bolivia', 'Paraguay', 'Brasil',
    'Panamá', 'Costa Rica', 'México', 'Chile', 'Argentina',
  ]);

  function hasValue(value) {
    return typeof value === 'string' && value.trim() !== '' && !/^[-–—]+$/.test(value.trim());
  }

  function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1000 && date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function isValidQuantity(value, unit) {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const raw = value.trim();
    // Unidades completas para piezas; metros con hasta dos decimales para cable.
    if (!(unit === 'm' ? /^\d+(\.\d{1,2})?$/ : /^\d+$/).test(raw)) return false;
    const quantity = Number(raw);
    return unit === 'm'
      ? Number.isFinite(quantity) && quantity <= Number.MAX_SAFE_INTEGER / 100
      : Number.isSafeInteger(quantity);
  }

  function validateCertificate(data = {}) {
    const errors = [];
    Object.entries(REQUIRED_FIELDS).forEach(([field, label]) => {
      if (!hasValue(data[field])) errors.push({ field, message: `${label}: complete este campo.` });
    });
    if (hasValue(data.fecha) && !isValidDate(data.fecha)) {
      errors.push({ field: 'fecha', message: 'Fecha de emisión: indique una fecha válida.' });
    }
    if (hasValue(data.pais) && !COUNTRY_NAMES.includes(data.pais)) {
      errors.push({ field: 'pais', message: 'País: seleccione una opción de la lista.' });
    }
    Object.entries(AUTHORIZED_SIGNER).forEach(([field, expected]) => {
      if (hasValue(data[field]) && data[field].trim() !== expected) {
        errors.push({ field, message: 'La firma disponible corresponde a Ing. Gerardo Montañez y su cargo autorizado.' });
      }
    });

    const materials = Array.isArray(data.materials) ? data.materials : [];
    let positiveQuantity = false;
    MATERIAL_RULES.forEach((rule) => {
      const matches = materials.filter((item) => item && item.id === rule.id);
      const item = matches[0];
      if (matches.length !== 1 || !item || item.badInput || !isValidQuantity(item.qty, rule.unit)) {
        errors.push({
          field: rule.id,
          message: `${rule.ref}: indique ${rule.unit === 'm' ? 'metros no negativos, con hasta dos decimales' : 'una cantidad entera no negativa'}; use 0 si no se instaló.`,
        });
      } else if (Number(item.qty) > 0) positiveQuantity = true;
    });
    if (!positiveQuantity) {
      errors.push({ field: MATERIAL_RULES[0].id, message: 'Declare al menos un componente instalado con cantidad mayor que 0.' });
    }
    if (data.cantidadesConfirmadas !== true) {
      errors.push({ field: 'cantidadesConfirmadas', message: 'Confirme las cantidades realmente instaladas, incluidas las referencias con cantidad 0.' });
    }
    if (data.documentacionVerificada !== true) {
      errors.push({ field: 'documentacionVerificada', message: 'Confirme la revisión técnica y documental de esta instalación.' });
    }
    if (data.aprobado !== true) {
      errors.push({ field: 'aprobado', message: 'Marque expresamente la aprobación de esta instalación antes de emitir.' });
    }
    return { valid: errors.length === 0, errors };
  }

  return Object.freeze({ AUTHORIZED_SIGNER, REQUIRED_FIELDS, MATERIAL_RULES,
    hasValue, isValidDate, isValidQuantity, validateCertificate });
}));
