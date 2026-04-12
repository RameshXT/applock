import { invoke } from "@tauri-apps/api/core";
import { AppConfig } from "../types";

/** Persists updated config settings to the backend */
export async function updateSettings(newConfig: AppConfig): Promise<void> {
  return invoke("update_settings", { newConfig });
}

/** Full factory reset — wipes all data */
export async function resetApp(): Promise<void> {
  return invoke("reset_app");
}
