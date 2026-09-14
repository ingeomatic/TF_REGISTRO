/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/supabase-client.js - Inicializador y Configuración de Supabase
   ============================================================================== */

// Valores por defecto o precargados
const DEFAULT_SUPABASE_URL = localStorage.getItem('INRA_SUPABASE_URL') || 'https://jlfgavqblkagezqcbfnu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = localStorage.getItem('INRA_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZmdhdnFibGthZ2V6cWNiZm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTg2MDksImV4cCI6MjEwNDg5NDYwOX0.C9EOT4AFTA0-jKYdcm2Uq1-blmuY-6VthdVjynG2SMM';

let supabaseClient = null;

function initSupabase() {
  const url = localStorage.getItem('INRA_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('INRA_SUPABASE_KEY') || DEFAULT_SUPABASE_ANON_KEY;

  if (window.supabase && url && key) {
    try {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      console.log('Cliente Supabase inicializado correctamente.');
    } catch (err) {
      console.error('Error al inicializar Supabase:', err);
    }
  }
  return supabaseClient;
}

export function getSupabase() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

export function setSupabaseConfig(url, key) {
  localStorage.setItem('INRA_SUPABASE_URL', url.trim());
  localStorage.setItem('INRA_SUPABASE_KEY', key.trim());
  return initSupabase();
}

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem('INRA_SUPABASE_URL') || '',
    key: localStorage.getItem('INRA_SUPABASE_KEY') || ''
  };
}
