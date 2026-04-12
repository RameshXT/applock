import { invoke } from "@tauri-apps/api/core";
import { AppConfig, AuthMode } from "../types";

/** Verifies the master unlock password/PIN */
export async function verifyPassword(password: string): Promise<boolean> {
  return invoke<boolean>("verify_password", { password });
}

/** Sets up or updates the master password */
export async function setupPassword(password: string, mode: AuthMode): Promise<void> {
  return invoke("setup_password", { password, mode });
}

/** Locks the current session */
export async function lockSession(): Promise<void> {
  return invoke("lock_session");
}

/** Verifies PIN in the gatekeeper popup window */
export async function verifyGatekeeper(password: string): Promise<boolean> {
  return invoke<boolean>("verify_gatekeeper", { password });
}

/** Returns true if the initial setup has been completed */
export async function checkSetup(): Promise<boolean> {
  return invoke<boolean>("check_setup");
}

/** Returns true if the session is currently unlocked */
export async function getIsUnlocked(): Promise<boolean> {
  return invoke<boolean>("get_is_unlocked");
}

/** Loads the full app config from the backend */
export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}
