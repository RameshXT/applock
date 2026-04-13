import React, { useState } from "react";
import styles from "../../styles/App.module.css";
import { 
  Monitor, 
  Bell, 
  Shield, 
  History, 
  Download, 
  Upload, 
  Check, 
  AlertCircle,
  Plus,
  Trash2,
  Moon,
  Sun,
  Laptop
} from "lucide-react";
import { 
  CooldownTier, 
  NotificationPrefs 
} from "../../services/settingsService";
import clsx from "clsx";

/**
 * AutoStartToggle Component
 */
export const AutoStartToggle: React.FC<{ enabled: boolean; onToggle: (val: boolean) => void }> = ({ enabled, onToggle }) => (
  <div className={styles.settingItem}>
    <div className={styles.settingInfo}>
      <div className={styles.settingLabel}><Monitor size={16} /> Auto-launch on Startup</div>
      <div className={styles.settingDesc}>Start AppLock automatically when your computer boots up.</div>
    </div>
    <div className={styles.switchCol}>
      <label className={styles.switch}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span className={clsx(styles.slider, styles.round)}></span>
      </label>
    </div>
  </div>
);

/**
 * TrayBehaviorToggle Component
 */
export const TrayBehaviorToggle: React.FC<{ enabled: boolean; onToggle: (val: boolean) => void }> = ({ enabled, onToggle }) => (
  <div className={styles.settingItem}>
    <div className={styles.settingInfo}>
      <div className={styles.settingLabel}><Monitor size={16} /> Minimize to Tray</div>
      <div className={styles.settingDesc}>When closed, the app will continue running in the system tray.</div>
    </div>
    <div className={styles.switchCol}>
      <label className={styles.switch}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span className={clsx(styles.slider, styles.round)}></span>
      </label>
    </div>
  </div>
);

/**
 * GracePeriodSlider Component
 */
export const GracePeriodSlider: React.FC<{ 
  appGrace: number; 
  dashGrace: number; 
  onChange: (target: "app" | "dashboard", val: number) => void 
}> = ({ appGrace, dashGrace, onChange }) => (
  <div className={styles.settingGroup}>
    <div className={styles.groupHeader}>
      <Shield size={18} /> Grace Periods
    </div>
    <div className={styles.settingItemCol}>
      <div className={styles.sliderInfo}>
        <span>Application Grace: <b>{appGrace}s</b></span>
      </div>
      <input 
        type="range" 
        min="30" 
        max="3600" 
        step="30" 
        value={appGrace} 
        onChange={(e) => onChange("app", parseInt(e.target.value))}
        className={styles.rangeSlider}
      />
    </div>
    <div className={styles.settingItemCol}>
      <div className={styles.sliderInfo}>
        <span>Dashboard Grace: <b>{dashGrace}s</b></span>
      </div>
      <input 
        type="range" 
        min="30" 
        max="3600" 
        step="30" 
        value={dashGrace} 
        onChange={(e) => onChange("dashboard", parseInt(e.target.value))}
        className={styles.rangeSlider}
      />
    </div>
  </div>
);

/**
 * CooldownTierEditor Component
 */
export const CooldownTierEditor: React.FC<{ 
  tiers: CooldownTier[]; 
  onSave: (tiers: CooldownTier[]) => void 
}> = ({ tiers, onSave }) => {
  const [localTiers, setLocalTiers] = useState<CooldownTier[]>(tiers);

  const addTier = () => {
    setLocalTiers([...localTiers, { fails: 10, secs: 1800 }]);
  };

  const removeTier = (index: number) => {
    setLocalTiers(localTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof CooldownTier, val: number) => {
    const next = [...localTiers];
    next[index] = { ...next[index], [field]: val };
    setLocalTiers(next);
  };

  return (
    <div className={styles.settingGroup}>
      <div className={styles.groupHeader}>
        <History size={18} /> Cooldown Tiers
      </div>
      <table className={styles.tierTable}>
        <thead>
          <tr>
            <th>Failures</th>
            <th>Duration (s)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {localTiers.sort((a,b) => a.fails - b.fails).map((tier, idx) => (
            <tr key={idx}>
              <td><input type="number" value={tier.fails} onChange={(e) => updateTier(idx, "fails", parseInt(e.target.value))} /></td>
              <td><input type="number" value={tier.secs} onChange={(e) => updateTier(idx, "secs", parseInt(e.target.value))} /></td>
              <td><button onClick={() => removeTier(idx)} className={styles.iconBtnDanger}><Trash2 size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.btnRow}>
        <button onClick={addTier} className={styles.secondaryBtnSmall}><Plus size={14}/> Add Tier</button>
        <button onClick={() => onSave(localTiers)} className={styles.primaryBtnSmall}><Check size={14}/> Save Changes</button>
      </div>
    </div>
  );
};

/**
 * MaxAttemptsInput Component
 */
export const MaxAttemptsInput: React.FC<{ max: number; onChange: (val: number) => void }> = ({ max, onChange }) => (
  <div className={styles.settingItem}>
    <div className={styles.settingInfo}>
      <div className={styles.settingLabel}><AlertCircle size={16} /> Max Failed Attempts</div>
      <div className={styles.settingDesc}>Number of attempts before cooldown is triggered (3-20).</div>
    </div>
    <div className={styles.inputCol}>
      <input 
        type="number" 
        min="3" 
        max="20" 
        value={max} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        className={styles.pincodeChar}
        style={{ width: "60px", height: "40px", fontSize: "1.2rem" }}
      />
    </div>
  </div>
);

/**
 * NotificationPrefsPanel Component
 */
export const NotificationPrefsPanel: React.FC<{ 
  prefs: NotificationPrefs; 
  onToggle: (key: keyof NotificationPrefs, val: boolean) => void 
}> = ({ prefs, onToggle }) => (
  <div className={styles.settingGroup}>
    <div className={styles.groupHeader}>
      <Bell size={18} /> Notification Preferences
    </div>
    {(Object.keys(prefs) as Array<keyof NotificationPrefs>).map(key => (
      <div className={styles.settingItem} key={key} style={{ padding: "8px 0" }}>
        <div className={styles.settingLabelMinimal}>{key.replace(/_/g, " ")}</div>
        <label className={styles.switchSmall}>
          <input type="checkbox" checked={prefs[key]} onChange={(e) => onToggle(key, e.target.checked)} />
          <span className={clsx(styles.slider, styles.round)}></span>
        </label>
      </div>
    ))}
  </div>
);

/**
 * ThemeSelector Component
 */
export const ThemeSelector: React.FC<{ theme: string; onChange: (val: string) => void }> = ({ theme, onChange }) => (
  <div className={styles.settingItem}>
    <div className={styles.settingInfo}>
      <div className={styles.settingLabel}><Sun size={16} /> Appearance</div>
      <div className={styles.settingDesc}>Customize the look and feel of AppLock.</div>
    </div>
    <div className={styles.segmentedControl}>
      <button className={clsx(theme === "light" && styles.segmentedActive)} onClick={() => onChange("light")}><Sun size={14}/></button>
      <button className={clsx(theme === "dark" && styles.segmentedActive)} onClick={() => onChange("dark")}><Moon size={14}/></button>
      <button className={clsx(theme === "system" && styles.segmentedActive)} onClick={() => onChange("system")}><Laptop size={14}/></button>
    </div>
  </div>
);

/**
 * SettingsExportImport Component
 */
export const SettingsExportImport: React.FC<{ 
  onExport: (password: string) => void; 
  onImport: (password: string) => void 
}> = ({ onExport, onImport }) => {
  const [pass, setPass] = useState("");
  
  return (
    <div className={styles.settingGroup} style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
      <div className={styles.groupHeader}>
        <Upload size={18} /> Backup & Recovery
      </div>
      <div className={styles.settingItemCol}>
        <div className={styles.settingDesc}>Settings are encrypted with your password.</div>
        <input 
          type="password" 
          placeholder="Encryption Password" 
          value={pass} 
          onChange={(e) => setPass(e.target.value)} 
          className={styles.modernInput}
        />
        <div className={styles.btnRow} style={{ marginTop: "12px" }}>
          <button onClick={() => onExport(pass)} className={styles.primaryBtnSmall} disabled={!pass}><Download size={14}/> Export (.applock)</button>
          <button onClick={() => onImport(pass)} className={styles.secondaryBtnSmall} disabled={!pass}><Upload size={14}/> Import</button>
        </div>
      </div>
    </div>
  );
};
