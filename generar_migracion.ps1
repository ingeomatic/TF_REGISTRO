$csvPath = "C:\ROMULO 2026\8. SISTEMA INRA\8. TIERRAS FISCALES\datos consolidados22.csv"
$sqlPath = "C:\ROMULO 2026\8. SISTEMA INRA\8. TIERRAS FISCALES\sql\05_datos_iniciales_seed.sql"

$csv = Import-Csv -Path $csvPath -Delimiter ";" -Encoding UTF8

$output = @()
$output += "-- =============================================================================="
$output += "-- MIGRACIÓN AUTOMÁTICA DE DATOS CONSOLIDADOS A TIERRAS FISCALES"
$output += "-- =============================================================================="
$output += ""

function Escape-Sql($val) {
    if ($null -eq $val -or $val.Trim() -eq "") {
        return "NULL"
    }
    $cleaned = $val.Trim().Replace("'", "''")
    return "'$cleaned'"
}

function Escape-Num($val) {
    if ($null -eq $val -or $val.Trim() -eq "") {
        return "NULL"
    }
    $n = $val.Trim().Replace(",", ".")
    if ($n -match "^[0-9]+(\.[0-9]+)?$") {
        return $n
    }
    return "NULL"
}

function Escape-Date($val) {
    if ($null -eq $val -or $val.Trim() -eq "") {
        return "NULL"
    }
    $parts = $val.Trim().Split("/")
    if ($parts.Length -eq 3) {
        $d = $parts[0].PadLeft(2, '0')
        $m = $parts[1].PadLeft(2, '0')
        $y = $parts[2]
        if ($y.Length -eq 2) { $y = "20" + $y }
        return "'$y-$m-$d'"
    }
    return "NULL"
}

foreach ($row in $csv) {
    $codpred = Escape-Sql $row.CODPRED
    if ($codpred -eq "NULL") { continue }

    $nombre_tf = Escape-Sql "TIERRA FISCAL"
    $nombre_predio = Escape-Sql $row.NOMBRE_PREDIO
    $nombre_tf_aux = Escape-Sql $row.NOMBRE_TF_AUXILIAR
    $nombre_pred_aux = Escape-Sql $row.NOMBRE_PREDIO_AUXILIAR
    $res_tf = Escape-Sql $row.RESOLUCION_TF
    $fecha_res = Escape-Date $row.FECHA_RES_TF
    $tipo_res = Escape-Sql $row.TIPO_DE_RES
    $sup_predio = Escape-Num $row.SUPERFICIE_PREDIO
    $sup_nodisp = Escape-Num $row.SUP_NODISP
    if ($sup_nodisp -eq "NULL") { $sup_nodisp = "0" }
    $sup_disp = Escape-Num $row.SUP_DISP
    $tipo_tf = Escape-Sql $row.TIPO_TF
    $clasif = Escape-Sql $row.CLASIFICACION
    $calif = Escape-Sql $row.CALIFICACION
    $depto = Escape-Sql $row.DEPARTAMENTO
    $prov = Escape-Sql $row.PROVINCIA
    $mun = Escape-Sql $row.MUNICIPIO
    $modalidad = Escape-Sql $row.MODALIDAD
    $folio = Escape-Sql $row."NRO FOLIO REAL"
    $clase_res = Escape-Sql $row.CLASE_RES
    $det_rectifi = Escape-Sql $row.DETALLE_RECTIFI
    $nota_rem = Escape-Sql $row."NOTA REMISION_UADM"
    $fecha_rem = Escape-Date $row.FECHA_REM
    $hr_rem = Escape-Sql $row.HR_REMISION
    $fecha_hr = Escape-Date $row.FECHA_HR
    $gestion = Escape-Num $row.GESTION_REPORTE
    $obs_rep = Escape-Sql $row.OBS_REPORTE
    $nota_cc = Escape-Sql $row.NOTA_CATASTRO_CC
    $certif_tan = Escape-Sql $row.CERTIF_TAN
    $fecha_revi = Escape-Date $row.FECHA_REVI
    $reg_ddrr = Escape-Sql $row."REGISTRO DDRR"
    $nota_ext_ddrr = Escape-Sql $row."NOTA EXTERNA ENVIO DDRR"
    $hr_ddrr = Escape-Sql $row."HR DDRR"
    $nota_san_cat = Escape-Sql $row."NOTA REMITIDA VIA SANEAMIENTO CATASTRO"
    $obs_procont = Escape-Sql $row.OBS_PROCONT
    $obs_comp = Escape-Sql $row.OBS_COMPENSACION
    $obs_1 = Escape-Sql $row."OBSERVACION 1"
    $cod_inv = Escape-Sql $row.COD_INV
    $expediente = Escape-Sql $row.EXPEDIENTE
    $num_arch = Escape-Sql $row.NUMERO_ARCHIVADOR
    $cuerpos = Escape-Num $row.CUERPOS
    $gavetero = Escape-Sql $row.GAVETERO
    $caja = Escape-Sql $row.CAJA
    $obs_inv = Escape-Sql $row.OBS_INVENTARIO
    $resp = Escape-Sql $row.RESPONSABLE
    $dir = Escape-Sql $row.DIRECTOR
    $rep_tf = Escape-Sql $row."REPORTE TF"
    $pro_cont = if ($row.PROCESO_CONTENCIOSO -eq "SI") { "TRUE" } else { "FALSE" }
    $estado = Escape-Sql $row.ESTADO
    $estado_global = Escape-Sql $row."ESTADO GLOBAL"

    $stmt = "INSERT INTO public.tierras_fiscales (codpred, nombre_tf, nombre_predio, nombre_tf_auxiliar, nombre_predio_auxiliar, resolucion_tf, fecha_res_tf, tipo_de_res, superficie_predio, sup_disp, sup_nodisp, tipo_tf, clasificacion, calificacion, departamento, provincia, municipio, modalidad, nro_folio_real, clase_res, detalle_rectifi, nota_remision_uadm, fecha_rem, hr_remision, fecha_hr, gestion_reporte, obs_reporte, nota_catastro_cc, certif_tan, fecha_revi, registro_ddrr, nota_externa_envio_ddrr, hr_ddrr, nota_remitida_via_saneamiento_catastro, obs_procont, obs_compensacion, observacion_1, cod_inv, expediente, numero_archivador, cuerpos, gavetero, caja, obs_inventario, responsable, director, reporte_tf, proceso_contencioso, estado, estado_global) VALUES ($codpred, $nombre_tf, $nombre_predio, $nombre_tf_aux, $nombre_pred_aux, $res_tf, $fecha_res, $tipo_res, $sup_predio, $sup_disp, $sup_nodisp, $tipo_tf, $clasif, $calif, $depto, $prov, $mun, $modalidad, $folio, $clase_res, $det_rectifi, $nota_rem, $fecha_rem, $hr_rem, $fecha_hr, $gestion, $obs_rep, $nota_cc, $certif_tan, $fecha_revi, $reg_ddrr, $nota_ext_ddrr, $hr_ddrr, $nota_san_cat, $obs_procont, $obs_comp, $obs_1, $cod_inv, $expediente, $num_arch, $cuerpos, $gavetero, $caja, $obs_inv, $resp, $dir, $rep_tf, $pro_cont, $estado, $estado_global) ON CONFLICT (codpred) DO NOTHING;"
    
    $output += $stmt
}

$output | Set-Content -Path $sqlPath -Encoding UTF8
Write-Host "Migracion generada con exito en $sqlPath con $($csv.Count) registros."
