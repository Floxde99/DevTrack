Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$TaskName = "DevTrack Daemon",
  [switch]$Force
)

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RunnerScript = Join-Path $RepoRoot "scripts\autostart\run-daemon.ps1"

if (-not (Test-Path $RunnerScript)) {
  throw "Missing runner script: $RunnerScript"
}

$psExe = (Get-Command "powershell.exe").Source
$taskArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-WindowStyle", "Hidden",
  "-File", "`"$RunnerScript`""
) -join " "

if (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue) {
  if ($Force) {
    try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
  }

  $action = New-ScheduledTaskAction -Execute $psExe -Argument $taskArgs -WorkingDirectory $RepoRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType InteractiveToken -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force:$Force | Out-Null
  Write-Host "[ok] Registered scheduled task '$TaskName' (AtLogOn) to run DevTrack daemon."
  Write-Host "     Logs: $RepoRoot\logs\devtrack-daemon-autostart.log"
  exit 0
}

# Fallback for minimal environments: schtasks.exe
Require-Command "schtasks.exe"

if ($Force) {
  schtasks.exe /Delete /TN $TaskName /F *> $null
}

$tr = "`"$psExe`" $taskArgs"
schtasks.exe /Create /TN $TaskName /SC ONLOGON /RL LIMITED /TR $tr /F | Out-Null

Write-Host "[ok] Registered scheduled task '$TaskName' via schtasks.exe."
Write-Host "     Logs: $RepoRoot\logs\devtrack-daemon-autostart.log"

