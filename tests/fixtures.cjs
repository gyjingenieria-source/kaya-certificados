'use strict';

const { AUTHORIZED_SIGNER, MATERIAL_RULES } = require('../assets/js/validation.js');

function validCertificate() {
  return {
    consecutivo: 'KAYA-LATAM-2026-099',
    fecha: '2026-10-08',
    pais: 'Colombia',
    ciudad: 'Bogotá D.C.',
    cliente: 'Cliente de prueba',
    proyecto: 'Cubierta de prueba, sector A',
    sistema: 'Línea de vida horizontal K2010A',
    referencia: 'K2010A',
    descripcion: 'Instalación de prueba según plano de prueba P-01 y acta de inspección AI-01.',
    instalador: 'Empresa instaladora de prueba',
    ...AUTHORIZED_SIGNER,
    observaciones: 'Datos ficticios exclusivos para pruebas del software.',
    soporteDocumental: 'Acta de prueba AI-01, plano de prueba P-01; revisión 08/10/2026.',
    cantidadesConfirmadas: true,
    documentacionVerificada: true,
    aprobado: true,
    materials: MATERIAL_RULES.map((rule) => ({
      ...rule,
      qty: rule.unit === 'm' ? '24.75' : (rule.id === 'qty-ANB100A' ? '2' : '1'),
    })),
  };
}

module.exports = { validCertificate };
