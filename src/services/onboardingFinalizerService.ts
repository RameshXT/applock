import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export enum CredentialType {
  PIN = "PIN",
  Password = "Password",
}

export interface OnboardingAppEntry {
  app_id: string;
  exe_path: string;
  display_name: string;
}

export interface OnboardingSettings {
  autostart_enabled: boolean;
  minimize_to_tray: boolean;
  dashboard_lock_enabled: boolean;
  app_grace_secs: number;
  dashboard_grace_secs: number;
  max_failed_attempts: number;
  theme: string;
  notify_on_lock: boolean;
  notify_on_unlock: boolean;
  notify_on_fail: boolean;
}

export interface OnboardingPayload {
  raw_credential: string;
  cred_type: CredentialType;
  locked_apps: OnboardingAppEntry[];
  settings: OnboardingSettings;
}

export interface FinalizeResult {
  success: boolean;
  step_failed: string | null;
  reason: string | null;
  rollback_ok: boolean;
  apps_saved: number;
  stale_apps: number;
}

export interface OnboardingStepProgress {
  step: string;
  status: "pending" | "in_progress" | "done" | "failed";
}

export interface OnboardingFinalizationFailed {
  step: string;
  reason: string;
  rollback_ok: boolean;
}

export interface OnboardingComplete {
  launch_mode: string;
  apps_loaded: number;
}

class OnboardingFinalizerService {
  /**
   * Triggers the atomic finalization of the onboarding process.
   * @param payload The collected onboarding data.
   */
  async finalize(payload: OnboardingPayload): Promise<FinalizeResult> {
    return await invoke<FinalizeResult>("finalize_onboarding", { payload });
  }

  /**
   * Listens for real-time progress updates.
   */
  async onProgress(callback: (progress: OnboardingStepProgress) => void) {
    return await listen<OnboardingStepProgress>("onboarding_step_progress", (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listens for the successful completion of onboarding.
   */
  async onComplete(callback: (data: OnboardingComplete) => void) {
    return await listen<OnboardingComplete>("onboarding_complete", (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listens for finalization failures.
   */
  async onFailure(callback: (error: OnboardingFinalizationFailed) => void) {
    return await listen<OnboardingFinalizationFailed>("onboarding_finalization_failed", (event) => {
      callback(event.payload);
    });
  }
}

export const onboardingFinalizerService = new OnboardingFinalizerService();
