@echo off
title Sistema INRA Tierras Fiscales
echo ===================================================
echo   INICIANDO SERVIDOR LOCAL - SISTEMA INRA
echo ===================================================
echo.
echo Abriendo el navegador en http://localhost:8080 ...
echo Para detener el servidor, cierra esta ventana.
echo.

start http://localhost:8080

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python -m http.server 8080
    goto end
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    py -m http.server 8080
    goto end
)

where npx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    npx serve -l 8080
    goto end
)

echo No se detecto Python ni Node instalado de forma directa.
echo Iniciando con PowerShell...
powershell -ExecutionPolicy Bypass -Command "& { $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'Servidor activo en http://localhost:8080/'; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $localPath = $request.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($localPath)) { $localPath = 'index.html' }; $filePath = Join-Path (Get-Location) $localPath; if (Test-Path $filePath -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($filePath); $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); switch ($ext) { '.html' { $response.ContentType = 'text/html; charset=utf-8' } '.css' { $response.ContentType = 'text/css' } '.js' { $response.ContentType = 'application/javascript' } '.json' { $response.ContentType = 'application/json' } '.csv' { $response.ContentType = 'text/csv' } default { $response.ContentType = 'application/octet-stream' } }; $response.ContentLength64 = $bytes.Length; $response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $response.StatusCode = 404 }; $response.OutputStream.Close() } }"

:end
pause
