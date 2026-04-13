import React, { useState } from "react";
import styles from "../../styles/App.module.css";
import { AppConfig } from "../../types";
import { 
  settingsService, 
  CooldownTier, 
  NotificationPrefs 
} from "../../services/settingsService";
import { 
  AutoStartToggle, 
  TrayBehaviorToggle, 
  GracePeriodSlider, 
  CooldownTierEditor, 
  MaxAttemptsInput, 
  NotificationPrefsPanel, 
  ThemeSelector, 
  SettingsExportImport 
} from "./AppSettingsPanel";
import { Lock, Unlock, ShieldAlert } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface AdvancedSettingsProps {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
}

const AdvancedBackup: React.FC<AdvancedSettingsProps> = ({ config, updateConfig }) => {
  const [token, setToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Settings state (initialized from config)
  const [appGrace, setAppGrace] = useState(config.grace_period || 15);
  const [dashGrace, setDashGrace] = useState(300); // Placeholder
  const [tiers, setTiers] = useState<CooldownTier[]>([{ fails: 3, secs: 30 }, { fails: 5, secs: 300 }]);
  const [maxAttempts, setMaxAttempts] = useState(config.attempt_limit || 3);
  const [theme, setTheme] = useState("dark");
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>({
    notify_on_lock: true,
    notify_on_unlock: true,
    notify_on_fail: true,
    notify_on_hard_lock: true,
    notify_on_grace_expiry: true,
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const result: any = await invoke("verify_credential", { 
        input: password, 
        context: "SETTINGS_UNLOCK", 
        app_id: null 
      });
      if (result.success && result.token) {
        setToken(result.token);
        setShowAuth(false);
        setPassword("");
      } else {
        setError("Invalid credentials");
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProtectedAction = (action: (token: string) => Promise<void>) => {
    if (!token) {
      setShowAuth(true);
      return;
    }
    action(token).catch(e => {
        if (e.includes("Token")) {
            setToken(null);
            setShowAuth(true);
        }
    });
  };

  return (
    <div className={styles.categoryContent}>
      <header className={styles.categoryHeader}>
        <div className={styles.categoryTitleGroup}>
          <h2 className={styles.categoryTitle}>Advanced & Backup</h2>
          <p className={styles.categorySubtitle}>Configure system-level behavior and security policies.</p>
        </div>
        {token ? (
            <div className={styles.badgeSuccess}><Unlock size={12}/> Session Authorized</div>
        ) : (
            <div className={styles.badgeWarning}><Lock size={12}/> Authorization Required</div>
        )}
      </header>

      {showAuth && (
        <div className={styles.authCard} style={{ margin: "20px auto" }}>
          <ShieldAlert size={48} color="var(--accent-color)" style={{ margin: "0 auto" }} />
          <h3 className={styles.categoryTitle} style={{ textAlign: "center" }}>Verify Identity</h3>
          <p className={styles.categorySubtitle} style={{ textAlign: "center" }}>Enter your master password to access protected settings.</p>
          <input 
            type="password" 
            className={styles.pincodeInput} 
            style={{ width: "100%", textAlign: "center", fontSize: "1.2rem", height: "50px" }}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            autoFocus
          />
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.btnRow}>
            <button className={styles.secondaryBtn} onClick={() => setShowAuth(false)}>Cancel</button>
            <button className={styles.primaryBtn} onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Authorize"}
            </button>
          </div>
        </div>
      )}

      {!showAuth && (
        <div className={styles.settingsGrid}>
          <div className={styles.settingsMainCol}>
              <AutoStartToggle 
                enabled={config.autostart || false} 
                onToggle={(val) => settingsService.setAutostart(val).then(() => updateConfig({ autostart: val }))} 
              />
              <TrayBehaviorToggle 
                enabled={config.minimize_to_tray || false} 
                onToggle={(val) => settingsService.setMinimizeToTray(val).then(() => updateConfig({ minimize_to_tray: val }))} 
              />
              <ThemeSelector theme={theme} onChange={(val) => settingsService.setTheme(val).then(() => setTheme(val))} />
              <MaxAttemptsInput 
                max={maxAttempts} 
                onChange={(val) => handleProtectedAction((t) => settingsService.setMaxFailedAttempts(val, t).then(() => setMaxAttempts(val)))} 
              />
              <GracePeriodSlider 
                appGrace={appGrace} 
                dashGrace={dashGrace} 
                onChange={(target, val) => handleProtectedAction((t) => settingsService.setGraceDuration(target, val, t).then(() => {
                    if (target === "app") {
                        setAppGrace(val);
                        updateConfig({ grace_period: val });
                    } else {
                        setDashGrace(val);
                    }
                }))} 
              />
              <CooldownTierEditor 
                tiers={tiers} 
                onSave={(newTiers) => handleProtectedAction((t) => settingsService.setCooldownTiers(newTiers, t).then(() => setTiers(newTiers)))} 
              />
          </div>

          <aside className={styles.settingsSideCol}>
              <NotificationPrefsPanel 
                prefs={notifyPrefs} 
                onToggle={(key, val) => settingsService.setNotificationPrefs({ ...notifyPrefs, [key]: val }).then(() => setNotifyPrefs({ ...notifyPrefs, [key]: val }))} 
              />
              <SettingsExportImport 
                onExport={(p) => handleProtectedAction((t) => settingsService.exportSettings(p, `applock_backup_${Date.now()}.applock`, t))} 
                onImport={(p) => handleProtectedAction((t) => settingsService.importSettings(p, "backup.applock", t).then(r => console.log(r)))} 
              />
          </aside>
        </div>
      )}
    </div>
  );
};
export default AdvancedBackup;
