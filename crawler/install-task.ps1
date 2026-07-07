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

# Credenciales para "run whether logged on or not" (usa el navegador ya descargado
# en el perfil de Administrator).
$cred = Get-Credential -UserName 'Administrator' -Message 'Contraseña de Administrator (para que la tarea corra sin sesión iniciada)'

Register-ScheduledTask -TaskName $taskName `
    -Action $action -Trigger $trigger -Settings $settings `
    -RunLevel Highest `
    -User $cred.UserName -Password $cred.GetNetworkCredential().Password `
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
