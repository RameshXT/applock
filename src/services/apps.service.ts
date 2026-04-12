import { invoke } from "@tauri-apps/api/core";
import { InstalledApp, LockedApp } from "../types";

/** Returns the full list of installed apps with icons and metadata */
export async function getDetailedApps(): Promise<InstalledApp[]> {
  return invoke<InstalledApp[]>("get_detailed_apps");
}

/** Returns the current list of locked apps */
export async function getLockedApps(): Promise<LockedApp[]> {
  return invoke<LockedApp[]>("get_apps");
}

/** Persists the updated locked apps list to the backend */
export async function saveSelection(apps: LockedApp[]): Promise<void> {
  return invoke("save_selection", { apps });
}
