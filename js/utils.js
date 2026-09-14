/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/utils.js - Funciones de Ayuda, Notificaciones y Formateo
   ============================================================================== */

/**
 * Muestra una notificación Toast flotante
 * @param {string} message 
 * @param {'success'|'danger'|'warning'|'info'} type 
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    danger: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span style="font-weight:bold; font-size:1.1rem;">${iconMap[type] || 'ℹ'}</span>
    <div style="flex:1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Formatea fechas a formato boliviano DD/MM/YYYY
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  // Si ya viene como YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Convierte DD/MM/YYYY a YYYY-MM-DD para la base de datos
 */
export function toISODate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    if (d && m && y) {
      return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

/**
 * Formatea cantidades de hectáreas
 */
export function formatHectareas(num) {
  if (num === null || num === undefined || num === '') return '-';
  const val = parseFloat(num);
  if (isNaN(val)) return '-';
  return val.toLocaleString('es-BO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' ha';
}

/**
 * Debounce para búsquedas en tiempo real
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Exporta un array de objetos JSON a un archivo CSV descargable
 */
export function exportToCSV(data, filename = 'reporte_tierras_fiscales.csv') {
  if (!data || !data.length) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(field => {
      let val = row[field] === null || row[field] === undefined ? '' : String(row[field]);
      val = val.replace(/"/g, '""');
      if (val.search(/("|,|\n)/g) >= 0) {
        val = `"${val}"`;
      }
      return val;
    }).join(';')
  );

  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Archivo exportado exitosamente', 'success');
}
