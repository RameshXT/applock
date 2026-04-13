use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use argon2::{
    password_hash::{SaltString},
    Argon2, PasswordHasher,
};
use password_hash::rand_core::OsRng;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Sha256, Digest};
use winreg::enums::*;
use winreg::RegKey;
use chrono::Utc;
use tauri::{AppHandle, State, Emitter};
use crate::models::AppState;
use std::sync::Arc;
use rand::RngCore;

// --- Data Structures ---

#[derive(Debug, Serialize, Deserialize)]
pub struct OnboardingPayload {
    pub raw_credential: String,
    pub cred_type: String,
    pub locked_apps: Vec<OnboardingAppEntry>,
    pub settings: OnboardingSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OnboardingAppEntry {
    pub app_id: String,
    pub exe_path: String,
    pub display_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OnboardingSettings {
    pub autostart_enabled: bool,
    pub minimize_to_tray: bool,
    pub dashboard_lock_enabled: bool,
    pub app_grace_secs: u64,
    pub dashboard_grace_secs: u64,
    pub max_failed_attempts: u32,
    pub theme: String,
    pub notify_on_lock: bool,
    pub notify_on_unlock: bool,
    pub notify_on_fail: bool,
}

#[derive(Debug, Default, Clone)]
pub struct FinalizeArtifacts {
    pub credential_path: Option<PathBuf>,
    pub apps_path: Option<PathBuf>,
    pub settings_path: Option<PathBuf>,
    pub autostart_written: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinalizeResult {
    pub success: bool,
    pub step_failed: Option<String>,
    pub reason: Option<String>,
    pub rollback_ok: bool,
    pub apps_saved: u32,
    pub stale_apps: u32,
}

#[derive(Debug)]
pub struct SavedAppsResult {
    pub saved: u32,
    pub stale: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum FinalizeError {
    #[error("Credential Hash Failed: {0}")]
    CredentialHashFailed(String),
    #[error("Credential Write Failed: {0}")]
    CredentialWriteFailed(String),
    #[error("Apps Validation Failed: {0}")]
    AppsValidationFailed(String),
    #[error("Apps Write Failed: {0}")]
    AppsWriteFailed(String),
    #[error("Settings Validation Failed for field {field}: {reason}")]
    SettingsValidationFailed { field: String, reason: String },
    #[error("Settings Write Failed: {0}")]
    SettingsWriteFailed(String),
    #[error("Autostart Registration Failed: {0}")]
    AutostartFailed(String),
    #[error("Onboarding Flag Write Failed: {0}")]
    OnboardingFlagFailed(String),
    #[error("Rollback Failed: {0}")]
    RollbackFailed(String),
    #[error("IO Error: {0}")]
    IoError(String),
}

impl FinalizeError {
    pub fn to_reason(&self) -> String {
        self.to_string()
    }
}

// --- Implementation ---

#[tauri::command]
pub async fn finalize_onboarding(
    payload: OnboardingPayload,
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
) -> Result<FinalizeResult, String> {
    let mut artifacts = FinalizeArtifacts::default();
    let base_dir = state.config_path.parent().ok_or("Invalid config path")?;
    
    // Step 1: Secure Credential
    emit_finalize_progress(&app_handle, "Securing credential", "in_progress");
    let cred_path = base_dir.join("credentials.enc");
    artifacts.credential_path = Some(cred_path.clone());
    match store_credential(&payload.raw_credential, &payload.cred_type, &cred_path) {
        Ok(_) => {
            emit_finalize_progress(&app_handle, "Securing credential", "done");
        }
        Err(e) => return handle_failure(&app_handle, "Securing credential", e, &artifacts).await,
    }

    // Step 2: Save Locked Apps
    emit_finalize_progress(&app_handle, "Saving apps", "in_progress");
    let apps_path = base_dir.join("locked_apps.json");
    artifacts.apps_path = Some(apps_path.clone());
    let apps_res = match save_locked_apps(payload.locked_apps, &apps_path) {
        Ok(res) => {
            emit_finalize_progress(&app_handle, "Saving apps", "done");
            res
        }
        Err(e) => return handle_failure(&app_handle, "Saving apps", e, &artifacts).await,
    };

    // Step 3: Save Initial Settings
    emit_finalize_progress(&app_handle, "Saving settings", "in_progress");
    let settings_path = base_dir.join("settings.json");
    artifacts.settings_path = Some(settings_path.clone());
    match save_initial_settings(&payload.settings, &settings_path) {
        Ok(_) => {
            emit_finalize_progress(&app_handle, "Saving settings", "done");
        }
        Err(e) => return handle_failure(&app_handle, "Saving settings", e, &artifacts).await,
    }

    // Step 4: Register Autostart
    emit_finalize_progress(&app_handle, "Registering autostart", "in_progress");
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?.to_str().ok_or("Non-UTF8 path")?.to_string();
    match maybe_register_autostart(payload.settings.autostart_enabled, &exe_path) {
        Ok(_) => {
            artifacts.autostart_written = true;
            emit_finalize_progress(&app_handle, "Registering autostart", "done");
            let _ = app_handle.emit("autostart_registered", serde_json::json!({ "enabled": payload.settings.autostart_enabled }));
        }
        Err(e) => {
            // Log warning but continue
            eprintln!("Non-fatal autostart error: {}", e);
            emit_finalize_progress(&app_handle, "Registering autostart", "done");
        }
    }

    // Step 5: Finalize Onboarding Flag
    emit_finalize_progress(&app_handle, "Finalizing", "in_progress");
    match mark_onboarding_complete(&settings_path) {
        Ok(_) => {
            emit_finalize_progress(&app_handle, "Finalizing", "done");
        }
        Err(e) => return handle_failure(&app_handle, "Finalizing", e, &artifacts).await,
    }

    // Success
    let result = FinalizeResult {
        success: true,
        step_failed: None,
        reason: None,
        rollback_ok: true,
        apps_saved: apps_res.saved,
        stale_apps: apps_res.stale,
    };

    let _ = app_handle.emit("onboarding_complete", serde_json::json!({ "launch_mode": "fresh", "apps_loaded": apps_res.saved }));
    
    Ok(result)
}

async fn handle_failure(
    app: &AppHandle,
    step: &str,
    error: FinalizeError,
    artifacts: &FinalizeArtifacts
) -> Result<FinalizeResult, String> {
    let rollback_res = rollback_finalization(artifacts);
    let rollback_ok = rollback_res.is_ok();
    
    let reason = error.to_reason();
    let _ = app.emit("onboarding_finalization_failed", serde_json::json!({
        "step": step,
        "reason": reason.clone(),
        "rollback_ok": rollback_ok
    }));

    Ok(FinalizeResult {
        success: false,
        step_failed: Some(step.to_string()),
        reason: Some(reason),
        rollback_ok,
        apps_saved: 0,
        stale_apps: 0,
    })
}

fn emit_finalize_progress(app: &AppHandle, step: &str, status: &str) {
    let _ = app.emit("onboarding_step_progress", serde_json::json!({ "step": step, "status": status }));
}

// --- Internal Logic ---

fn store_credential(raw: &str, cred_type: &str, path: &Path) -> Result<(), FinalizeError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(raw.as_bytes(), &salt)
        .map_err(|e| FinalizeError::CredentialHashFailed(e.to_string()))?
        .to_string();

    let data = serde_json::to_vec(&serde_json::json!({
        "hash": password_hash,
        "type": cred_type,
        "created_at": Utc::now()
    })).map_err(|e| FinalizeError::CredentialWriteFailed(e.to_string()))?;

    let encrypted = encrypt_data(&data, "applock_master_key")
        .map_err(|e| FinalizeError::CredentialWriteFailed(e))?;

    atomic_write(path, &encrypted)
        .map_err(|e| FinalizeError::CredentialWriteFailed(e.to_string()))
}

fn save_locked_apps(apps: Vec<OnboardingAppEntry>, path: &Path) -> Result<SavedAppsResult, FinalizeError> {
    let mut saved = 0;
    let mut stale = 0;
    let mut validated_apps = Vec::new();

    for app in apps {
        if Path::new(&app.exe_path).exists() {
            validated_apps.push(serde_json::json!({
                "id": app.app_id,
                "name": app.display_name,
                "exe_path": app.exe_path,
                "stale": false
            }));
            saved += 1;
        } else {
            validated_apps.push(serde_json::json!({
                "id": app.app_id,
                "name": app.display_name,
                "exe_path": app.exe_path,
                "stale": true
            }));
            stale += 1;
        }
    }

    let data = serde_json::to_vec_pretty(&validated_apps)
        .map_err(|e| FinalizeError::AppsWriteFailed(e.to_string()))?;

    atomic_write(path, &data)
        .map_err(|e| FinalizeError::AppsWriteFailed(e.to_string()))?;

    Ok(SavedAppsResult { saved, stale })
}

fn save_initial_settings(settings: &OnboardingSettings, path: &Path) -> Result<(), FinalizeError> {
    // Validation
    if settings.app_grace_secs > 86400 {
        return Err(FinalizeError::SettingsValidationFailed { field: "app_grace_secs".into(), reason: "Exceeds 24 hours".into() });
    }

    let data = serde_json::to_vec_pretty(&settings)
        .map_err(|e| FinalizeError::SettingsWriteFailed(e.to_string()))?;

    atomic_write(path, &data)
        .map_err(|e| FinalizeError::SettingsWriteFailed(e.to_string()))
}

fn maybe_register_autostart(enabled: bool, exe_path: &str) -> Result<(), FinalizeError> {
    if !enabled { return Ok(()); }
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    let (key, _) = hkcu.create_subkey(path)
        .map_err(|e| FinalizeError::AutostartFailed(e.to_string()))?;

    key.set_value("AppLock", &format!("\"{}\" --boot-launch", exe_path))
        .map_err(|e| FinalizeError::AutostartFailed(e.to_string()))
}

fn mark_onboarding_complete(path: &Path) -> Result<(), FinalizeError> {
    let content = fs::read_to_string(path)
        .map_err(|e| FinalizeError::OnboardingFlagFailed(e.to_string()))?;
    
    let mut settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| FinalizeError::OnboardingFlagFailed(e.to_string()))?;
    
    settings["onboarding_complete"] = serde_json::json!(true);
    
    let data = serde_json::to_vec_pretty(&settings)
        .map_err(|e| FinalizeError::OnboardingFlagFailed(e.to_string()))?;

    atomic_write(path, &data)
        .map_err(|e| FinalizeError::OnboardingFlagFailed(e.to_string()))
}

fn rollback_finalization(artifacts: &FinalizeArtifacts) -> Result<(), FinalizeError> {
    let mut errs = Vec::new();

    if let Some(ref p) = artifacts.credential_path {
        let _ = fs::remove_file(p).map_err(|e| errs.push(format!("Cred: {}", e)));
    }
    if let Some(ref p) = artifacts.apps_path {
        let _ = fs::remove_file(p).map_err(|e| errs.push(format!("Apps: {}", e)));
    }
    if let Some(ref p) = artifacts.settings_path {
        let _ = fs::remove_file(p).map_err(|e| errs.push(format!("Settings: {}", e)));
    }
    if artifacts.autostart_written {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(key) = hkcu.open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", KEY_SET_VALUE) {
            let _ = key.delete_value("AppLock").map_err(|e| errs.push(format!("Registry: {}", e)));
        }
    }

    if errs.is_empty() { Ok(()) } else { Err(FinalizeError::RollbackFailed(errs.join(", "))) }
}

// --- Helpers ---

fn atomic_write<P: AsRef<Path>>(path: P, data: &[u8]) -> std::io::Result<()> {
    let path = path.as_ref();
    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, data)?;
    fs::rename(tmp_path, path)
}

fn encrypt_data(data: &[u8], key_str: &str) -> Result<Vec<u8>, String> {
    let mut hasher = Sha256::new();
    hasher.update(key_str.as_bytes());
    let key_bytes = hasher.finalize();
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| e.to_string())?;
        
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(combined)
}
