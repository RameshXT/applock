import { invoke } from "@tauri-apps/api/core";
import { LockedApp } from "../types";

/** Returns the app that triggered the gatekeeper popup */
export async function getBlockedApp(): Promise<LockedApp | null> {
  return invoke<LockedApp | null>("get_blocked_app");
}

/** Releases the blocked app after successful gatekeeper auth */
export async function releaseApp(): Promise<void> {
  return invoke("release_app");
}
