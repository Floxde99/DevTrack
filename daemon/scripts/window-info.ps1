$ErrorActionPreference = 'Stop'

$sig = @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class DevTrackNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
  }

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
}
"@

Add-Type -TypeDefinition $sig -Language CSharp

function Get-IdleSeconds {
  $lii = New-Object DevTrackNative+LASTINPUTINFO
  $lii.cbSize = [uint32][System.Runtime.InteropServices.Marshal]::SizeOf([type]'DevTrackNative+LASTINPUTINFO')
  $ok = [DevTrackNative]::GetLastInputInfo([ref]$lii)
  if (-not $ok) { return 0.0 }

  $now = [uint32][Environment]::TickCount
  $last = [uint32]$lii.dwTime
  $diffMs = [uint32]($now - $last)
  return [double]$diffMs / 1000.0
}

function Get-ForegroundWindowInfo {
  $hwnd = [DevTrackNative]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) {
    return @{
      app_name = 'unknown.exe'
      window_title = ''
      pid = $null
      exe_path = ''
      process_name = ''
      idle_seconds = (Get-IdleSeconds)
    }
  }

  $procId = 0
  [void][DevTrackNative]::GetWindowThreadProcessId($hwnd, [ref]$procId)

  $sb = New-Object System.Text.StringBuilder 4096
  [void][DevTrackNative]::GetWindowTextW($hwnd, $sb, $sb.Capacity)
  $title = $sb.ToString()

  $app = 'unknown.exe'
  $exePath = ''
  $procName = ''
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    if ($p.Path) {
      $app = [System.IO.Path]::GetFileName($p.Path)
      $exePath = [string]$p.Path
    } elseif ($p.ProcessName) {
      $app = "$($p.ProcessName).exe"
      $procName = [string]$p.ProcessName
    }
    if (-not $procName -and $p.ProcessName) {
      $procName = [string]$p.ProcessName
    }
  } catch {
    $app = 'unknown.exe'
  }

  return @{
    app_name = $app
    window_title = $title
    pid = [int]$procId
    exe_path = $exePath
    process_name = $procName
    idle_seconds = (Get-IdleSeconds)
  }
}

Get-ForegroundWindowInfo | ConvertTo-Json -Compress

