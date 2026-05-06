Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$TaskName = "DevTrack Daemon"
)

if (Get-Command Unregister-ScheduledTask -ErrorAction SilentlyContinue) {
  try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "[ok] Unregistered scheduled task '$TaskName'."
  } catch {
    Write-Host "[warn] Could not unregister '$TaskName' (it may not exist)."
  }
  exit 0
}

if (Get-Command schtasks.exe -ErrorAction SilentlyContinue) {
  schtasks.exe /Delete /TN $TaskName /F | Out-Null
  Write-Host "[ok] Unregistered scheduled task '$TaskName' via schtasks.exe."
  exit 0
}

throw "Neither ScheduledTasks cmdlets nor schtasks.exe are available on this system."

