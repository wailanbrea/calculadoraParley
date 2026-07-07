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

:: Cambiar al directorio con entorno de Playwright y ejecutar crawlers
cd /d C:\xampp\php\www\BSportsBook

echo Ejecutando crawler Sofascore para Baloncesto...
node crawl_sofascore.js %TODAY% basketball "%WEB_DIR%\sofascore_basketball_%TODAY%.json"

echo Ejecutando crawler Flashscore para Baloncesto...
node crawl_flashscore.js %TODAY% basketball "%WEB_DIR%\flashscore_basketball_%TODAY%.json"

echo Ejecutando crawler Sofascore para Soccer...
node crawl_sofascore.js %TODAY% football "%WEB_DIR%\sofascore_soccer_%TODAY%.json"

echo Ejecutando crawler Flashscore para Soccer...
node crawl_flashscore.js %TODAY% football "%WEB_DIR%\flashscore_soccer_%TODAY%.json"

echo [%date% %time%] Actualizacion completada.
