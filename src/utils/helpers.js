/**
 * Genera referencia unica tipo CONS-20260215-ABCD1234
 */
function generateRef(prefix = 'TXN') {
  const d = new Date();
  const date = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

/**
 * Formatea centavos a string moneda MX: $1,234.56
 */
function formatMoney(centavos) {
  const n = centavos / 100;
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Genera numero de estacion: EST-0001
 */
function generateEstacionNum(count) {
  return 'EST-' + String(count).padStart(4, '0');
}

/**
 * Genera numero de contrato: CTR-0001-2026-001
 */
function generateContratoNum(estacionNum, year, count) {
  const estNum = estacionNum.replace('EST-', '');
  return `CTR-${estNum}-${year}-${String(count).padStart(3, '0')}`;
}

module.exports = {
  generateRef,
  formatMoney,
  generateEstacionNum,
  generateContratoNum,
};
