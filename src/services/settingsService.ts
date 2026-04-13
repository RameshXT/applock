import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export interface CooldownTier {
  fails: number;
  secs: number;
}

export interface NotificationPrefs {
  notify_on_lock: boolean;
  notify_on_unlock: boolean;
  notify_on_fail: boolean;
  notify_on_hard_lock: boolean;
  notify_on_grace_expiry: boolean;
}

export interface AppSettings {
  autostart_enabled: boolean;
  minimize_to_tray: boolean;
  dashboard_lock_enabled: boolean;
  app_grace_secs: number;
  dashboard_grace_secs: number;
  cooldown_tiers: CooldownTier[];
  max_failed_attempts: number;
  notification_prefs: NotificationPrefs;
  theme: string;
}

export interface SettingsChangeLogEntry {
  timestamp: string;
  setting_key: string;
  old_value: any;
  new_value: any;
  verified: boolean;
}

export interface ImportResult {
  success: boolean;
  settings_applied: number;
  warnings: string[];
}

class SettingsService {
  /**
   * Sets the autostart preference.
   */
  async setAutostart(enabled: boolean): Promise<void> {
    await invoke("set_autostart", { enabled });
  }

  /**
   * Sets the minimize to tray preference.
   */
  async setMinimizeToTray(enabled: boolean): Promise<void> {
    await invoke("set_minimize_to_tray", { enabled });
  }

  /**
   * Sets the dashboard lock preference. Requires a verify token.
   */
  async setDashboardLock(enabled: boolean, token: string): Promise<void> {
    await invoke("set_dashboard_lock", { enabled, token });
  }

  /**
   * Sets the grace duration for app or dashboard. Requires a verify token.
   */
  async setGraceDuration(target: "app" | "dashboard", secs: number, token: string): Promise<void> {
    await invoke("set_grace_duration", { target, secs, token });
  }

  /**
   * Sets the cooldown tiers. Requires a verify token.
   */
  async setCooldownTiers(tiers: CooldownTier[], token: string): Promise<void> {
    await invoke("set_cooldown_tiers", { tiers, token });
  }

  /**
   * Sets the maximum failed attempts. Requires a verify token.
   */
  async setMaxFailedAttempts(max: number, token: string): Promise<void> {
    await invoke("set_max_failed_attempts", { max, token });
  }

  /**
   * Sets the notification preferences.
   */
  async setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    await invoke("set_notification_prefs", { prefs });
  }

  /**
   * Sets the application theme.
   */
  async setTheme(theme: string): Promise<void> {
    await invoke("set_theme", { theme });
  }

  /**
   * Retrieves the settings change log. Requires a verify token.
   */
  async getSettingsChangeLog(token: string): Promise<SettingsChangeLogEntry[]> {
    return await invoke("get_settings_change_log", { token });
  }

  /**
   * Exports settings to a file. Requires a verify token.
   */
  async exportSettings(password: string, path: string, token: string): Promise<void> {
    await invoke("export_settings", { password, path, token });
  }

  /**
   * Imports settings from a file. Requires a verify token.
   */
  async importSettings(password: string, path: string, token: string): Promise<ImportResult> {
    return await invoke("import_settings", { password, path, token });
  }

  // --- Event Listeners ---

  onAutostartUpdated(callback: (enabled: boolean) => void): Promise<UnlistenFn> {
    return listen<{ enabled: boolean }>("autostart_updated", (event) => callback(event.payload.enabled));
  }

  onTrayBehaviorUpdated(callback: (minimizeToTray: boolean) => void): Promise<UnlistenFn> {
    return listen<{ minimize_to_tray: boolean }>("tray_behavior_updated", (event) => callback(event.payload.minimize_to_tray));
  }

  onDashboardLockUpdated(callback: (enabled: boolean) => void): Promise<UnlistenFn> {
    return listen<{ enabled: boolean }>("dashboard_lock_setting_updated", (event) => callback(event.payload.enabled));
  }

  onGraceDurationUpdated(callback: (payload: { target: string, secs: number }) => void): Promise<UnlistenFn> {
    return listen<{ target: string, secs: number }>("grace_duration_updated", (event) => callback(event.payload));
  }

  onCooldownTiersUpdated(callback: (tiers: CooldownTier[]) => void): Promise<UnlistenFn> {
    return listen<{ tiers: CooldownTier[] }>("cooldown_tiers_updated", (event) => callback(event.payload.tiers));
  }

  onMaxAttemptsUpdated(callback: (max: number) => void): Promise<UnlistenFn> {
    return listen<{ max: number }>("max_attempts_updated", (event) => callback(event.payload.max));
  }

  onNotificationPrefsUpdated(callback: (prefs: NotificationPrefs) => void): Promise<UnlistenFn> {
    return listen<{ prefs: NotificationPrefs }>("notification_prefs_updated", (event) => callback(event.payload.prefs));
  }

  onThemeUpdated(callback: (theme: string) => void): Promise<UnlistenFn> {
    return listen<{ theme: string }>("theme_updated", (event) => callback(event.payload.theme));
  }

  onSettingsExported(callback: (path: string) => void): Promise<UnlistenFn> {
    return listen<{ path: string }>("settings_exported", (event) => callback(event.payload.path));
  }

  onSettingsImported(callback: (payload: { settings_applied: number, warnings: string[] }) => void): Promise<UnlistenFn> {
    return listen<{ settings_applied: number, warnings: string[] }>("settings_imported", (event) => callback(event.payload));
  }
}

export const settingsService = new SettingsService();
