Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DaemonDir = Join-Path $RepoRoot "daemon"

Require-Command "docker"
Require-Command "node"
Require-Command "npm"

Write-Step "Starting API + Frontend (docker compose up --build)"
Push-Location $RepoRoot
try {
  docker compose up --build
} finally {
  Pop-Location
}

Write-Step "Tip: in another terminal, run the daemon:"
Write-Host ("    cd ""{0}""" -f $DaemonDir)
Write-Host "    npm install"
Write-Host "    npm start"

