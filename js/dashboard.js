/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/dashboard.js - Métricas, Gráficos y Alertas del Sistema
   ============================================================================== */

import { getSupabase } from './supabase-client.js';
import { formatHectareas } from './utils.js';

export async function loadDashboardStats() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // 1. Obtener datos de tierras fiscales
    const { data: tfList, error: tfError } = await supabase
      .from('tierras_fiscales')
      .select('codpred, superficie_predio, sup_disp, sup_nodisp, departamento, proceso_contencioso, nombre_tco, estado_global, remision_expedientes(tipo_movimiento, created_at, direccion_destino)');

    if (tfError) throw tfError;

    // Métricas globales
    const totalRegistros = tfList.length;
    let totalSuperficie = 0;
    let totalDisponible = 0;
    let totalNoDisponible = 0;
    let totalContenciosos = 0;
    let totalCompensadas = 0;
    let expedientesRemitidos = 0;
    const deptoCounts = {};

    tfList.forEach(tf => {
      totalSuperficie += parseFloat(tf.superficie_predio) || 0;
      totalDisponible += parseFloat(tf.sup_disp) || 0;
      totalNoDisponible += parseFloat(tf.sup_nodisp) || 0;

      if (tf.proceso_contencioso) totalContenciosos++;
      if (tf.nombre_tco) totalCompensadas++;

      // Conteo por departamento
      const d = tf.departamento || 'SIN DEFINIR';
      deptoCounts[d] = (deptoCounts[d] || 0) + 1;

      // Verificar ubicación del expediente
      if (tf.remision_expedientes && tf.remision_expedientes.length > 0) {
        const sorted = tf.remision_expedientes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (sorted[0].tipo_movimiento === 'SALIDA') {
          expedientesRemitidos++;
        }
      }
    });

    // Actualizar elementos en DOM
    updateStat('stat-total-tf', totalRegistros);
    updateStat('stat-sup-total', formatHectareas(totalSuperficie));
    updateStat('stat-sup-disp', formatHectareas(totalDisponible));
    updateStat('stat-contenciosos', totalContenciosos);
    updateStat('stat-compensadas', totalCompensadas);
    updateStat('stat-remitidos', expedientesRemitidos);

    // Renderizar gráfico de departamentos
    renderDeptDistribution(deptoCounts, totalRegistros);

    // Renderizar alertas
    renderAlerts(tfList, expedientesRemitidos);

  } catch (err) {
    console.error('Error cargando estadísticas:', err);
  }
}

function updateStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderDeptDistribution(counts, total) {
  const container = document.getElementById('dept-distribution-container');
  if (!container) return;

  container.innerHTML = '';
  const sortedDepts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  sortedDepts.forEach(([dept, count]) => {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    const row = document.createElement('div');
    row.className = 'dept-bar-row';
    row.innerHTML = `
      <div class="dept-bar-header">
        <span>${dept}</span>
        <span>${count} (${percentage}%)</span>
      </div>
      <div class="dept-bar-track">
        <div class="dept-bar-fill" style="width: ${percentage}%;"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderAlerts(tfList, expedientesRemitidos) {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  container.innerHTML = '';

  // Alerta 1: Expedientes fuera de custodia
  if (expedientesRemitidos > 0) {
    container.innerHTML += `
      <div class="alert-item alert-priority-high">
        <span class="alert-icon">⚠</span>
        <div class="alert-body">
          <div class="alert-title">${expedientesRemitidos} Expediente(s) Remitido(s)</div>
          <div class="alert-desc">Hay expedientes fuera del archivo de custodia remitidos a Direcciones Jurídica, Saneamiento o Catastro.</div>
        </div>
      </div>
    `;
  }

  // Alerta 2: Procesos Contenciosos activos
  const contenciosos = tfList.filter(t => t.proceso_contencioso);
  if (contenciosos.length > 0) {
    container.innerHTML += `
      <div class="alert-item alert-priority-medium">
        <span class="alert-icon">⚖</span>
        <div class="alert-body">
          <div class="alert-title">${contenciosos.length} Tierras Fiscales en Proceso Contencioso</div>
          <div class="alert-desc">Cuentan con proceso ante el Tribunal Agroambiental o amparos constitucionales.</div>
        </div>
      </div>
    `;
  }

  // Alerta 3: Sin archivador o expediente asignado
  const sinArchivador = tfList.filter(t => !t.numero_archivador && !t.expediente);
  if (sinArchivador.length > 0) {
    container.innerHTML += `
      <div class="alert-item">
        <span class="alert-icon">📁</span>
        <div class="alert-body">
          <div class="alert-title">${sinArchivador.length} Registros sin Código de Archivador</div>
          <div class="alert-desc">Tierras fiscales que aún no tienen asignado archivador de palanca ni expediente en inventario.</div>
        </div>
      </div>
    `;
  }

  if (container.children.length === 0) {
    container.innerHTML = '<div class="text-muted" style="padding: 12px;">No hay alertas pendientes en el sistema.</div>';
  }
}
