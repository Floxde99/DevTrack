Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [switch]$Build,
  [int]$WaitTimeoutSeconds = 90
)

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Require-Command "docker"

Push-Location $RepoRoot
try {
  $args = @("compose", "up", "-d")
  if ($Build) { $args += "--build" }

  # docker compose --wait waits for services to be running|healthy
  $args += @("--wait", "--wait-timeout", "$WaitTimeoutSeconds")

  docker @args
  docker compose ps
} finally {
  Pop-Location
}

