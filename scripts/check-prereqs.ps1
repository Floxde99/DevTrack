Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Write-OK($msg) { Write-Host "[ok]  $msg" }
function Write-Warn($msg) { Write-Host "[warn] $msg" }

Require-Command "docker"
Require-Command "node"
Require-Command "npm"

$nodeVersion = (& node -p "process.version").Trim()
$nodeMajor = [int]($nodeVersion.TrimStart("v").Split(".")[0])
Write-OK ("node {0}" -f $nodeVersion)

if ($nodeMajor -lt 18) {
  throw "Node.js >= 18 is required for the daemon."
}

try {
  docker info *> $null
  Write-OK "docker is running"
} catch {
  Write-Warn "docker command found but Docker Desktop doesn't seem running (docker info failed)"
  exit 1
}

Write-OK "prereqs look good"

