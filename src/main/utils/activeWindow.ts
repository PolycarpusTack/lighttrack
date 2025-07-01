import { exec } from 'child_process';
import { promisify } from 'util';
import { serviceLogger } from './logger';

const execAsync = promisify(exec);

export interface ActiveWindowInfo {
  app: string;
  title: string;
  pid?: number;
  path?: string;
}

/**
 * Get the currently active window information
 * Uses platform-specific commands to retrieve window data
 */
export async function getActiveWindow(): Promise<ActiveWindowInfo | null> {
  try {
    switch (process.platform) {
      case 'darwin':
        return await getActiveWindowMac();
      case 'win32':
        return await getActiveWindowWindows();
      case 'linux':
        return await getActiveWindowLinux();
      default:
        serviceLogger.warn(`Unsupported platform for window tracking: ${process.platform}`);
        return null;
    }
  } catch (error) {
    serviceLogger.error('Failed to get active window:', error);
    return null;
  }
}

/**
 * Get active window on macOS using AppleScript
 */
async function getActiveWindowMac(): Promise<ActiveWindowInfo | null> {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set windowTitle to ""
        try
          tell process frontApp
            if exists (window 1) then
              set windowTitle to name of window 1
            end if
          end tell
        end try
      end tell
      return frontApp & "|" & windowTitle
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const [app, title] = stdout.trim().split('|');

    // Get additional info using different approach
    const pidScript = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        return unix id of frontApp
      end tell
    `;

    const { stdout: pidOutput } = await execAsync(`osascript -e '${pidScript}'`);
    const pid = parseInt(pidOutput.trim(), 10);

    return {
      app: app || 'Unknown',
      title: title || '',
      pid: isNaN(pid) ? undefined : pid,
    };
  } catch (error) {
    serviceLogger.error('Failed to get active window on macOS:', error);
    return null;
  }
}

/**
 * Get active window on Windows using PowerShell
 */
async function getActiveWindowWindows(): Promise<ActiveWindowInfo | null> {
  try {
    const script = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          
          [DllImport("user32.dll")]
          public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
      "@
      
      $hwnd = [Win32]::GetForegroundWindow()
      $title = New-Object System.Text.StringBuilder 256
      [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
      
      $processId = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
      
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      $appName = if ($process) { $process.ProcessName } else { "Unknown" }
      $appPath = if ($process) { $process.Path } else { "" }
      
      @{
        App = $appName
        Title = $title.ToString()
        Pid = $processId
        Path = $appPath
      } | ConvertTo-Json -Compress
    `;

    const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`, {
      shell: 'powershell.exe',
    });

    const result = JSON.parse(stdout.trim());
    
    return {
      app: result.App || 'Unknown',
      title: result.Title || '',
      pid: result.Pid,
      path: result.Path || undefined,
    };
  } catch (error) {
    serviceLogger.error('Failed to get active window on Windows:', error);
    return null;
  }
}

/**
 * Get active window on Linux using xdotool
 */
async function getActiveWindowLinux(): Promise<ActiveWindowInfo | null> {
  try {
    // Check if xdotool is installed
    try {
      await execAsync('which xdotool');
    } catch {
      serviceLogger.warn('xdotool not found. Please install xdotool for window tracking on Linux.');
      return null;
    }

    // Get active window ID
    const { stdout: windowId } = await execAsync('xdotool getactivewindow');
    const winId = windowId.trim();

    // Get window title
    const { stdout: windowTitle } = await execAsync(`xdotool getwindowname ${winId}`);
    const title = windowTitle.trim();

    // Get PID
    const { stdout: pidOutput } = await execAsync(`xdotool getwindowpid ${winId}`);
    const pid = parseInt(pidOutput.trim(), 10);

    // Get process info
    let app = 'Unknown';
    if (!isNaN(pid)) {
      try {
        const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o comm=`);
        app = processInfo.trim();
      } catch {
        // Process might have ended
      }
    }

    return {
      app,
      title,
      pid: isNaN(pid) ? undefined : pid,
    };
  } catch (error) {
    serviceLogger.error('Failed to get active window on Linux:', error);
    return null;
  }
}

/**
 * Start monitoring active window changes
 * Returns a function to stop monitoring
 */
export function monitorActiveWindow(
  callback: (windowInfo: ActiveWindowInfo | null) => void,
  intervalMs: number = 1000
): () => void {
  const interval = setInterval(async () => {
    const windowInfo = await getActiveWindow();
    callback(windowInfo);
  }, intervalMs);

  return () => clearInterval(interval);
}