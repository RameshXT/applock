import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface LockedAppEntry {
  id: string;
  name: string;
  executable_path: string;
  executable_name: string;
  is_uwp: boolean;
  package_family_name: string;
}

export interface ActiveLockSession {
  app_id: string;
  process_id: number;
  window_handles: number[];
  detected_at: string;
  freeze_applied: boolean;
  lock_shown: boolean;
  child_pids: number[];
  relaunch_count: number;
}

export type WatcherState = "Running" | "Paused" | "Crashed" | "Restarting";

export interface WatcherEventPayloads {
  show_lock_overlay: { app_id: string; app_name: string; process_id: number; is_uwp: boolean };
  app_unlocked: { app_id: string; process_id: number };
  elevated_app_detected: { app_id: string; app_name: string; process_id: number };
  relaunch_loop_detected: { app_id: string; app_name: string; attempt_count: number };
  new_app_detected: LockedAppEntry;
  watcher_crashed: { reason: string; restart_attempt: number };
  watcher_restarted: { attempt_number: number };
  watcher_failed_permanently: { reason: string };
  portable_app_missing: { app_id: string; app_name: string; last_known_path: string };
}

class WatcherService {
  async startWatcher(): Promise<void> {
    await invoke("start_watcher");
  }

  async stopWatcher(): Promise<void> {
    await invoke("stop_watcher");
  }

  async pauseWatcher(): Promise<void> {
    await invoke("pause_watcher");
  }

  async resumeWatcher(): Promise<void> {
    await invoke("resume_watcher");
  }

  async getWatcherState(): Promise<WatcherState> {
    return await invoke("get_watcher_state");
  }

  async getActiveLockSessions(): Promise<ActiveLockSession[]> {
    return await invoke("get_active_lock_sessions");
  }

  async unlockApp(processId: number): Promise<void> {
    await invoke("unlock_app", { processId });
  }

  async addPortableApp(exePath: string): Promise<LockedAppEntry> {
    return await invoke("add_portable_app", { exePath });
  }

  // Event Listeners
  onShowLockOverlay(callback: (payload: WatcherEventPayloads["show_lock_overlay"]) => void) {
    return listen<WatcherEventPayloads["show_lock_overlay"]>("show_lock_overlay", (event) => callback(event.payload));
  }

  onAppUnlocked(callback: (payload: WatcherEventPayloads["app_unlocked"]) => void) {
    return listen<WatcherEventPayloads["app_unlocked"]>("app_unlocked", (event) => callback(event.payload));
  }

  onElevatedAppDetected(callback: (payload: WatcherEventPayloads["elevated_app_detected"]) => void) {
    return listen<WatcherEventPayloads["elevated_app_detected"]>("elevated_app_detected", (event) => callback(event.payload));
  }

  onWatcherCrashed(callback: (payload: WatcherEventPayloads["watcher_crashed"]) => void) {
    return listen<WatcherEventPayloads["watcher_crashed"]>("watcher_crashed", (event) => callback(event.payload));
  }
}

export const watcherService = new WatcherService();
