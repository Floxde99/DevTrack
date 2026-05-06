param(
  [switch]$RemoveVolumes
)

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
  $args = @("compose", "down")
  if ($RemoveVolumes) { $args += @("--volumes") }
  docker @args
} finally {
  Pop-Location
}

