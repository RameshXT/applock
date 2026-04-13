use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, IsWindowVisible, ShowWindow, SW_MINIMIZE,
    SetWindowPos, HWND_TOPMOST, SWP_NOSIZE, SWP_NOACTIVATE,
};
use windows::Win32::System::Threading::{
    OpenProcess, PROCESS_SUSPEND_RESUME,
};
use ntapi::ntpsapi::NtSuspendProcess;

#[derive(Debug, thiserror::Error)]
pub enum WindowManagerError {
    #[error("Failed to find window for process {0}")]
    WindowNotFound(u32),
    #[error("Win32 Error: {0}")]
    Win32Error(String),
    #[error("Suspending process failed: {0}")]
    SuspendFailure(String),
}

/// Enumerate all windows belonging to a specific process ID.
pub fn get_process_windows(pid: u32) -> Result<Vec<HWND>, WindowManagerError> {
    let mut windows: Vec<HWND> = Vec::new();
    
    unsafe {
        let _ = EnumWindows(Some(enum_window_proc), LPARAM(&mut windows as *mut Vec<HWND> as isize));
    }

    // Filter windows by PID
    let mut process_windows = Vec::new();
    for hwnd in windows {
        let mut window_pid = 0;
        unsafe { GetWindowThreadProcessId(hwnd, Some(&mut window_pid)); }
        if window_pid == pid {
            process_windows.push(hwnd);
        }
    }

    Ok(process_windows)
}

extern "system" fn enum_window_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let windows = unsafe { &mut *(lparam.0 as *mut Vec<HWND>) };
    if unsafe { IsWindowVisible(hwnd).as_bool() } {
        windows.push(hwnd);
    }
    BOOL::from(true)
}

/// Freeze a process and its windows.
pub unsafe fn freeze_process_windows(pid: u32) -> Result<(), WindowManagerError> {
    let hwnds = get_process_windows(pid)?;
    
    for hwnd in hwnds {
        // Minimize the window
        let _ = ShowWindow(hwnd, SW_MINIMIZE);
        
        // Move off-screen (-9999, -9999)
        SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            -9999,
            -9999,
            0,
            0,
            SWP_NOSIZE | SWP_NOACTIVATE,
        ).map_err(|e| WindowManagerError::Win32Error(e.to_string()))?;
    }

    // Suspend the process using NtSuspendProcess
    suspend_process(pid)?;

    Ok(())
}

/// Suspend all threads of a process.
pub unsafe fn suspend_process(pid: u32) -> Result<(), WindowManagerError> {
    let handle = OpenProcess(PROCESS_SUSPEND_RESUME, false, pid)
        .map_err(|e| WindowManagerError::Win32Error(e.to_string()))?;
    
    if handle.is_invalid() {
        return Err(WindowManagerError::Win32Error("Invalid process handle".to_string()));
    }

    let status = NtSuspendProcess(handle.0 as _);
    if status != 0 {
        return Err(WindowManagerError::SuspendFailure(format!("NTSTATUS: 0x{:X}", status)));
    }

    Ok(())
}

/// Resume all threads of a process.
pub unsafe fn resume_process(pid: u32) -> Result<(), WindowManagerError> {
    use ntapi::ntpsapi::NtResumeProcess;
    
    let handle = OpenProcess(PROCESS_SUSPEND_RESUME, false, pid)
        .map_err(|e| WindowManagerError::Win32Error(e.to_string()))?;
    
    if handle.is_invalid() {
        return Err(WindowManagerError::Win32Error("Invalid process handle".to_string()));
    }

    let status = NtResumeProcess(handle.0 as _);
    if status != 0 {
        return Err(WindowManagerError::SuspendFailure(format!("NTSTATUS: 0x{:X}", status)));
    }

    Ok(())
}

/// Restore windows to their original state (simplified here, just show)
pub unsafe fn restore_windows(hwnds: &[HWND]) -> Result<(), WindowManagerError> {
    for &hwnd in hwnds {
        let _ = ShowWindow(hwnd, windows::Win32::UI::WindowsAndMessaging::SW_RESTORE);
        // Move back to center or just let it be? 
        // Typically apps remember their position if we don't force it.
        // But we moved it to -9999. We should probably move it back if we tracked original pos.
        // For now, let's just make it visible.
    }
    Ok(())
}
