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

# S4U ("Service for User"): corre AUNQUE nadie esté logueado, SIN guardar contraseña.
# Usa la cuenta que ejecuta este script (debe ser Administrator), con su perfil cargado,
# así encuentra el navegador ya descargado en su AppData.
$whoami = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name  # p.ej. VPS\Administrator
$principal = New-ScheduledTaskPrincipal -UserId $whoami -LogonType S4U -RunLevel Highest

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
