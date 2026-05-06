const ffi = require('ffi-napi');
const ref = require('ref-napi');
const path = require('node:path');

const DWORD = ref.types.uint32;
const BOOL = ref.types.bool;
const VOID_PTR = ref.refType(ref.types.void);

const HWND = VOID_PTR;
const HANDLE = VOID_PTR;

const user32 = ffi.Library('user32', {
  GetForegroundWindow: [HWND, []],
  GetWindowTextLengthW: ['int', [HWND]],
  GetWindowTextW: ['int', [HWND, 'pointer', 'int']],
  GetWindowThreadProcessId: ['uint32', [HWND, ref.refType(DWORD)]],
  GetLastInputInfo: [BOOL, ['pointer']],
});

const kernel32 = ffi.Library('kernel32', {
  OpenProcess: [HANDLE, [DWORD, BOOL, DWORD]],
  QueryFullProcessImageNameW: [BOOL, [HANDLE, DWORD, 'pointer', ref.refType(DWORD)]],
  CloseHandle: [BOOL, [HANDLE]],
  GetTickCount: [DWORD, []],
});

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const MAX_WCHARS = 2048;
const LASTINPUTINFO_SIZE = 8; // UINT cbSize; DWORD dwTime;

function wideStringFromBuffer(buf, wcharLen) {
  if (!wcharLen) return '';
  return buf.subarray(0, wcharLen * 2).toString('ucs2').replace(/\0+$/g, '');
}

function getWindowTitle(hwnd) {
  const len = user32.GetWindowTextLengthW(hwnd);
  if (!len) return '';

  const buf = Buffer.alloc((len + 1) * 2);
  const copied = user32.GetWindowTextW(hwnd, buf, len + 1);
  return wideStringFromBuffer(buf, copied);
}

function getProcessNameForHwnd(hwnd) {
  const pidBuf = ref.alloc(DWORD);
  user32.GetWindowThreadProcessId(hwnd, pidBuf);
  const pid = pidBuf.deref();
  if (!pid) return 'unknown.exe';

  const hProcess = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
  if (!hProcess || ref.isNull(hProcess)) return 'unknown.exe';

  try {
    const nameBuf = Buffer.alloc(MAX_WCHARS * 2);
    const sizeBuf = ref.alloc(DWORD, MAX_WCHARS);

    const ok = kernel32.QueryFullProcessImageNameW(hProcess, 0, nameBuf, sizeBuf);
    if (!ok) return 'unknown.exe';

    const full = wideStringFromBuffer(nameBuf, sizeBuf.deref());
    const base = path.win32.basename(full);
    return base || 'unknown.exe';
  } finally {
    try {
      kernel32.CloseHandle(hProcess);
    } catch {
      // ignore
    }
  }
}

function getTickCount32() {
  // Unsigned 32-bit tick count (wraps ~49.7 days).
  return kernel32.GetTickCount() >>> 0;
}

function idleSecondsFromLastInputTick(lastInputTick) {
  const now = getTickCount32();
  const diffMs = (now - (lastInputTick >>> 0)) >>> 0;
  return diffMs / 1000;
}

function getLastInputTick() {
  const buf = Buffer.alloc(LASTINPUTINFO_SIZE);
  buf.writeUInt32LE(LASTINPUTINFO_SIZE, 0);
  const ok = user32.GetLastInputInfo(buf);
  if (!ok) return null;
  return buf.readUInt32LE(4) >>> 0;
}

function safeUnknownWindow() {
  return { app_name: 'unknown.exe', window_title: '' };
}

function getActiveWindow() {
  if (process.platform !== 'win32') return safeUnknownWindow();

  try {
    const hwnd = user32.GetForegroundWindow();
    if (!hwnd || ref.isNull(hwnd)) return safeUnknownWindow();

    return {
      app_name: getProcessNameForHwnd(hwnd),
      window_title: getWindowTitle(hwnd),
    };
  } catch {
    return safeUnknownWindow();
  }
}

function getIdleSeconds() {
  if (process.platform !== 'win32') return 0;

  try {
    const lastInputTick = getLastInputTick();
    if (lastInputTick === null) return 0;
    return Math.max(0, idleSecondsFromLastInputTick(lastInputTick));
  } catch {
    return 0;
  }
}

module.exports = { getActiveWindow, getIdleSeconds };

