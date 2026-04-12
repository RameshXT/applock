import { useState, Dispatch, SetStateAction } from "react";
import { InstalledApp, LockedApp, Tab } from "../types";
import { saveSelection } from "../services/apps.service";

interface UseAppsResult {
  appToRemove: LockedApp | InstalledApp | null;
  setAppToRemove: Dispatch<SetStateAction<LockedApp | InstalledApp | null>>;
  appsToBulkUnlock: LockedApp[] | null;
  setAppsToBulkUnlock: Dispatch<SetStateAction<LockedApp[] | null>>;
  toggleApp: (
    app: LockedApp | InstalledApp,
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>,
    fromTab?: Tab
  ) => Promise<void>;
  confirmRemoval: (
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>
  ) => Promise<void>;
  bulkUnlock: (apps: LockedApp[]) => void;
  confirmBulkUnlock: (
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>
  ) => Promise<void>;
}

export function useApps(): UseAppsResult {
  const [appToRemove, setAppToRemove] = useState<LockedApp | InstalledApp | null>(null);
  const [appsToBulkUnlock, setAppsToBulkUnlock] = useState<LockedApp[] | null>(null);

  const toggleApp = async (
    app: LockedApp | InstalledApp,
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>,
    fromTab?: Tab
  ) => {
    const isLocked = lockedApps.some(la => la.name === app.name);
    if (isLocked) {
      if (fromTab === "all") {
        setAppToRemove(app);
        return;
      }
      const newLocked = lockedApps.filter(la => la.name !== app.name);
      setLockedApps(newLocked);
      try {
        await saveSelection(newLocked);
        triggerToast(`${app.name} Unlocked Successfully`, 'unlock');
      } catch (err) { setError(String(err)); }
      return;
    }

    const newLocked: LockedApp[] = [...lockedApps, {
      id: Math.random().toString(36).substring(2, 9),
      name: app.name,
      exec_name: (app as LockedApp).exec_name || (app as InstalledApp).path || "",
      icon: app.icon,
    }];
    setLockedApps(newLocked);
    try {
      await saveSelection(newLocked);
      triggerToast(`${app.name} Locked Successfully`, 'lock');
    } catch (err) { setError(String(err)); }
  };

  const confirmRemoval = async (
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>
  ) => {
    if (!appToRemove) return;
    const newLocked = lockedApps.filter(la => la.name !== appToRemove.name);
    const removedAppName = appToRemove.name;
    setLockedApps(newLocked);
    setAppToRemove(null);
    try {
      await saveSelection(newLocked);
      triggerToast(`${removedAppName} Unlocked Successfully`, 'unlock');
    } catch (err) { setError(String(err)); }
  };

  const bulkUnlock = (apps: LockedApp[]) => {
    setAppsToBulkUnlock(apps);
  };

  const confirmBulkUnlock = async (
    lockedApps: LockedApp[],
    setLockedApps: Dispatch<SetStateAction<LockedApp[]>>,
    triggerToast: (msg: string, type: 'lock' | 'unlock' | 'success') => void,
    setError: Dispatch<SetStateAction<string | null>>
  ) => {
    if (!appsToBulkUnlock) return;
    const namesToUnlock = new Set(appsToBulkUnlock.map(a => a.name));
    const newLocked = lockedApps.filter(la => !namesToUnlock.has(la.name));
    const count = appsToBulkUnlock.length;
    setLockedApps(newLocked);
    setAppsToBulkUnlock(null);
    try {
      await saveSelection(newLocked);
      triggerToast(`${count} Apps Unlocked Successfully`, 'unlock');
    } catch (err) { setError(String(err)); }
  };

  return {
    appToRemove, setAppToRemove,
    appsToBulkUnlock, setAppsToBulkUnlock,
    toggleApp, confirmRemoval, bulkUnlock, confirmBulkUnlock,
  };
}
