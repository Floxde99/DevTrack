function safeUnknownWindow() {
  return { app_name: 'unknown.exe', window_title: '', pid: null, exe_path: '' };
}

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptPath = path.resolve(__dirname, '..', 'scripts', 'window-info.ps1');

let lastProbe = null;
let lastProbeAtMs = 0;
const PROBE_CACHE_MS = 250;

function tryRunPowerShell(exeName) {
  const res = spawnSync(
    exeName,
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2_000,
      maxBuffer: 1024 * 1024,
    },
  );

  if (res.error) return null;
  if (typeof res.status !== 'number' || res.status !== 0) return null;
  if (!res.stdout) return null;

  try {
    const parsed = JSON.parse(res.stdout);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function probeWindowInfo() {
  if (process.platform !== 'win32') {
    return { app_name: 'unknown.exe', window_title: '', pid: null, exe_path: '', idle_seconds: 0 };
  }

  const now = Date.now();
  if (lastProbe && now - lastProbeAtMs <= PROBE_CACHE_MS) return lastProbe;

  const parsed = tryRunPowerShell('powershell.exe') ?? tryRunPowerShell('pwsh.exe');
  const normalized = {
    app_name: typeof parsed?.app_name === 'string' && parsed.app_name.length > 0 ? parsed.app_name : 'unknown.exe',
    window_title: typeof parsed?.window_title === 'string' ? parsed.window_title : '',
    pid: typeof parsed?.pid === 'number' && Number.isFinite(parsed.pid) && parsed.pid > 0 ? parsed.pid : null,
    exe_path: typeof parsed?.exe_path === 'string' ? parsed.exe_path : '',
    idle_seconds: typeof parsed?.idle_seconds === 'number' && Number.isFinite(parsed.idle_seconds) ? parsed.idle_seconds : 0,
  };

  lastProbe = normalized;
  lastProbeAtMs = now;
  return normalized;
}

function getActiveWindow() {
  const info = probeWindowInfo();
  return {
    app_name: info.app_name || 'unknown.exe',
    window_title: info.window_title || '',
    pid: info.pid ?? null,
    exe_path: info.exe_path || '',
  };
}

function getIdleSeconds() {
  const info = probeWindowInfo();
  return Math.max(0, info.idle_seconds || 0);
}

module.exports = { getActiveWindow, getIdleSeconds };

