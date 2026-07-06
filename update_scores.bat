@echo off
:: Obtener fecha actual en formato YYYY-MM-DD usando PowerShell
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"`) do set TODAY=%%i

echo [%date% %time%] Iniciando actualizacion de marcadores para la fecha: %TODAY%

:: Detectar directorio de destino local o VPS
set WEB_DIR=.
if exist "C:\xampp\htdocs\calcparley" (
    set WEB_DIR=C:\xampp\htdocs\calcparley
) else if exist "C:\xampp\php\www\CalculadoraParley Web" (
    set WEB_DIR=C:\xampp\php\www\CalculadoraParley Web
)

echo Directorio de destino detectado: %WEB_DIR%

:: Cambiar al directorio con entorno de Playwright y ejecutar crawler
cd /d C:\xampp\php\www\BSportsBook
node crawl_sofascore.js %TODAY% "%WEB_DIR%\sofascore_basketball_%TODAY%.json"

echo [%date% %time%] Actualizacion completada.
