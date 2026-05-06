Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$DaemonDir = Join-Path $RepoRoot "daemon"
$LogDir = Join-Path $RepoRoot "logs"
$LogFile = Join-Path $LogDir "devtrack-daemon-autostart.log"

Require-Command "node"
Require-Command "npm"

New-Item -ItemType Directory -Force -Path $LogDir *> $null

Push-Location $DaemonDir
try {
  Start-Transcript -Path $LogFile -Append | Out-Null
  try {
    if (-not (Test-Path (Join-Path $DaemonDir "node_modules"))) {
      Write-Host "[daemon] node_modules missing; running npm install"
      npm install
    }
    Write-Host "[daemon] starting (npm start)"
    npm start
  } finally {
    Stop-Transcript | Out-Null
  }
} finally {
  Pop-Location
}

