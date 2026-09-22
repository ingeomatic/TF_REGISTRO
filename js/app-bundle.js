/* ==============================================================================
   js/app-bundle.js - Sistema de Administración de Tierras Fiscales (DGATF)
   Versión Profesional Optimizada para Grandes Volúmenes de Datos (6,000+)
   ============================================================================== */

window.DGATF = window.INRA = (function() {
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

  // --- CATÁLOGOS BASE CON VALORES PREDETERMINADOS INSTITUCIONALES ---
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
    estado_proceso_contencioso: ['CONCLUIDO', 'EN TRAMITE', 'OTRO'],
    resolucion_sentencia: ['PROBADA LA DEMANDA', 'IMPROBADA LA DEMANDA', 'PERENCION DE INSTANCIA', 'ANULACION DE OBRADOS'],
    estado_compensacion: ['PENDIENTE DE COMPENSACION', 'EN TRÁMITE', 'COMPENSADA TOTALMENTE', 'COMPENSADA PARCIALMENTE'],
    direccion_destino: [
      'DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS',
      'DIRECCIÓN GENERAL DE SANEAMIENTO Y TITULACIÓN',
      'DIRECCIÓN GENERAL DE CATASTRO RURAL',
      'DIRECCIÓN DEPARTAMENTAL BENI',
      'DIRECCIÓN DEPARTAMENTAL CHUQUISACA',
      'DIRECCIÓN DEPARTAMENTAL COCHABAMBA',
      'DIRECCIÓN DEPARTAMENTAL LA PAZ',
      'DIRECCIÓN DEPARTAMENTAL ORURO',
      'DIRECCIÓN DEPARTAMENTAL PANDO',
      'DIRECCIÓN DEPARTAMENTAL POTOSÍ',
      'DIRECCIÓN DEPARTAMENTAL SANTA CRUZ',
      'DIRECCIÓN DEPARTAMENTAL TARIJA',
      'OTRO'
    ]
  };

  const CAMPOS_CATALOGO_TF = [
    'tipo_de_res',
    'tipo_tf',
    'clasificacion',
    'calificacion',
    'modalidad',
    'estado',
    'estado_global',
    'clase_res',
    'reporte_tf',
    'estado_proceso_contencioso',
    'resolucion_sentencia',
    'estado_compensacion'
  ];

  // Cache dinámico de valores únicos detectados en la tabla tierras_fiscales de Supabase
  let CATALOGOS_CACHE = null;

  async function getCatalogValues(tipo) {
    if (!CATALOGOS_CACHE) {
      await reloadCatalogosCache();
    }
    return (CATALOGOS_CACHE && CATALOGOS_CACHE[tipo]) || DEFAULT_CATALOGOS[tipo] || [];
  }

  // Auto-descubre los valores únicos existentes en cada columna de tierras_fiscales en Supabase
  async function reloadCatalogosCache(forceRefresh = false) {
    if (!forceRefresh && CATALOGOS_CACHE) {
      return CATALOGOS_CACHE;
    }

    // Revisar caché en sesión para evitar latencia innecesaria en navegación
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem('INRA_VALORES_UNICOS_CACHE');
        if (cached) {
          CATALOGOS_CACHE = JSON.parse(cached);
          return CATALOGOS_CACHE;
        }
      } catch (e) {}
    }

    CATALOGOS_CACHE = {};
    // 1. Inicializar con los defaults institucionales
    Object.keys(DEFAULT_CATALOGOS).forEach(k => {
      CATALOGOS_CACHE[k] = [...DEFAULT_CATALOGOS[k]];
    });

    const sb = getSupabase();
    if (!sb) return CATALOGOS_CACHE;

    try {
      // 2. Extraer TODOS los valores únicos existentes en cada campo de la tabla de Supabase (tierras_fiscales)
      const uniqueSets = {};
      CAMPOS_CATALOGO_TF.forEach(c => { uniqueSets[c] = new Set(); });

      const BATCH = 1000;
      let from = 0;
      let keepGoing = true;

      while (keepGoing) {
        const { data: batch, error } = await sb
          .from('tierras_fiscales')
          .select(CAMPOS_CATALOGO_TF.join(','))
          .range(from, from + BATCH - 1);

        if (error || !batch || batch.length === 0) {
          break;
        }

        batch.forEach(row => {
          CAMPOS_CATALOGO_TF.forEach(col => {
            const val = row[col];
            if (val && typeof val === 'string') {
              const clean = val.trim().toUpperCase();
              if (clean && clean !== 'NULL' && clean !== 'UNDEFINED' && clean !== '-' && clean !== 'S/D') {
                uniqueSets[col].add(clean);
              }
            }
          });
        });

        from += BATCH;
        if (batch.length < BATCH) keepGoing = false;
      }

      // 3. Asignar los valores únicos detectados directamente de la tabla de Supabase
      CAMPOS_CATALOGO_TF.forEach(col => {
        if (uniqueSets[col].size > 0) {
          // Si en la tabla de Supabase existen valores, la lista refleja exactamente los valores únicos reales
          const listaValores = Array.from(uniqueSets[col]).sort((a, b) => a.localeCompare(b, 'es'));
          CATALOGOS_CACHE[col] = listaValores;
        } else {
          // Si la columna está totalmente vacía en la base de datos, conservar los defaults como base
          CATALOGOS_CACHE[col] = [...(DEFAULT_CATALOGOS[col] || [])];
        }
      });

      CATALOGOS_CACHE.direccion_destino = [...DEFAULT_CATALOGOS.direccion_destino];

      // Guardar en sesión para carga ultrarrápida
      try {
        sessionStorage.setItem('INRA_VALORES_UNICOS_CACHE', JSON.stringify(CATALOGOS_CACHE));
      } catch (e) {}

    } catch (err) {
      console.warn('Error auto-detectando valores únicos desde tierras_fiscales:', err);
    }

    return CATALOGOS_CACHE;
  }

  // Poblar select con valores dinámicos y opción de agregar nuevo valor directamente desde el sistema
  async function populateSelect(selectEl, tipo, selectedValue = '', allowAddCustom = true) {
    if (!selectEl) return;
    const values = await getCatalogValues(tipo);
    selectEl.innerHTML = '<option value="">-- Seleccionar --</option>';

    const valToSelect = (selectedValue !== undefined && selectedValue !== null ? String(selectedValue) : '').trim().toUpperCase();
    let matched = false;

    values.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      if (valToSelect && val === valToSelect) {
        opt.selected = true;
        matched = true;
      }
      selectEl.appendChild(opt);
    });

    // Si había un valor registrado en la base de datos que no está en la lista estándar, preservarlo
    if (valToSelect && !matched) {
      const opt = document.createElement('option');
      opt.value = valToSelect;
      opt.textContent = valToSelect;
      opt.selected = true;
      selectEl.appendChild(opt);
    }

    // Opción para que el usuario pueda agregar un nuevo valor directamente en el entorno del sistema
    if (allowAddCustom) {
      const optAdd = document.createElement('option');
      optAdd.value = '__ADD_NEW_OPTION__';
      optAdd.textContent = '➕ + Escribir nuevo valor...';
      optAdd.style.color = '#047857';
      optAdd.style.fontWeight = 'bold';
      selectEl.appendChild(optAdd);
    }

    // Asignar manejador de evento para cuando el usuario seleccione "+ Escribir nuevo valor..."
    if (!selectEl._hasCustomValueHandler) {
      selectEl._hasCustomValueHandler = true;
      selectEl.addEventListener('change', async (e) => {
        if (e.target.value === '__ADD_NEW_OPTION__') {
          const formGroup = selectEl.closest('.form-group');
          const label = formGroup ? (formGroup.querySelector('.form-label')?.textContent || tipo) : tipo;
          const nuevoTexto = prompt(`Ingrese el nuevo valor para "${label}":`);
          
          if (nuevoTexto && nuevoTexto.trim()) {
            const valorLimpio = nuevoTexto.trim().toUpperCase();
            
            // Insertar antes de la opción de agregar
            const nuevaOpt = document.createElement('option');
            nuevaOpt.value = valorLimpio;
            nuevaOpt.textContent = valorLimpio;
            nuevaOpt.selected = true;
            selectEl.insertBefore(nuevaOpt, selectEl.lastElementChild);
            selectEl.value = valorLimpio;

            // Actualizar catálogo en memoria y sesión para que esté disponible en todo el entorno
            if (!CATALOGOS_CACHE[tipo]) CATALOGOS_CACHE[tipo] = [];
            if (!CATALOGOS_CACHE[tipo].includes(valorLimpio)) {
              CATALOGOS_CACHE[tipo].push(valorLimpio);
              CATALOGOS_CACHE[tipo].sort((a, b) => a.localeCompare(b, 'es'));
            }
            try {
              sessionStorage.setItem('INRA_VALORES_UNICOS_CACHE', JSON.stringify(CATALOGOS_CACHE));
            } catch (err) {}

            showToast(`Nuevo valor "${valorLimpio}" añadido. Al guardar el registro quedará registrado en la base de datos.`, 'success');
          } else {
            selectEl.value = '';
          }
        }
      });
    }
  }

  async function initAllCatalogSelects() {
    await reloadCatalogosCache();
    const selects = document.querySelectorAll('select[data-catalogo]');
    for (const sel of selects) {
      const tipo = sel.getAttribute('data-catalogo');
      const val = sel.getAttribute('data-selected-value') || '';
      await populateSelect(sel, tipo, val);
    }
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

    // Paginación por lotes para traer TODOS los registros (sin límite de 1000)
    let totalTF = 0;
    let totalSup = 0;

    let vigentesCount = 0;
    let vigentesSup = 0;
    let compensadasCount = 0;
    let compensadasSup = 0;
    let anuladasCount = 0;
    let anuladasSup = 0;
    let noReportadasCount = 0;
    let noReportadasSup = 0;

    const deptMap = {};
    const clasifMap = {};

    const BATCH = 1000;
    let from = 0;
    let allRows = [];
    let keepGoing = true;

    while (keepGoing) {
      const { data: batch, error: batchErr, count } = await sb
        .from('tierras_fiscales')
        .select('codpred, superficie_predio, sup_disp, departamento, clasificacion, estado_global, proceso_contencioso, nombre_tco, reporte_tf, estado, fecha_rem, gestion_reporte, nota_catastro_cc, registro_ddrr, nro_folio_real', { count: from === 0 ? 'exact' : undefined })
        .range(from, from + BATCH - 1);

      if (batchErr) {
        console.error('[Dashboard] Error al cargar lote:', batchErr);
        break;
      }

      if (!batch || batch.length === 0) {
        keepGoing = false;
        break;
      }

      if (from === 0 && count !== null && count !== undefined) {
        totalTF = count;
      }

      allRows = allRows.concat(batch);
      from += BATCH;

      if (batch.length < BATCH) {
        keepGoing = false;
      }
    }

    if (totalTF === 0) totalTF = allRows.length;

    allRows.forEach(r => {
      const sup = parseFloat(r.superficie_predio) || 0;
      totalSup += sup;

      const eg = (r.estado_global || '').toUpperCase();
      const rep = (r.reporte_tf || '').toUpperCase().trim();
      const est = (r.estado || '').toUpperCase();
      const hasCatastro = !!((r.nota_catastro_cc && String(r.nota_catastro_cc).trim()) ||
                             (r.registro_ddrr && String(r.registro_ddrr).trim()) ||
                             (r.nro_folio_real && String(r.nro_folio_real).trim()));

      let catKey = 'VIGENTE';
      if (eg.includes('ANULADA')) {
        catKey = 'ANULADA';
        anuladasCount++;
        anuladasSup += sup;
      } else if (eg.includes('COMPENSADA') || (r.nombre_tco && String(r.nombre_tco).trim()) || est.includes('COMPENSADO')) {
        catKey = 'COMPENSADA';
        compensadasCount++;
        compensadasSup += sup;
      } else if (rep === 'NO' || eg.includes('NO REPORT') || eg.includes('OBSERVAD') || hasCatastro || est.includes('CATASTRO')) {
        catKey = 'NO_REPORTADA';
        noReportadasCount++;
        noReportadasSup += sup;
      } else {
        catKey = 'VIGENTE';
        vigentesCount++;
        vigentesSup += sup;
      }

      // Distribución Departamental
      const d = (r.departamento || 'SIN ASIGNAR').trim().toUpperCase();
      if (!deptMap[d]) {
        deptMap[d] = { departamento: d, vigentes: 0, vigentes_sup: 0, compensadas: 0, compensadas_sup: 0, anuladas: 0, anuladas_sup: 0, no_reportadas: 0, no_reportadas_sup: 0, total: 0, total_sup: 0 };
      }
      deptMap[d].total++;
      deptMap[d].total_sup += sup;
      if (catKey === 'VIGENTE') { deptMap[d].vigentes++; deptMap[d].vigentes_sup += sup; }
      else if (catKey === 'COMPENSADA') { deptMap[d].compensadas++; deptMap[d].compensadas_sup += sup; }
      else if (catKey === 'ANULADA') { deptMap[d].anuladas++; deptMap[d].anuladas_sup += sup; }
      else if (catKey === 'NO_REPORTADA') { deptMap[d].no_reportadas++; deptMap[d].no_reportadas_sup += sup; }

      // Distribución por Clasificación
      const c = (r.clasificacion || 'SIN CLASIFICAR').trim().toUpperCase();
      if (!clasifMap[c]) {
        clasifMap[c] = { clasificacion: c, vigentes: 0, vigentes_sup: 0, compensadas: 0, compensadas_sup: 0, anuladas: 0, anuladas_sup: 0, no_reportadas: 0, no_reportadas_sup: 0, total: 0, total_sup: 0 };
      }
      clasifMap[c].total++;
      clasifMap[c].total_sup += sup;
      if (catKey === 'VIGENTE') { clasifMap[c].vigentes++; clasifMap[c].vigentes_sup += sup; }
      else if (catKey === 'COMPENSADA') { clasifMap[c].compensadas++; clasifMap[c].compensadas_sup += sup; }
      else if (catKey === 'ANULADA') { clasifMap[c].anuladas++; clasifMap[c].anuladas_sup += sup; }
      else if (catKey === 'NO_REPORTADA') { clasifMap[c].no_reportadas++; clasifMap[c].no_reportadas_sup += sup; }
    });

    const distDeptos = Object.values(deptMap).sort((a, b) => b.total - a.total);
    const distClasif = Object.values(clasifMap).sort((a, b) => b.total - a.total);

    return {
      total_tf: totalTF,
      superficie_total: totalSup,
      vigentes_count: vigentesCount,
      vigentes_sup: vigentesSup,
      compensadas_count: compensadasCount,
      compensadas_sup: compensadasSup,
      anuladas_count: anuladasCount,
      anuladas_sup: anuladasSup,
      no_reportadas_count: noReportadasCount,
      no_reportadas_sup: noReportadasSup,
      distribucion_departamentos: distDeptos,
      distribucion_clasificacion: distClasif
    };
  }

  // --- CONSULTA PAGINADA DE TIERRAS FISCALES ---
  async function fetchTierrasFiscalesPaginadas(filters = {}, page = 1, pageSize = 25) {
    const sb = getSupabase();
    if (!sb) return { data: [], totalCount: 0, page: 1, totalPages: 1 };

    let q = sb
      .from('tierras_fiscales')
      .select('codpred, nombre_predio, superficie_predio, sup_disp, resolucion_tf, fecha_res_tf, departamento, provincia, municipio, numero_archivador, estado, estado_global, expediente', { count: 'exact' });

    if (filters.search) {
      const term = filters.search.trim().replace(/['"%;()]/g, ' ');
      q = q.or(`codpred.ilike.%${term}%,nombre_predio.ilike.%${term}%,resolucion_tf.ilike.%${term}%,expediente.ilike.%${term}%,numero_archivador.ilike.%${term}%,departamento.ilike.%${term}%,municipio.ilike.%${term}%,provincia.ilike.%${term}%`);
    }
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

    const rows = data || [];
    const totalCount = count !== null && count !== undefined ? count : rows.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      data: rows,
      totalCount,
      page,
      pageSize,
      totalPages
    };
  }

  // --- EXPORTAR TODA LA BASE DE DATOS (SIN LÍMITE DE 1000) ---
  async function exportAllTierrasFiscales(filters = {}, filename = 'registro_general_tierras_fiscales.csv', onProgress = null) {
    const sb = getSupabase();
    if (!sb) {
      showToast('Sin conexión a Supabase', 'danger');
      return;
    }

    const BATCH = 1000;
    let from = 0;
    let allRows = [];
    let keepGoing = true;

    showToast('Iniciando descarga completa de la base de datos...', 'info');

    while (keepGoing) {
      let q = sb.from('tierras_fiscales').select('*');

      if (filters.search) {
        const term = filters.search.trim().replace(/['"%;()]/g, ' ');
        q = q.or(`codpred.ilike.%${term}%,nombre_predio.ilike.%${term}%,resolucion_tf.ilike.%${term}%,expediente.ilike.%${term}%,numero_archivador.ilike.%${term}%,departamento.ilike.%${term}%,municipio.ilike.%${term}%,provincia.ilike.%${term}%`);
      }
      if (filters.departamento) q = q.ilike('departamento', filters.departamento);
      if (filters.estado_global) q = q.ilike('estado_global', filters.estado_global);

      q = q.order('codpred', { ascending: true }).range(from, from + BATCH - 1);

      const { data: batch, error } = await q;
      if (error) {
        console.error('Error al exportar lote:', error);
        showToast('Error durante la descarga: ' + error.message, 'danger');
        break;
      }

      if (!batch || batch.length === 0) {
        keepGoing = false;
        break;
      }

      allRows = allRows.concat(batch);
      from += BATCH;

      if (onProgress) onProgress(allRows.length);

      if (batch.length < BATCH) {
        keepGoing = false;
      }
    }

    if (allRows.length === 0) {
      showToast('No se encontraron registros para exportar', 'warning');
      return;
    }

    exportToCSV(allRows, filename);
  }

  // --- OBTENER FICHA COMPLETA POR CODPRED ---
  async function getTierraFiscalByCodpred(codpred) {
    const sb = getSupabase();
    if (!sb || !codpred) return null;
    const cleanCodpred = String(codpred).trim();

    try {
      const { data, error } = await sb
        .from('tierras_fiscales')
        .select('*')
        .ilike('codpred', cleanCodpred)
        .limit(1);

      if (error || !data || data.length === 0) {
        console.error('Error cargando TF:', error);
        return null;
      }

      const tf = data[0];

      // Cargar historial de remisión desacoplado
      try {
        const { data: movs } = await sb
          .from('remision_expedientes')
          .select('*')
          .eq('codpred', tf.codpred)
          .order('created_at', { ascending: false });
        tf.remision_expedientes = movs || [];
      } catch (movErr) {
        tf.remision_expedientes = [];
      }

      return tf;
    } catch (err) {
      console.error('Error general getTierraFiscalByCodpred:', err);
      return null;
    }
  }

  // --- BUSCADOR PREDICTIVO PARA REMISIÓN DE EXPEDIENTE & PREVISUALIZACIÓN ---
  async function buscarPrediosParaRemision(term) {
    const sb = getSupabase();
    if (!sb || !term || String(term).trim().length < 2) return [];

    const rawTerm = String(term).trim();
    // Limpiar caracteres que pudieran romper la sintaxis .or() de PostgREST
    const t = rawTerm.replace(/['"%;()\\\/]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return [];

    const CAMPOS_SELECT = `
      codpred, expediente, nombre_predio,
      departamento, provincia, municipio,
      superficie_predio, sup_disp, sup_nodisp,
      resolucion_tf, fecha_res_tf,
      numero_archivador, cuerpos, gavetero, caja,
      estado_global
    `;

    try {
      // 1. Búsqueda prioritaria por expediente y número de archivador
      const qExp = sb.from('tierras_fiscales')
        .select(CAMPOS_SELECT)
        .or(`expediente.ilike.%${t}%,numero_archivador.ilike.%${t}%`)
        .limit(25);

      // 2. Búsqueda secundaria por codpred, nombre predio, resolución, municipio, departamento
      const qGen = sb.from('tierras_fiscales')
        .select(CAMPOS_SELECT)
        .or(`codpred.ilike.%${t}%,nombre_predio.ilike.%${t}%,resolucion_tf.ilike.%${t}%,municipio.ilike.%${t}%,departamento.ilike.%${t}%`)
        .limit(20);

      const [resExp, resGen] = await Promise.all([qExp, qGen]);

      const seenCodpreds = new Set();
      const combined = [];

      // Priorizar los hallazgos por expediente
      for (const p of [...(resExp.data || []), ...(resGen.data || [])]) {
        if (p && p.codpred && !seenCodpreds.has(p.codpred)) {
          seenCodpreds.add(p.codpred);
          combined.push(p);
        }
      }

      if (combined.length === 0) {
        return [];
      }

      // 3. Consultar últimos movimientos de custodia en remision_expedientes de forma desacoplada
      const codpreds = combined.map(p => p.codpred);
      const ultimosMovs = {};

      try {
        const { data: movs } = await sb
          .from('remision_expedientes')
          .select('id, codpred, tipo_movimiento, direccion_destino, motivo, nota_remision, hr_remision, funcionario_remitente, created_at')
          .in('codpred', codpreds)
          .order('created_at', { ascending: false });

        if (movs && movs.length > 0) {
          movs.forEach(m => {
            if (!ultimosMovs[m.codpred]) ultimosMovs[m.codpred] = m;
          });
        }
      } catch (movErr) {
        console.warn('Advertencia consultando movimientos de expedientes:', movErr);
      }

      return combined.map(p => {
        let estadoCustodia = 'EN_ARCHIVO';
        let ubicacionActual = 'ARCHIVO CENTRAL / CUSTODIA TF';
        const u = ultimosMovs[p.codpred] || null;

        if (u && u.tipo_movimiento === 'SALIDA') {
          estadoCustodia = 'REMITIDO';
          ubicacionActual = u.direccion_destino || 'REMITIDO A OTRA DIRECCIÓN';
        }

        return {
          ...p,
          _estadoCustodia: estadoCustodia,
          _ubicacionActual: ubicacionActual,
          _ultimoMovimiento: u
        };
      });
    } catch (err) {
      console.error('Error en buscarPrediosParaRemision:', err);
      return [];
    }
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

    // Manejar superficies y números con tolerancia a comas decimales
    const supTotal = parseFloat(String(record.superficie_predio || 0).replace(',', '.')) || 0;
    const supNoDisp = parseFloat(String(record.sup_nodisp || 0).replace(',', '.')) || 0;
    record.superficie_predio = supTotal;
    record.sup_nodisp = supNoDisp;
    record.sup_disp = Math.max(0, supTotal - supNoDisp);

    if (record.superficie_compensada !== undefined && record.superficie_compensada !== null && record.superficie_compensada !== '') {
      record.superficie_compensada = parseFloat(String(record.superficie_compensada).replace(',', '.')) || null;
    } else {
      record.superficie_compensada = null;
    }

    if (record.cuerpos) {
      record.cuerpos = parseInt(record.cuerpos) || 1;
    }

    if (record.fecha_rem) {
      const d = new Date(record.fecha_rem);
      if (!isNaN(d.getFullYear())) record.gestion_reporte = d.getFullYear();
    }

    // Auto-detectar proceso contencioso
    if (record.nro_sentencia_agroambiental || record.obs_procont || record.estado_proceso_contencioso) {
      record.proceso_contencioso = true;
    }

    Object.keys(record).forEach(k => {
      if (record[k] === '' || record[k] === '__ADD_NEW_OPTION__') record[k] = null;
    });

    let savedData = null;
    if (isEdit) {
      const { data, error } = await sb.from('tierras_fiscales').update(record).eq('codpred', record.codpred).select();
      if (error) throw error;
      savedData = (data && data[0]) || data;
      showToast('Tierra Fiscal actualizada exitosamente', 'success');
    } else {
      const { data, error } = await sb.from('tierras_fiscales').insert([record]).select();
      if (error) throw error;
      savedData = (data && data[0]) || data;
      showToast('Tierra Fiscal registrada exitosamente', 'success');
    }

    // Invalidar caché para que los nuevos valores aparezcan en todo el sistema
    try {
      sessionStorage.removeItem('INRA_VALORES_UNICOS_CACHE');
      CATALOGOS_CACHE = null;
    } catch (e) {}

    return savedData;
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
      .ilike('codpred', cleanCodpred)
      .limit(1);

    const predioEncontrado = (tfExiste && tfExiste.length > 0) ? tfExiste[0] : null;

    if (!predioEncontrado) {
      throw new Error(`El CODPRED "${cleanCodpred}" no existe en la base de datos de Tierras Fiscales. Seleccione un predio existente.`);
    }

    const record = {
      codpred: predioEncontrado.codpred,
      expediente: payload.expediente || predioEncontrado.expediente || null,
      tipo_movimiento: movementType,
      direccion_destino: movementType === 'SALIDA' ? (payload.direccion_destino || 'DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS') : 'ARCHIVO DGATF',
      motivo: payload.motivo || (movementType === 'SALIDA' ? 'Remisión de expediente' : 'Devolución de expediente a custodia'),
      nota_remision: payload.nota_remision || null,
      fecha_nota: payload.fecha_nota || new Date().toISOString().split('T')[0],
      hr_remision: payload.hr_remision || null,
      fecha_hr: payload.fecha_hr || new Date().toISOString().split('T')[0],
      nro_cuerpos: parseInt(payload.nro_cuerpos) || 1,
      nro_fojas: payload.nro_fojas ? parseInt(payload.nro_fojas) : null,
      funcionario_remitente: payload.funcionario_remitente || 'Funcionario DGATF',
      fecha_retorno: movementType === 'RETORNO' ? (payload.fecha_retorno || new Date().toISOString().split('T')[0]) : null,
      nota_retorno: movementType === 'RETORNO' ? (payload.nota_remision || payload.nota_retorno || null) : null,
      hr_retorno: movementType === 'RETORNO' ? (payload.hr_remision || payload.hr_retorno || null) : null,
      obs_remision: payload.obs_remision || null
    };

    const { data, error } = await sb.from('remision_expedientes').insert([record]).select();
    if (error) {
      console.error('Error insertando movimiento:', error);
      throw error;
    }
    showToast(`Movimiento (${movementType}) registrado exitosamente`, 'success');
    return (data && data[0]) || data;
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

  async function addCatalogValue(tipo, valor) {
    const valClean = (valor || '').trim().toUpperCase();
    if (!valClean) {
      showToast('El valor no puede estar vacío', 'warning');
      return null;
    }
    if (!CATALOGOS_CACHE) await reloadCatalogosCache();
    if (!CATALOGOS_CACHE[tipo]) CATALOGOS_CACHE[tipo] = [];
    if (!CATALOGOS_CACHE[tipo].includes(valClean)) {
      CATALOGOS_CACHE[tipo].push(valClean);
      CATALOGOS_CACHE[tipo].sort((a, b) => a.localeCompare(b, 'es'));
    }
    try {
      sessionStorage.setItem('INRA_VALORES_UNICOS_CACHE', JSON.stringify(CATALOGOS_CACHE));
    } catch (e) {}

    showToast(`Opción "${valClean}" agregada al sistema`, 'success');
    return { tipo, valor: valClean };
  }

  async function fetchCatalogos(tipo = null) {
    if (!CATALOGOS_CACHE) {
      await reloadCatalogosCache();
    }
    const result = [];
    const tipos = tipo ? [tipo] : Object.keys(CATALOGOS_CACHE);
    tipos.forEach(t => {
      const vals = CATALOGOS_CACHE[t] || [];
      vals.forEach((v, idx) => {
        result.push({
          id: `${t}__${v}`,
          tipo: t,
          valor: v,
          orden: idx + 1
        });
      });
    });
    return result;
  }

  async function deleteCatalogValue(identificador) {
    if (!CATALOGOS_CACHE) await reloadCatalogosCache();
    let tipo = null;
    let valor = null;
    if (typeof identificador === 'string' && identificador.includes('__')) {
      const parts = identificador.split('__');
      tipo = parts[0];
      valor = parts.slice(1).join('__');
    }
    if (tipo && valor && CATALOGOS_CACHE[tipo]) {
      CATALOGOS_CACHE[tipo] = CATALOGOS_CACHE[tipo].filter(v => v !== valor);
      try {
        sessionStorage.setItem('INRA_VALORES_UNICOS_CACHE', JSON.stringify(CATALOGOS_CACHE));
      } catch (e) {}
    }
    showToast('Opción eliminada del sistema', 'success');
    return true;
  }

  return {
    getSupabase, setSupabaseConfig, getSupabaseConfig, showToast, formatDate, formatHectareas, debounce, exportToCSV,
    login, logout, getCurrentProfile, checkAuthGuard, renderUserInLayout, applyRoleVisibility,
    populateSelect, initAllCatalogSelects, setupCascadeTerritorios, getCatalogValues, reloadCatalogosCache,
    loadEstadisticasReales, fetchTierrasFiscalesPaginadas, exportAllTierrasFiscales, getTierraFiscalByCodpred, buscarPrediosParaRemision, saveTierraFiscal,
    fetchMovimientosExpedientes, registrarMovimiento,
    fetchUsers, updateUserRole, addCatalogValue, fetchCatalogos, deleteCatalogValue
  };
})();

window.DGATF = window.INRA;

