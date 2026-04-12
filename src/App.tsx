import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./styles/App.module.css";
import clsx from "clsx";

// Types
import { View, AppConfig } from "./types";

// Hooks
import { useAppInit } from "./hooks/useAppInit";
import { useAuth } from "./hooks/useAuth";
import { useApps } from "./hooks/useApps";
import { useToast, useFocusGuard } from "./hooks/useToast";
import { usePlaceholder } from "./hooks/usePlaceholder";

// Pages
import { Onboarding } from "./pages/Onboarding";
import { Setup } from "./pages/Setup";
import { Unlock } from "./pages/Unlock";
import { Dashboard } from "./pages/Dashboard";
import { Gatekeeper } from "./pages/Gatekeeper";

// Components
import { ConfirmModals } from "./components/modals/ConfirmModals";

// Services
import { resetApp, updateSettings } from "./services/config.service";
import { releaseApp } from "./services/system.service";
import { lockSession, checkSetup, getIsUnlocked } from "./services/auth.service";

const APP_NAME = "Windows AppLock";

function App() {
  const [view, setView] = useState<View | null>(null);
  const [isUpdatingFromSettings, setIsUpdatingFromSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetFinal, setShowResetFinal] = useState(false);
  const [isLaunching] = useState(false);
  const [search, setSearch] = useState("");

  const { toast, showUpdateSuccess, setShowUpdateSuccess, triggerToast } = useToast();
  const { placeholder } = usePlaceholder();

  const {
    config, setConfig, authMode, setAuthMode,
    lockedApps, setLockedApps,
    allApps, isScanning,
    blockedApp,
    gatekeeperPIN, setGatekeeperPIN,
    activeTab, setActiveTab,
    settingsTab, setSettingsTab,
    fetchDetailedApps,
  } = useAppInit({ locked_apps: [], auth_mode: "PIN", attempt_limit: 5, lockout_duration: 60 });

  const {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    error, setError,
    isCompleting, completingStep,
    handleSetup, handleUnlock, handleGatekeeperUnlock,
  } = useAuth();

  const {
    appToRemove, setAppToRemove,
    appsToBulkUnlock, setAppsToBulkUnlock,
    toggleApp, confirmRemoval, bulkUnlock, confirmBulkUnlock,
  } = useApps();

  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const gatekeeperInputRef = useRef<HTMLInputElement>(null);

  useFocusGuard({
    view, authMode, passwordLength: password.length,
    pinInputRef, confirmInputRef, mainInputRef, gatekeeperInputRef,
  });

  // Route to the correct initial view after config is loaded
  useEffect(() => {
    if (view !== null) return; // already routed
    const route = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWin = getCurrentWindow();
        if (currentWin.label === "gatekeeper") {
          setView("gatekeeper");
          return;
        }
        const isSetup = await checkSetup();
        if (!isSetup) {
          setView("onboarding");
          return;
        }
        const isUnlocked = await getIsUnlocked();
        if (isUnlocked) {
          const persistedView = localStorage.getItem("applock_view") as View;
          if (persistedView && ["dashboard", "setup", "verify"].includes(persistedView)) {
            setView(persistedView);
          } else {
            setView("dashboard");
          }
        } else {
          setView("unlock");
        }
      } catch (err) {
        console.error(err);
      }
    };
    route();
  }, []);

  // Persist view/tab navigation
  useEffect(() => {
    if (view && view !== "onboarding" && view !== "unlock" && view !== "gatekeeper") {
      localStorage.setItem("applock_view", view);
    }
    if (activeTab) localStorage.setItem("applock_tab", activeTab);
    if (settingsTab) localStorage.setItem("applock_settings_tab", settingsTab);
  }, [view, activeTab, settingsTab]);

  // Apply animation intensity setting
  useEffect(() => {
    if (config.animations_intensity === "low") {
      document.documentElement.setAttribute("data-reduced-motion", "true");
    } else {
      document.documentElement.removeAttribute("data-reduced-motion");
    }
  }, [config.animations_intensity]);

  const updateConfig = async (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    if (updates.auth_mode) setAuthMode(updates.auth_mode);
    try { await updateSettings(newConfig); } catch (err) { setError(String(err)); }
  };

  if (view === null) return null;

  return (
    <div className={clsx(styles.container, view === 'gatekeeper' && styles.transparentBg)}>
      <AnimatePresence>
        {view === 'gatekeeper' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={styles.gatekeeperOverlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === "onboarding" && (
          <Onboarding appName={APP_NAME} onContinue={() => setView('setup')} />
        )}

        {view === "setup" && (
          <Setup
            authMode={authMode} password={password} confirmPassword={confirmPassword}
            error={error} isCompleting={isCompleting} completingStep={completingStep}
            allAppsCount={allApps.length} pinInputRef={pinInputRef} confirmInputRef={confirmInputRef}
            setAuthMode={setAuthMode} setPassword={setPassword} setConfirmPassword={setConfirmPassword}
            setError={setError} setView={setView}
            handleSetup={(e) => handleSetup(e, authMode, isUpdatingFromSettings, setView, setIsUpdatingFromSettings, setShowUpdateSuccess)}
          />
        )}

        {(view === "unlock" || view === "verify") && (
          <Unlock
            appName={APP_NAME} authMode={authMode} password={password} error={error}
            isVerify={view === "verify"} mainInputRef={mainInputRef}
            setPassword={setPassword} setError={setError}
            handleUnlock={(e, override) => handleUnlock(e, view, setView, override)}
            onCancel={() => { setView("dashboard"); setPassword(""); setError(null); }}
          />
        )}

        {view === "dashboard" && (
          <Dashboard
            appName={APP_NAME} activeTab={activeTab} setActiveTab={setActiveTab}
            showUpdateSuccess={showUpdateSuccess} toast={toast}
            search={search} setSearch={setSearch} placeholder={placeholder}
            handleLockSession={async () => { await lockSession(); setView("unlock"); }}
            isScanning={isScanning} allApps={allApps} lockedApps={lockedApps}
            toggleApp={(app, fromTab) => toggleApp(app, lockedApps, setLockedApps, triggerToast, setError, fromTab)}
            refreshApps={fetchDetailedApps}
            bulkUnlock={(apps) => bulkUnlock(apps)}
            settingsTab={settingsTab} setSettingsTab={setSettingsTab}
            authMode={authMode} setAuthMode={setAuthMode}
            setView={(v: string) => {
              if (v === "setup") { setIsUpdatingFromSettings(true); setView("verify"); }
              else { setView(v as View); }
            }}
            setIsUpdatingFromSettings={setIsUpdatingFromSettings}
            config={config} updateConfig={updateConfig}
            setShowResetConfirm={setShowResetConfirm}
          />
        )}

        {view === "gatekeeper" && (
          <Gatekeeper
            blockedApp={blockedApp} authMode={authMode} gatekeeperPIN={gatekeeperPIN}
            error={error} isLaunching={isLaunching} gatekeeperInputRef={gatekeeperInputRef}
            setGatekeeperPIN={setGatekeeperPIN} setError={setError} config={config}
            handleGatekeeperUnlock={(e, override) => handleGatekeeperUnlock(e, blockedApp, setConfig, override)}
            closeWindow={async () => { await releaseApp(); }}
          />
        )}
      </AnimatePresence>

      <ConfirmModals
        appName={APP_NAME}
        appToRemove={appToRemove} setAppToRemove={setAppToRemove}
        onConfirmRemoval={() => confirmRemoval(lockedApps, setLockedApps, triggerToast, setError)}
        appsToBulkUnlock={appsToBulkUnlock} setAppsToBulkUnlock={setAppsToBulkUnlock}
        onConfirmBulkUnlock={() => confirmBulkUnlock(lockedApps, setLockedApps, triggerToast, setError)}
        showResetConfirm={showResetConfirm} setShowResetConfirm={setShowResetConfirm}
        showResetFinal={showResetFinal} setShowResetFinal={setShowResetFinal}
        onReset={async () => { await resetApp(); window.location.reload(); }}
      />
    </div>
  );
}

export default App;
