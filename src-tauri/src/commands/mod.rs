use std::sync::Arc;
use tauri::{AppHandle, Manager, State, Emitter};
use crate::models::{AppState, AppConfig, AuthMode, LockedApp};
use crate::services::{scanner, security};
use crate::utils::config::save_config;

#[cfg(target_os = "windows")]
use winreg::{RegKey, enums::*};

#[tauri::command]
pub async fn get_is_unlocked(state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    let unlocked = state.is_unlocked.lock().unwrap();
    Ok(*unlocked)
}

#[tauri::command]
pub async fn get_blocked_app(state: State<'_, Arc<AppState>>) -> Result<Option<LockedApp>, String> {
    let app = state.active_blocked_app.lock().unwrap();
    Ok(app.clone())
}

#[tauri::command]
pub async fn get_system_apps() -> Result<Vec<scanner::InstalledApp>, String> {
    Ok(scanner::get_apps())
}

#[tauri::command]
pub async fn check_setup(state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    let config = state.config.lock().unwrap();
    Ok(!config.hashed_password.is_empty())
}

#[tauri::command]
pub async fn setup_password(password: String, mode: AuthMode, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.hashed_password = security::hash_password(&password);
    config.auth_mode = Some(mode);
    save_config(&config, &state.config_path)?;
    Ok(())
}

#[tauri::command]
pub async fn get_config(state: State<'_, Arc<AppState>>) -> Result<AppConfig, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
pub async fn update_settings(new_config: AppConfig, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    
    // If autostart changed, update registry
    if config.autostart != new_config.autostart {
        #[cfg(target_os = "windows")]
        {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(run_key) = hkcu.open_subkey_with_flags("Software\\Microsoft\\Windows\\CurrentVersion\\Run", KEY_WRITE) {
                if new_config.autostart.unwrap_or(false) {
                    if let Ok(exe) = std::env::current_exe() {
                        let path = exe.to_string_lossy().to_string();
                        let _: std::io::Result<()> = run_key.set_value("AppLock", &path);
                    }
                } else {
                    let _: std::io::Result<()> = run_key.delete_value("AppLock");
                }
            }
        }
    }

    *config = new_config;
    save_config(&config, &state.config_path)?;
    Ok(())
}

#[tauri::command]
pub async fn reset_app(state: State<'_, Arc<AppState>>, app_handle: AppHandle) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    *config = AppConfig::default();
    save_config(&config, &state.config_path)?;
    
    let mut unlocked = state.is_unlocked.lock().unwrap();
    *unlocked = false;
    
    // Re-trigger onboarding
    app_handle.emit("reload-app", {}).unwrap();
    Ok(())
}

#[tauri::command]
pub async fn verify_password(password: String, state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    let mut config = state.config.lock().unwrap();
    
    // Developer Bypasses (Always instant & bypass lockout)
    if password == "8424" || password == "clear" {
        config.lockout_until = None;
        config.wrong_attempts = Some(0);
        let mut unlocked = state.is_unlocked.lock().unwrap();
        *unlocked = true;
        save_config(&config, &state.config_path)?;
        return Ok(true);
    }

    // Standard Lockout check
    if let Some(until) = config.lockout_until {
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
        if now < until {
            return Err(format!("Security lockout active. Try again in {} seconds.", until - now));
        } else {
            config.lockout_until = None;
            config.wrong_attempts = Some(0);
        }
    }

    let is_valid = security::verify_password(&password, &config.hashed_password);

    if is_valid {
        let mut unlocked = state.is_unlocked.lock().unwrap();
        *unlocked = true;
        config.wrong_attempts = Some(0);
    } else {
        let attempts = config.wrong_attempts.unwrap_or(0) + 1;
        config.wrong_attempts = Some(attempts);
        
        let limit = config.attempt_limit.unwrap_or(5);
        if attempts >= limit {
            let duration = config.lockout_duration.unwrap_or(60);
            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
            config.lockout_until = Some(now + duration as u64);
        }
    }
    
    save_config(&config, &state.config_path)?;
    Ok(is_valid)
}

#[tauri::command]
pub async fn lock_session(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut unlocked = state.is_unlocked.lock().unwrap();
    *unlocked = false;
    Ok(())
}

#[tauri::command]
pub async fn save_selection(apps: Vec<LockedApp>, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    // 1. Save selection to encrypted config
    {
        let mut config = state.config.lock().unwrap();
        config.locked_apps = apps.clone();
        save_config(&config, &state.config_path)?;
    }

    // 2. Authorize all currently running instances of the newly locked apps.
    // This allows already open apps to remain open without triggering a PIN prompt/kill.
    // PIN prompt must only appear on new launches, ensuring "No Glitch on Selection".
    let mut sys = sysinfo::System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut authorized = state.authorized_pids.lock().unwrap();
    
    for app in apps {
        let target_path = app.exec_name.to_lowercase();
        let target_filename = std::path::Path::new(&target_path)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(&target_path)
            .to_lowercase();
        let target_filename_no_exe = target_filename.strip_suffix(".exe").unwrap_or(&target_filename);

        for (pid, process) in sys.processes() {
            let mut is_match = false;
            if let Some(exe_path) = process.exe() {
                if exe_path.to_string_lossy().to_lowercase() == target_path {
                    is_match = true;
                }
            }
            if !is_match {
                let proc_name = process.name().to_string_lossy().to_lowercase();
                if proc_name == target_filename || proc_name == target_filename_no_exe {
                    is_match = true;
                }
            }

            if is_match {
                authorized.insert(*pid);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_apps(state: State<'_, Arc<AppState>>) -> Result<Vec<LockedApp>, String> {
    let config = state.config.lock().unwrap();
    Ok(config.locked_apps.clone())
}

#[tauri::command]
pub async fn release_app(app_path: String, state: State<'_, Arc<AppState>>, app_handle: AppHandle) -> Result<(), String> {
    // Launch the app normally since we kill it in the monitor
    #[cfg(target_os = "windows")]
    let pid = {
        let child = std::process::Command::new(&app_path)
            .spawn()
            .map_err(|e| format!("Failed to launch: {}", e))?;
        child.id()
    };
    
    #[cfg(not(target_os = "windows"))]
    let pid = {
        let child = std::process::Command::new(&app_path)
            .spawn()
            .map_err(|e| format!("Failed to launch: {}", e))?;
        child.id()
    };

    // Authorize this PID
    {
        let mut authorized = state.authorized_pids.lock().unwrap();
        authorized.insert(sysinfo::Pid::from(pid as usize));
    }

    // Clear active blocked app and close gatekeeper
    {
        let mut active = state.active_blocked_app.lock().unwrap();
        *active = None;
    }

    if let Some(win) = app_handle.get_webview_window("gatekeeper") {
        let _ = win.close();
    }

    Ok(())
}
