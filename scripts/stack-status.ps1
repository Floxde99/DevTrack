Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Require-Command "docker"

Push-Location $RepoRoot
try {
  docker compose ps
  Write-Host ""
  Write-Host "Recent logs (frontend, api):"
  docker compose logs --tail 50 frontend api
} finally {
  Pop-Location
}

