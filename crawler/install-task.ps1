# install-task.ps1
# Registra la tarea del crawler 24/7 en el VPS (Windows Server), sin depender de XML.
#
# Uso (en el VPS, PowerShell COMO ADMINISTRADOR):
#   cd C:\xampp\htdocs\calcparley\crawler
#   powershell -ExecutionPolicy Bypass -File .\install-task.ps1
#
# Crea "CalcParleyCrawler": arranca al encender el VPS, corre aunque nadie esté
# logueado, se reinicia solo si se cae, y sin límite de tiempo. Tu PC queda fuera.

$ErrorActionPreference = 'Stop'
$taskName = 'CalcParleyCrawler'

# Debe correr en una consola ELEVADA (Ejecutar como administrador)
$me = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $me.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Abre PowerShell COMO ADMINISTRADOR (clic derecho -> Ejecutar como administrador) y vuelve a correr esto."
}

# Rutas derivadas de la ubicación de este script (independiente de dónde esté el proyecto)
$scriptDir = $PSScriptRoot
$runner    = Join-Path $scriptDir 'runner.js'

# Ruta real de node.exe
$node = (Get-Command node -ErrorAction Stop).Source

Write-Host "node    : $node"
Write-Host "runner  : $runner"
Write-Host "carpeta : $scriptDir"
Write-Host ""

if (-not (Test-Path $runner)) { throw "No se encontró runner.js en $scriptDir" }

$action  = New-ScheduledTaskAction -Execute $node -Argument "`"$runner`"" -WorkingDirectory $scriptDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -RestartCount 999

# Corre como SYSTEM: siempre activo, sin contraseña y sin la sesión de nadie.
# SYSTEM no ve el navegador descargado en el perfil de Administrator, así que apuntamos
# PLAYWRIGHT_BROWSERS_PATH (a nivel de máquina) a esa cache ya existente.
$browsersPath = Join-Path $env:LOCALAPPDATA 'ms-playwright'
if (-not (Test-Path $browsersPath)) {
    Write-Warning "No se encontro la cache de navegadores en $browsersPath. Si la tarea no actualiza, corre: npx playwright install chromium"
}
[Environment]::SetEnvironmentVariable('PLAYWRIGHT_BROWSERS_PATH', $browsersPath, 'Machine')
# runner.js lee este archivo y se lo pasa al crawler (método garantizado, no depende
# de que el servicio de tareas recoja la variable de máquina al instante).
Set-Content -Path (Join-Path $scriptDir 'browsers-path.txt') -Value $browsersPath -Encoding ASCII
Write-Host "PLAYWRIGHT_BROWSERS_PATH = $browsersPath"

$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName `
    -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal `
    -Description 'Actualiza marcadores de basketball (Sofascore) cada 2 min. 24/7 en el VPS.' `
    -Force | Out-Null

Write-Host "Tarea '$taskName' creada. Arrancandola ahora..."
Start-ScheduledTask -TaskName $taskName

Start-Sleep -Seconds 2
$info = Get-ScheduledTask -TaskName $taskName
Write-Host ("Estado: " + $info.State)
Write-Host ""
Write-Host "Listo. En ~2 min revisa que el JSON se actualice solo:"
Write-Host '  Get-ChildItem "C:\xampp\htdocs\calcparley\sofascore_basketball_*.json" | Select-Object Name, LastWriteTime'
