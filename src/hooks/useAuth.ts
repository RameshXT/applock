import { useState, Dispatch, SetStateAction } from "react";
import { View, AuthMode, AppConfig } from "../types";
import { setupPassword, verifyPassword, verifyGatekeeper, getConfig } from "../services/auth.service";

interface UseAuthResult {
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  gatekeeperPIN: string;
  setGatekeeperPIN: Dispatch<SetStateAction<string>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  isCompleting: boolean;
  completingStep: number;
  handleSetup: (
    e: React.FormEvent,
    authMode: AuthMode,
    isUpdatingFromSettings: boolean,
    setView: Dispatch<SetStateAction<View | null>>,
    setIsUpdatingFromSettings: Dispatch<SetStateAction<boolean>>,
    setShowUpdateSuccess: Dispatch<SetStateAction<boolean>>
  ) => Promise<void>;
  handleUnlock: (
    e: React.FormEvent,
    view: View | null,
    setView: Dispatch<SetStateAction<View | null>>,
    passwordOverride?: string
  ) => Promise<void>;
  handleGatekeeperUnlock: (
    e: React.FormEvent,
    blockedApp: unknown,
    setConfig: Dispatch<SetStateAction<AppConfig>>,
    passwordOverride?: string
  ) => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gatekeeperPIN, setGatekeeperPIN] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completingStep, setCompletingStep] = useState(0);

  const handleSetup = async (
    e: React.FormEvent,
    authMode: AuthMode,
    isUpdatingFromSettings: boolean,
    setView: Dispatch<SetStateAction<View | null>>,
    setIsUpdatingFromSettings: Dispatch<SetStateAction<boolean>>,
    setShowUpdateSuccess: Dispatch<SetStateAction<boolean>>
  ) => {
    e.preventDefault();
    if (authMode === "PIN" && !/^\d{4}$/.test(password)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await setupPassword(password, authMode);
      setError(null);
      if (isUpdatingFromSettings) {
        setShowUpdateSuccess(true);
        setView("dashboard");
        setIsUpdatingFromSettings(false);
        setTimeout(() => setShowUpdateSuccess(false), 3000);
      } else {
        setIsCompleting(true);
        const messages = ["Great! You're all set.", "We're preparing your perimeter..", "One moment..", "Here we go!"];
        for (let i = 0; i < messages.length; i++) {
          setCompletingStep(i);
          await new Promise(r => setTimeout(r, 1400));
        }
        setView("dashboard");
        setIsCompleting(false);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleUnlock = async (
    e: React.FormEvent,
    view: View | null,
    setView: Dispatch<SetStateAction<View | null>>,
    passwordOverride?: string
  ) => {
    if (e) e.preventDefault();
    const passwordToVerify = passwordOverride || password;
    try {
      const isValid = await verifyPassword(passwordToVerify);
      if (isValid) {
        setView(view === "verify" ? "setup" : "dashboard");
        setError(null);
        setPassword("");
      } else {
        setError("Invalid security credentials");
        setPassword("");
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleGatekeeperUnlock = async (
    e: React.FormEvent,
    blockedApp: unknown,
    setConfig: Dispatch<SetStateAction<AppConfig>>,
    passwordOverride?: string
  ) => {
    if (e) e.preventDefault();
    const pinToVerify = passwordOverride || gatekeeperPIN;
    if (!blockedApp) return;
    try {
      const isValid = await verifyGatekeeper(pinToVerify);
      if (isValid) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        getCurrentWindow().close();
      } else {
        const cfg = await getConfig();
        setConfig(cfg);
        setError("Invalid security credentials");
        setGatekeeperPIN("");
      }
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setGatekeeperPIN("");
      const cfg = await getConfig().catch(() => null);
      if (cfg) setConfig(cfg);
    }
  };

  return {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    gatekeeperPIN, setGatekeeperPIN,
    error, setError,
    isCompleting, completingStep,
    handleSetup, handleUnlock, handleGatekeeperUnlock,
  };
}
