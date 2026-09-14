/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/territorios.js - Manejo en Cascada: Departamento -> Provincia -> Municipio
   ============================================================================== */

import { getSupabase } from './supabase-client.js';

// Cache en memoria
let unidadesTerritoriales = null;

// Lista predeterminada para Bolivia (respaldo)
const DEFAULT_TERRITORIOS = [
  { departamento: 'SANTA CRUZ', provincia: 'ANDRÉS IBÁÑEZ', municipio: 'SANTA CRUZ DE LA SIERRA' },
  { departamento: 'SANTA CRUZ', provincia: 'ANDRÉS IBÁÑEZ', municipio: 'COTOCA' },
  { departamento: 'SANTA CRUZ', provincia: 'ANDRÉS IBÁÑEZ', municipio: 'LA GUARDIA' },
  { departamento: 'SANTA CRUZ', provincia: 'WARNES', municipio: 'WARNES' },
  { departamento: 'SANTA CRUZ', provincia: 'VELASCO', municipio: 'SAN IGNACIO DE VELASCO' },
  { departamento: 'SANTA CRUZ', provincia: 'CHIQUITOS', municipio: 'SAN JOSÉ DE CHIQUITOS' },
  { departamento: 'SANTA CRUZ', provincia: 'ÑUFLO DE CHÁVEZ', municipio: 'CONCEPCIÓN' },
  { departamento: 'SANTA CRUZ', provincia: 'ÑUFLO DE CHÁVEZ', municipio: 'SAN JULIÁN' },
  { departamento: 'SANTA CRUZ', provincia: 'GUARAYOS', municipio: 'ASCENSIÓN DE GUARAYOS' },
  { departamento: 'BENI', provincia: 'CERCADO', municipio: 'TRINIDAD' },
  { departamento: 'BENI', provincia: 'VACA DÍEZ', municipio: 'RIBERALTA' },
  { departamento: 'BENI', provincia: 'VACA DÍEZ', municipio: 'GUAYARAMERÍN' },
  { departamento: 'BENI', provincia: 'JOSÉ BALLIVIÁN', municipio: 'RURRENABAQUE' },
  { departamento: 'BENI', provincia: 'JOSÉ BALLIVIÁN', municipio: 'SAN BORJA' },
  { departamento: 'LA PAZ', provincia: 'MURILLO', municipio: 'LA PAZ' },
  { departamento: 'LA PAZ', provincia: 'MURILLO', municipio: 'EL ALTO' },
  { departamento: 'LA PAZ', provincia: 'ABEL ITURRALDE', municipio: 'IXIAMAS' },
  { departamento: 'LA PAZ', provincia: 'ABEL ITURRALDE', municipio: 'SAN BUENAVENTURA' },
  { departamento: 'LA PAZ', provincia: 'CARANAVI', municipio: 'CARANAVI' },
  { departamento: 'PANDO', provincia: 'NICOLÁS SUÁREZ', municipio: 'COBIJA' },
  { departamento: 'PANDO', provincia: 'MANURIPI', municipio: 'PUERTO RICO' },
  { departamento: 'TARIJA', provincia: 'CERCADO', municipio: 'TARIJA' },
  { departamento: 'TARIJA', provincia: 'GRAN CHACO', municipio: 'YACUIBA' },
  { departamento: 'CHUQUISACA', provincia: 'OROPEZA', municipio: 'SUCRE' },
  { departamento: 'COCHABAMBA', provincia: 'CERCADO', municipio: 'COCHABAMBA' },
  { departamento: 'ORURO', provincia: 'CERCADO', municipio: 'ORURO' },
  { departamento: 'POTOSÍ', provincia: 'TOMÁS FRÍAS', municipio: 'POTOSÍ' }
];

export async function loadTerritorios() {
  if (unidadesTerritoriales) return unidadesTerritoriales;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('unidades_territoriales')
        .select('departamento, provincia, municipio')
        .order('departamento')
        .order('provincia')
        .order('municipio');

      if (!error && data && data.length > 0) {
        unidadesTerritoriales = data;
        return unidadesTerritoriales;
      }
    } catch (e) {
      console.warn('Error cargando unidades territoriales de Supabase:', e);
    }
  }

  unidadesTerritoriales = DEFAULT_TERRITORIOS;
  return unidadesTerritoriales;
}

export async function setupCascadeTerritorios(deptSelect, provSelect, munSelect, initialValues = {}) {
  const data = await loadTerritorios();

  // 1. Departamentos únicos
  const deptos = [...new Set(data.map(d => d.departamento))].sort();
  deptSelect.innerHTML = '<option value="">-- Seleccionar Departamento --</option>';
  deptos.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    if (d === initialValues.departamento) opt.selected = true;
    deptSelect.appendChild(opt);
  });

  function updateProvincias(selectedDept, selectedProv = '') {
    provSelect.innerHTML = '<option value="">-- Seleccionar Provincia --</option>';
    munSelect.innerHTML = '<option value="">-- Seleccionar Municipio --</option>';

    if (!selectedDept) return;

    const provs = [...new Set(data.filter(d => d.departamento === selectedDept).map(d => d.provincia))].sort();
    provs.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      if (p === selectedProv) opt.selected = true;
      provSelect.appendChild(opt);
    });
  }

  function updateMunicipios(selectedDept, selectedProv, selectedMun = '') {
    munSelect.innerHTML = '<option value="">-- Seleccionar Municipio --</option>';
    if (!selectedDept || !selectedProv) return;

    const muns = data
      .filter(d => d.departamento === selectedDept && d.provincia === selectedProv)
      .map(d => d.municipio)
      .sort();

    muns.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === selectedMun) opt.selected = true;
      munSelect.appendChild(opt);
    });
  }

  // Event Listeners
  deptSelect.addEventListener('change', (e) => {
    updateProvincias(e.target.value);
  });

  provSelect.addEventListener('change', (e) => {
    updateMunicipios(deptSelect.value, e.target.value);
  });

  // Si vienen valores iniciales
  if (initialValues.departamento) {
    updateProvincias(initialValues.departamento, initialValues.provincia);
    if (initialValues.provincia) {
      updateMunicipios(initialValues.departamento, initialValues.provincia, initialValues.municipio);
    }
  }
}
