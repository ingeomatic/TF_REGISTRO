/* ==============================================================================
   js/app-bundle.js - Sistema de Administración de Tierras Fiscales INRA
   Versión Senior Profesional Optimizada para Grandes Volúmenes de Datos (6,000+)
   ============================================================================== */

window.INRA = (function() {
  // Credenciales de Supabase — hardcodeadas como fallback para no pedir al usuario cada vez
  const SUPABASE_URL_DEFAULT = 'https://jlfgavqblkagezqcbfnu.supabase.co';
  const SUPABASE_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZmdhdnFibGthZ2V6cWNiZm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTg2MDksImV4cCI6MjEwNDg5NDYwOX0.C9EOT4AFTA0-jKYdcm2Uq1-blmuY-6VthdVjynG2SMM';

  const DEFAULT_SUPABASE_URL = localStorage.getItem('INRA_SUPABASE_URL') || SUPABASE_URL_DEFAULT;
  const DEFAULT_SUPABASE_ANON_KEY = localStorage.getItem('INRA_SUPABASE_KEY') || SUPABASE_KEY_DEFAULT;

  let supabaseClient = null;

  function initSupabase() {
    const url = localStorage.getItem('INRA_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('INRA_SUPABASE_KEY') || DEFAULT_SUPABASE_ANON_KEY;

    if (window.supabase && url && key) {
      try {
        supabaseClient = window.supabase.createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
      } catch (err) {
        console.error('Error Supabase:', err);
      }
    }
    return supabaseClient;
  }

  function getSupabase() {
    if (!supabaseClient) return initSupabase();
    return supabaseClient;
  }

  function setSupabaseConfig(url, key) {
    localStorage.setItem('INRA_SUPABASE_URL', url.trim());
    localStorage.setItem('INRA_SUPABASE_KEY', key.trim());
    return initSupabase();
  }

  function getSupabaseConfig() {
    return {
      url: localStorage.getItem('INRA_SUPABASE_URL') || SUPABASE_URL_DEFAULT,
      key: localStorage.getItem('INRA_SUPABASE_KEY') || SUPABASE_KEY_DEFAULT
    };
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconMap = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span style="font-weight:bold; font-size:1.1rem;">${iconMap[type] || 'ℹ'}</span><div style="flex:1;">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const clean = String(dateString).trim();
    if (clean.includes('/')) return clean;
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  }

  function formatHectareas(num) {
    if (num === null || num === undefined || num === '') return '-';
    const val = parseFloat(num);
    if (isNaN(val)) return '-';
    return val.toLocaleString('es-BO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' ha';
  }

  function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function exportToCSV(data, filename = 'reporte_tierras_fiscales.csv') {
    if (!data || !data.length) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(field => {
        let val = row[field] === null || row[field] === undefined ? '' : String(row[field]);
        val = val.replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
        return val;
      }).join(';')
    );
    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV exportado exitosamente', 'success');
  }

  // --- AUTENTICACIÓN Y ROLES ---
  async function login(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Configure primero su Project URL y Anon Key de Supabase');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  async function getCurrentProfile() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data } = await sb.from('perfiles').select('*').eq('id', user.id).single();
    return data || { id: user.id, nombre_completo: user.email.split('@')[0], rol: 'administrador' };
  }

  async function checkAuthGuard(minRole = 'lectura') {
    const sb = getSupabase();
    if (!sb) {
      window.location.href = 'index.html';
      return null;
    }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    const perfil = await getCurrentProfile();
    if (!perfil) {
      window.location.href = 'index.html';
      return null;
    }
    renderUserInLayout(perfil);
    applyRoleVisibility(perfil.rol);
    return perfil;
  }

  function renderUserInLayout(perfil) {
    const nameEl = document.getElementById('layout-user-name');
    const roleEl = document.getElementById('layout-user-role');
    const avatarEl = document.getElementById('layout-user-avatar');
    if (nameEl) nameEl.textContent = perfil.nombre_completo || 'Usuario';
    if (roleEl) roleEl.textContent = (perfil.rol || 'LECTURA').toUpperCase();
    if (avatarEl) {
      avatarEl.textContent = ((perfil.nombre_completo || 'U')[0] || 'U').toUpperCase();
    }
  }

  function applyRoleVisibility(rol) {
    if (rol === 'lectura') {
      document.querySelectorAll('[data-role-required="editor"]').forEach(el => el.style.display = 'none');
    }
    if (rol !== 'administrador') {
      document.querySelectorAll('[data-role-required="administrador"]').forEach(el => el.style.display = 'none');
    }
  }

  // --- CATÁLOGOS BASE ---
  const DEFAULT_CATALOGOS = {
    tipo_de_res: ['ADMINISTRATIVA', 'SUPREMA'],
    tipo_tf: ['IDENTIFICADA', 'ILEGALIDAD', 'IMPROCEDENCIA', 'RECORTE', 'SIN DEFINIR'],
    clasificacion: ['TIERRA FISCAL', 'COMUNITARIA', 'MEDIANA', 'PEQUEÑA', 'SIN DEFINIR'],
    calificacion: ['TIERRA FISCAL', 'AGRICOLA', 'GANADERA', 'SIN DEFINIR'],
    modalidad: ['CAT-SAN', 'CAT-SAN Y SAN-TCO', 'SAN-SIM', 'SAN-TCO', 'SIN DEFINIR'],
    estado: ['REPORTADO', 'REPORTADO - AREA URBANA', 'PROCESO CONTENCIOSO VIGENTE', 'COMPENSADO TCO', 'REVISAR REPORTE', 'REVISAR NOTA DE REMISION'],
    estado_global: ['TIERRA FISCAL VIGENTE', 'TIERRA FISCAL EN PROCESO CONTENCIOSO', 'TIERRA FISCAL COMPENSADA A TCO', 'TIERRA FISCAL ANULADA'],
    clase_res: ['RES', 'RECTIFICATORIA'],
    reporte_tf: ['SI', 'NO', 'REVISAR REPORTE', 'REVISAR NOTA DE REMISION'],
    estado_proceso_contencioso: ['EN PROCESO', 'RESUELTO', 'ARCHIVADO'],
    resolucion_sentencia: ['PROBADA LA DEMANDA', 'IMPROBADA LA DEMANDA', 'PARCIALMENTE PROBADA', 'ANULADA'],
    estado_compensacion: ['PENDIENTE DE COMPENSACION', 'EN TRÁMITE', 'COMPENSADA TOTALMENTE', 'COMPENSADA PARCIALMENTE'],
    direccion_destino: ['DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS', 'DIRECCIÓN GENERAL DE SANEAMIENTO', 'DIRECCIÓN GENERAL DE CATASTRO', 'DIRECCIÓN NACIONAL - DESPACHO', 'DIRECCIÓN DEPARTAMENTAL SANTA CRUZ', 'DIRECCIÓN DEPARTAMENTAL BENI', 'DIRECCIÓN DEPARTAMENTAL LA PAZ', 'DIRECCIÓN DEPARTAMENTAL PANDO', 'DIRECCIÓN DEPARTAMENTAL TARIJA', 'DIRECCIÓN DEPARTAMENTAL CHUQUISACA', 'DIRECCIÓN DEPARTAMENTAL COCHABAMBA', 'DIRECCIÓN DEPARTAMENTAL ORURO', 'DIRECCIÓN DEPARTAMENTAL POTOSÍ', 'TRIBUNAL AGROAMBIENTAL', 'OTRA UNIDAD / EXTERNO']
  };

  async function populateSelect(selectEl, tipo, selectedValue = '') {
    if (!selectEl) return;
    const values = DEFAULT_CATALOGOS[tipo] || [];
    selectEl.innerHTML = '<option value="">-- Seleccionar --</option>';
    values.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      if (val === selectedValue) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  async function initAllCatalogSelects() {
    document.querySelectorAll('select[data-catalogo]').forEach(sel => {
      populateSelect(sel, sel.getAttribute('data-catalogo'), sel.getAttribute('data-selected-value') || '');
    });
  }

  // --- TERRITORIOS BOLIVIA ---
  const TERRITORIOS = [
    { d: 'SANTA CRUZ', p: 'ANDRÉS IBÁÑEZ', m: 'SANTA CRUZ DE LA SIERRA' },
    { d: 'SANTA CRUZ', p: 'ANDRÉS IBÁÑEZ', m: 'COTOCA' },
    { d: 'SANTA CRUZ', p: 'ANDRÉS IBÁÑEZ', m: 'LA GUARDIA' },
    { d: 'SANTA CRUZ', p: 'WARNES', m: 'WARNES' },
    { d: 'SANTA CRUZ', p: 'VELASCO', m: 'SAN IGNACIO DE VELASCO' },
    { d: 'SANTA CRUZ', p: 'CHIQUITOS', m: 'SAN JOSÉ DE CHIQUITOS' },
    { d: 'SANTA CRUZ', p: 'ÑUFLO DE CHÁVEZ', m: 'CONCEPCIÓN' },
    { d: 'SANTA CRUZ', p: 'GUARAYOS', m: 'ASCENSIÓN DE GUARAYOS' },
    { d: 'BENI', p: 'CERCADO', m: 'TRINIDAD' },
    { d: 'BENI', p: 'VACA DÍEZ', m: 'RIBERALTA' },
    { d: 'BENI', p: 'VACA DÍEZ', m: 'GUAYARAMERÍN' },
    { d: 'BENI', p: 'JOSÉ BALLIVIÁN', m: 'RURRENABAQUE' },
    { d: 'BENI', p: 'JOSÉ BALLIVIÁN', m: 'SAN BORJA' },
    { d: 'LA PAZ', p: 'MURILLO', m: 'LA PAZ' },
    { d: 'LA PAZ', p: 'MURILLO', m: 'EL ALTO' },
    { d: 'LA PAZ', p: 'ABEL ITURRALDE', m: 'IXIAMAS' },
    { d: 'LA PAZ', p: 'ABEL ITURRALDE', m: 'SAN BUENAVENTURA' },
    { d: 'LA PAZ', p: 'CARANAVI', m: 'CARANAVI' },
    { d: 'PANDO', p: 'NICOLÁS SUÁREZ', m: 'COBIJA' },
    { d: 'TARIJA', p: 'CERCADO', m: 'TARIJA' },
    { d: 'TARIJA', p: 'GRAN CHACO', m: 'YACUIBA' },
    { d: 'CHUQUISACA', p: 'OROPEZA', m: 'SUCRE' },
    { d: 'COCHABAMBA', p: 'CERCADO', m: 'COCHABAMBA' },
    { d: 'ORURO', p: 'CERCADO', m: 'ORURO' },
    { d: 'POTOSÍ', p: 'TOMÁS FRÍAS', m: 'POTOSÍ' }
  ];

  function setupCascadeTerritorios(deptSelect, provSelect, munSelect, initialValues = {}) {
    if (!deptSelect || !provSelect || !munSelect) return;
    const deptos = [...new Set(TERRITORIOS.map(t => t.d))].sort();
    deptSelect.innerHTML = '<option value="">-- Seleccionar Departamento --</option>';
    deptos.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      if (d === initialValues.departamento) opt.selected = true;
      deptSelect.appendChild(opt);
    });

    function updateProv(selectedD, selectedP = '') {
      provSelect.innerHTML = '<option value="">-- Seleccionar Provincia --</option>';
      munSelect.innerHTML = '<option value="">-- Seleccionar Municipio --</option>';
      if (!selectedD) return;
      const provs = [...new Set(TERRITORIOS.filter(t => t.d === selectedD).map(t => t.p))].sort();
      provs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        if (p === selectedP) opt.selected = true;
        provSelect.appendChild(opt);
      });
    }

    function updateMun(selectedD, selectedP, selectedM = '') {
      munSelect.innerHTML = '<option value="">-- Seleccionar Municipio --</option>';
      if (!selectedD || !selectedP) return;
      const muns = TERRITORIOS.filter(t => t.d === selectedD && t.p === selectedP).map(t => t.m).sort();
      muns.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        if (m === selectedM) opt.selected = true;
        munSelect.appendChild(opt);
      });
    }

    deptSelect.addEventListener('change', (e) => updateProv(e.target.value));
    provSelect.addEventListener('change', (e) => updateMun(deptSelect.value, e.target.value));

    if (initialValues.departamento) {
      updateProv(initialValues.departamento, initialValues.provincia);
      if (initialValues.provincia) {
        updateMun(initialValues.departamento, initialValues.provincia, initialValues.municipio);
      }
    }
  }

  // --- ESTADÍSTICAS REALES SIN LÍMITE DE 1000 ---
  async function loadEstadisticasReales() {
    const sb = getSupabase();
    if (!sb) return null;

    // 1. Intentar llamar a la función RPC optimizada
    try {
      const { data: rpcData, error: rpcError } = await sb.rpc('fn_dashboard_estadisticas');
      if (!rpcError && rpcData && rpcData.vigentes_count !== undefined) {
        return rpcData;
      }
    } catch (e) {
      console.warn('Función RPC no disponible, usando cálculo directo por lotes.');
    }

    // 2. Paginación por lotes para traer TODOS los registros (sin límite de 1000)
    let totalTF = 0;
    let totalSup = 0;
    let totalDisp = 0;

    let vigentesCount = 0;
    let vigentesSup = 0;
    let compensadasCount = 0;
    let compensadasSup = 0;
    let contenciososCount = 0;
    let contenciososSup = 0;
    let anuladasCount = 0;
    let anuladasSup = 0;
    let noReportadasCount = 0;
    let noReportadasSup = 0;

    const deptCounts = {};

    const BATCH = 1000;
    let from = 0;
    let allRows = [];
    let keepGoing = true;

    while (keepGoing) {
      const { data: batch, error: batchErr, count } = await sb
        .from('tierras_fiscales')
        .select('codpred, superficie_predio, sup_disp, departamento, estado_global, proceso_contencioso, nombre_tco, reporte_tf, estado, fecha_rem, gestion_reporte', { count: from === 0 ? 'exact' : undefined })
        .range(from, from + BATCH - 1);

      if (batchErr) {
        console.error('[Dashboard] Error al cargar lote:', batchErr);
        break;
      }

      if (!batch || batch.length === 0) {
        keepGoing = false;
        break;
      }

      // Primera pasada: capturar el conteo total real de Supabase
      if (from === 0 && count !== null && count !== undefined) {
        totalTF = count;
      }

      allRows = allRows.concat(batch);
      from += BATCH;

      // Si llegamos al total exacto o al batch incompleto, terminamos
      if (batch.length < BATCH) {
        keepGoing = false;
      }
    }

    // Si el count no llegó por RPC, usamos el total de filas cargadas
    if (totalTF === 0) totalTF = allRows.length;

    allRows.forEach(r => {
      const sup = parseFloat(r.superficie_predio) || 0;
      const disp = parseFloat(r.sup_disp) || 0;
      totalSup += sup;
      totalDisp += disp;

      const d = r.departamento || 'SIN ASIGNAR';
      deptCounts[d] = (deptCounts[d] || 0) + 1;

      const eg = (r.estado_global || '').toUpperCase();

      // Clasificar EXCLUSIVAMENTE por estado_global
      if (eg.includes('ANULADA')) {
        anuladasCount++;
        anuladasSup += sup;
      } else if (eg.includes('CONTENCIOSO')) {
        contenciososCount++;
        contenciososSup += sup;
      } else if (eg.includes('COMPENSADA')) {
        compensadasCount++;
        compensadasSup += sup;
      } else if (eg.includes('NO REPORTADA') || eg.includes('OBSERVADA')) {
        noReportadasCount++;
        noReportadasSup += sup;
      } else {
        // VIGENTE u otros
        vigentesCount++;
        vigentesSup += sup;
      }
    });

    const distDeptos = Object.entries(deptCounts)
      .map(([d, c]) => ({ departamento: d, total: c }))
      .sort((a, b) => b.total - a.total);

    // Conteo de expedientes remitidos actualmente (solo SALIDA sin retorno posterior)
    let totalRemitidos = 0;
    try {
      const { count: cntRem } = await sb
        .from('remision_expedientes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo_movimiento', 'SALIDA');
      totalRemitidos = cntRem || 0;
    } catch (e) {}

    return {
      total_tf: totalTF,
      superficie_total: totalSup,
      superficie_disponible: totalDisp,
      vigentes_count: vigentesCount,
      vigentes_sup: vigentesSup,
      compensadas_count: compensadasCount,
      compensadas_sup: compensadasSup,
      contenciosos_count: contenciososCount,
      contenciosos_sup: contenciososSup,
      anuladas_count: anuladasCount,
      anuladas_sup: anuladasSup,
      no_reportadas_count: noReportadasCount,
      no_reportadas_sup: noReportadasSup,
      expedientes_remitidos: totalRemitidos,
      distribucion_departamentos: distDeptos
    };
  }

  // --- CONSULTA PAGINADA DE TIERRAS FISCALES ---
  async function fetchTierrasFiscalesPaginadas(filters = {}, page = 1, pageSize = 25) {
    const sb = getSupabase();
    if (!sb) return { data: [], totalCount: 0, page: 1, totalPages: 1 };

    let q = sb
      .from('tierras_fiscales')
      .select('codpred, nombre_predio, superficie_predio, sup_disp, resolucion_tf, fecha_res_tf, departamento, provincia, municipio, numero_archivador, estado_global, expediente, remision_expedientes(tipo_movimiento, direccion_destino, created_at)', { count: 'exact' });

    if (filters.search) {
      const term = filters.search.trim().replace(/[,%]/g, ' ');
      q = q.or(`codpred.ilike.%${term}%,nombre_predio.ilike.%${term}%,resolucion_tf.ilike.%${term}%,expediente.ilike.%${term}%,numero_archivador.ilike.%${term}%,departamento.ilike.%${term}%,municipio.ilike.%${term}%,provincia.ilike.%${term}%`);
    }
    // Usar ilike en lugar de eq para mayor tolerancia a variaciones de mayúsculas/espacios en BD
    if (filters.departamento) q = q.ilike('departamento', filters.departamento);
    if (filters.estado_global) q = q.ilike('estado_global', filters.estado_global);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    q = q.order('codpred', { ascending: true }).range(from, to);

    const { data, count, error } = await q;
    if (error) {
      console.error('[fetchTierrasFiscalesPaginadas] Error:', error);
      showToast('Error consultando datos: ' + error.message, 'danger');
      return { data: [], totalCount: 0, page: 1, totalPages: 1 };
    }

    const processedData = (data || []).map(tf => {
      let ubicacion = 'ARCHIVO INRA';
      let estadoMov = 'EN_ARCHIVO';
      if (tf.remision_expedientes && tf.remision_expedientes.length > 0) {
        const sorted = tf.remision_expedientes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (sorted[0].tipo_movimiento === 'SALIDA') {
          ubicacion = sorted[0].direccion_destino || 'REMITIDO';
          estadoMov = 'REMITIDO';
        }
      }
      return { ...tf, _ubicacion_expediente: ubicacion, _estado_expediente: estadoMov };
    });

    const totalCount = count || processedData.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      data: processedData,
      totalCount,
      page,
      pageSize,
      totalPages
    };
  }

  // --- OBTENER FICHA COMPLETA POR CODPRED ---
  async function getTierraFiscalByCodpred(codpred) {
    const sb = getSupabase();
    if (!sb || !codpred) return null;
    const cleanCodpred = String(codpred).trim();
    const { data, error } = await sb
      .from('tierras_fiscales')
      .select('*, remision_expedientes(*)')
      .eq('codpred', cleanCodpred)
      .single();

    if (error) {
      console.error('Error cargando TF:', error);
      return null;
    }
    return data;
  }

  // --- BUSCADOR PREDICTIVO PARA REMISIÓN DE EXPEDIENTE & PREVISUALIZACIÓN ---
  async function buscarPrediosParaRemision(term) {
    const sb = getSupabase();
    if (!sb || !term || term.trim().length < 2) return [];
    const t = term.trim().replace(/[,%]/g, '');

    const CAMPOS_SELECT = `
      codpred, expediente, nombre_predio,
      departamento, provincia, municipio,
      superficie_predio, sup_disp, sup_nodisp,
      resolucion_tf, fecha_res_tf,
      numero_archivador, cuerpos, gavetero, caja,
      estado_global,
      remision_expedientes (
        id, tipo_movimiento, direccion_destino,
        motivo, nota_remision, hr_remision,
        funcionario_remitente, created_at
      )
    `;

    // Query 1: prioridad → expediente y numero_archivador (el usuario busca por N° de exp)
    const q1 = sb.from('tierras_fiscales')
      .select(CAMPOS_SELECT)
      .or(`expediente.ilike.%${t}%,numero_archivador.ilike.%${t}%`)
      .limit(20);

    // Query 2: búsqueda secundaria → codpred, nombre, ubicación
    const q2 = sb.from('tierras_fiscales')
      .select(CAMPOS_SELECT)
      .or(`codpred.ilike.%${t}%,nombre_predio.ilike.%${t}%,resolucion_tf.ilike.%${t}%,municipio.ilike.%${t}%,departamento.ilike.%${t}%`)
      .limit(15);

    const [res1, res2] = await Promise.all([q1, q2]);

    if (res1.error) console.error('[Búsqueda exp priority]', res1.error);
    if (res2.error) console.error('[Búsqueda general]', res2.error);

    // Combinar: primero los de expediente, luego los demás (sin duplicados)
    const seenCodpreds = new Set();
    const combined = [];

    for (const p of [...(res1.data || []), ...(res2.data || [])]) {
      if (!seenCodpreds.has(p.codpred)) {
        seenCodpreds.add(p.codpred);
        combined.push(p);
      }
    }

    return combined.map(p => {
      let estadoCustodia = 'EN_ARCHIVO';
      let ubicacionActual = 'ARCHIVO CENTRAL / CUSTODIA TF';
      let ultimoMovimiento = null;

      if (p.remision_expedientes && p.remision_expedientes.length > 0) {
        const sorted = [...p.remision_expedientes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        ultimoMovimiento = sorted[0];
        if (sorted[0].tipo_movimiento === 'SALIDA') {
          estadoCustodia = 'REMITIDO';
          ubicacionActual = sorted[0].direccion_destino || 'REMITIDO A OTRA UNIDAD';
        }
      }

      return {
        ...p,
        _estadoCustodia: estadoCustodia,
        _ubicacionActual: ubicacionActual,
        _ultimoMovimiento: ultimoMovimiento
      };
    });
  }

  // --- GUARDAR O ACTUALIZAR TIERRA FISCAL ---
  async function saveTierraFiscal(record, isEdit = false) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sin conexión a Supabase');

    // Descartar campos auxiliares definitivamente
    delete record.nombre_tf_auxiliar;
    delete record.nombre_predio_auxiliar;

    record.nombre_tf = 'TIERRA FISCAL';
    record.codpred = String(record.codpred || '').trim();
    if (!record.codpred) throw new Error('El CODPRED es obligatorio');

    const supTotal = parseFloat(record.superficie_predio) || 0;
    const supNoDisp = parseFloat(record.sup_nodisp) || 0;
    record.sup_disp = Math.max(0, supTotal - supNoDisp);

    if (record.fecha_rem) {
      const d = new Date(record.fecha_rem);
      if (!isNaN(d.getFullYear())) record.gestion_reporte = d.getFullYear();
    }

    // Auto-detectar proceso contencioso
    if (record.nro_sentencia_agroambiental || record.obs_procont || record.estado_proceso_contencioso) {
      record.proceso_contencioso = true;
    }

    Object.keys(record).forEach(k => { if (record[k] === '') record[k] = null; });

    if (isEdit) {
      const { data, error } = await sb.from('tierras_fiscales').update(record).eq('codpred', record.codpred).select().single();
      if (error) throw error;
      showToast('Tierra Fiscal actualizada exitosamente', 'success');
      return data;
    } else {
      const { data, error } = await sb.from('tierras_fiscales').insert([record]).select().single();
      if (error) throw error;
      showToast('Tierra Fiscal registrada exitosamente', 'success');
      return data;
    }
  }

  // --- CONSULTA Y REGISTRO DE MOVIMIENTOS DE EXPEDIENTE ---
  async function fetchMovimientosExpedientes(filters = {}) {
    const sb = getSupabase();
    if (!sb) return [];
    let q = sb
      .from('remision_expedientes')
      .select('*, tierras_fiscales(nombre_predio, departamento, expediente, numero_archivador)')
      .order('created_at', { ascending: false });

    if (filters.tipo_movimiento) q = q.eq('tipo_movimiento', filters.tipo_movimiento);
    if (filters.search) {
      const term = filters.search.trim();
      q = q.or(`codpred.ilike.%${term}%,expediente.ilike.%${term}%,hr_remision.ilike.%${term}%,nota_remision.ilike.%${term}%`);
    }

    const { data, error } = await q;
    if (error) {
      showToast('Error cargando movimientos: ' + error.message, 'danger');
      return [];
    }
    return data || [];
  }

  async function registrarMovimiento(payload, tipo) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sin conexión a Supabase');

    const cleanCodpred = String(payload.codpred || '').trim();
    if (!cleanCodpred) {
      throw new Error('Debe seleccionar una Tierra Fiscal válida con su CODPRED.');
    }

    const movementType = (tipo || payload.tipo_movimiento || 'SALIDA').toUpperCase();

    // Validación preventiva: comprobar que el codpred existe realmente en tierras_fiscales
    const { data: tfExiste, error: errCheck } = await sb
      .from('tierras_fiscales')
      .select('codpred, expediente')
      .eq('codpred', cleanCodpred)
      .single();

    if (errCheck || !tfExiste) {
      throw new Error(`El CODPRED "${cleanCodpred}" no existe en la base de datos de Tierras Fiscales. Seleccione un predio existente.`);
    }

    const record = {
      codpred: tfExiste.codpred,
      expediente: payload.expediente || tfExiste.expediente || null,
      tipo_movimiento: movementType,
      direccion_destino: movementType === 'SALIDA' ? (payload.direccion_destino || 'DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS') : 'ARCHIVO TIERRAS FISCALES INRA',
      motivo: payload.motivo || (movementType === 'SALIDA' ? 'Remisión de expediente' : 'Devolución de expediente a custodia'),
      nota_remision: payload.nota_remision || null,
      fecha_nota: payload.fecha_nota || null,
      hr_remision: payload.hr_remision || null,
      fecha_hr: payload.fecha_hr || null,
      nro_cuerpos: parseInt(payload.nro_cuerpos) || 1,
      nro_fojas: payload.nro_fojas ? parseInt(payload.nro_fojas) : null,
      funcionario_remitente: payload.funcionario_remitente || 'Funcionario INRA',
      fecha_retorno: movementType === 'RETORNO' ? (payload.fecha_retorno || new Date().toISOString().split('T')[0]) : null,
      nota_retorno: movementType === 'RETORNO' ? (payload.nota_remision || payload.nota_retorno || null) : null,
      hr_retorno: movementType === 'RETORNO' ? (payload.hr_remision || payload.hr_retorno || null) : null,
      obs_remision: payload.obs_remision || null
    };

    const { data, error } = await sb.from('remision_expedientes').insert([record]).select().single();
    if (error) {
      console.error('Error insertando movimiento:', error);
      throw error;
    }
    showToast(`Movimiento (${movementType}) registrado exitosamente`, 'success');
    return data;
  }

  // --- ADMINISTRACIÓN DE USUARIOS Y CATÁLOGOS ---
  async function fetchUsers() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Error cargando usuarios: ' + error.message, 'danger');
      return [];
    }
    return data || [];
  }

  async function updateUserRole(userId, newRole) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from('perfiles')
      .update({ rol: newRole })
      .eq('id', userId);

    if (error) {
      showToast('Error al cambiar rol: ' + error.message, 'danger');
    } else {
      showToast('Rol de usuario actualizado correctamente', 'success');
    }
  }

  async function addCatalogValue(tipo, valor, orden = 0) {
    const sb = getSupabase();
    if (!sb) return null;
    const valClean = (valor || '').trim().toUpperCase();
    if (!valClean) {
      showToast('El valor del catálogo no puede estar vacío', 'warning');
      return null;
    }
    const { data, error } = await sb
      .from('catalogos')
      .insert([{ tipo, valor: valClean, orden, activo: true }])
      .select();

    if (error) {
      showToast('Error agregando opción: ' + error.message, 'danger');
      return null;
    }
    showToast('Valor agregado al catálogo correctamente', 'success');
    return data;
  }

  return {
    getSupabase, setSupabaseConfig, getSupabaseConfig, showToast, formatDate, formatHectareas, debounce, exportToCSV,
    login, logout, getCurrentProfile, checkAuthGuard, renderUserInLayout, applyRoleVisibility,
    populateSelect, initAllCatalogSelects, setupCascadeTerritorios,
    loadEstadisticasReales, fetchTierrasFiscalesPaginadas, getTierraFiscalByCodpred, buscarPrediosParaRemision, saveTierraFiscal,
    fetchMovimientosExpedientes, registrarMovimiento,
    fetchUsers, updateUserRole, addCatalogValue
  };
})();
