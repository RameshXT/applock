import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Tab, AppConfig, AuthMode, LockedApp, InstalledApp } from "../types";
import { getConfig, checkSetup, getIsUnlocked } from "../services/auth.service";
import { getLockedApps, getDetailedApps } from "../services/apps.service";
import { getBlockedApp } from "../services/system.service";
import { listen } from "@tauri-apps/api/event";

interface AppInitOptions {
  locked_apps: LockedApp[];
  auth_mode: AuthMode;
  attempt_limit: number;
  lockout_duration: number;
}

interface AppInitResult {
  config: AppConfig;
  setConfig: Dispatch<SetStateAction<AppConfig>>;
  authMode: AuthMode;
  setAuthMode: Dispatch<SetStateAction<AuthMode>>;
  lockedApps: LockedApp[];
  setLockedApps: Dispatch<SetStateAction<LockedApp[]>>;
  allApps: InstalledApp[];
  isScanning: boolean;
  blockedApp: LockedApp | null;
  setBlockedApp: Dispatch<SetStateAction<LockedApp | null>>;
  gatekeeperPIN: string;
  setGatekeeperPIN: Dispatch<SetStateAction<string>>;
  activeTab: Tab;
  setActiveTab: Dispatch<SetStateAction<Tab>>;
  settingsTab: string;
  setSettingsTab: Dispatch<SetStateAction<string>>;
  fetchDetailedApps: () => Promise<void>;
}

export function useAppInit(defaultConfig: AppInitOptions): AppInitResult {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [authMode, setAuthMode] = useState<AuthMode>(defaultConfig.auth_mode);
  const [lockedApps, setLockedApps] = useState<LockedApp[]>([]);
  const [allApps, setAllApps] = useState<InstalledApp[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [blockedApp, setBlockedApp] = useState<LockedApp | null>(null);
  const [gatekeeperPIN, setGatekeeperPIN] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (localStorage.getItem("applock_tab") as Tab) || "home"
  );
  const [settingsTab, setSettingsTab] = useState(
    () => localStorage.getItem("applock_settings_tab") || "account"
  );

  const fetchDetailedApps = async () => {
    try {
      setIsScanning(true);
      const apps = await getDetailedApps();
      setAllApps(apps);
    } catch (err) {
      console.error("Failed to fetch apps:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWin = getCurrentWindow();

        if (currentWin.label === "gatekeeper") {
          const cfg = await getConfig();
          setConfig(cfg);
          if (cfg.auth_mode) setAuthMode(cfg.auth_mode);
          const blocked = await getBlockedApp();
          if (blocked) {
            setBlockedApp(blocked);
          } else {
            currentWin.close();
          }
          return;
        }

        const cfg = await getConfig();
        setConfig(cfg);
        if (cfg.auth_mode) setAuthMode(cfg.auth_mode);

        const isSetup = await checkSetup();
        if (!isSetup) return; // view is set by App.tsx via returned state

        const isUnlocked = await getIsUnlocked();
        const persistedTab = localStorage.getItem("applock_tab") as Tab;
        const persistedSettingsTab = localStorage.getItem("applock_settings_tab");
        if (persistedTab) setActiveTab(persistedTab);
        if (persistedSettingsTab) setSettingsTab(persistedSettingsTab);

        const locked = await getLockedApps();
        setLockedApps(locked);
        if (isUnlocked) fetchDetailedApps();
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Listen for blocked app events from the system monitor
  useEffect(() => {
    const unlisten = listen<LockedApp>("app-blocked", async (event) => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const currentWin = getCurrentWindow();
      if (currentWin.label === "gatekeeper") {
        setBlockedApp(event.payload);
        setGatekeeperPIN("");
      }
    });

    const unlistenReload = listen("reload-app", () => {
      window.location.reload();
    });

    return () => {
      unlisten.then(f => f());
      unlistenReload.then(f => f());
    };
  }, []);

  return {
    config, setConfig,
    authMode, setAuthMode,
    lockedApps, setLockedApps,
    allApps, isScanning,
    blockedApp, setBlockedApp,
    gatekeeperPIN, setGatekeeperPIN,
    activeTab, setActiveTab,
    settingsTab, setSettingsTab,
    fetchDetailedApps,
  };
}
