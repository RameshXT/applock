import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Search, ShieldCheck, ArrowRight, LogOut, Settings, User, Monitor, RotateCcw, Home, CheckSquare, Square, Trash2, X, MousePointer2, Bug, Lightbulb, FileText, GitPullRequest, Heart, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import clsx from "clsx";
import styles from "../styles/App.module.css";
import logo from "../assets/logo.png";
import { Tab, InstalledApp, LockedApp, AppConfig, AuthMode } from "../types";
import { ModernSelect } from "../components/ModernSelect";
import { GithubIcon } from "../components/GithubIcon";

interface DashboardProps {
  appName: string;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showUpdateSuccess: boolean;
  toast: { message: string, visible: boolean, type: 'lock' | 'unlock' | 'success' };
  search: string;
  setSearch: (val: string) => void;
  placeholder: string;
  handleLockSession: () => void;
  isScanning: boolean;
  allApps: InstalledApp[];
  lockedApps: LockedApp[];
  toggleApp: (app: LockedApp | InstalledApp, fromTab?: Tab) => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  setView: (view: any) => void;
  setIsUpdatingFromSettings: (val: boolean) => void;
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  setShowResetConfirm: (val: boolean) => void;
  bulkUnlock: (apps: LockedApp[]) => void;
  refreshApps: () => void;
}

export const Dashboard = ({
  appName,
  activeTab,
  setActiveTab,
  showUpdateSuccess,
  toast,
  search,
  setSearch,
  placeholder,
  handleLockSession,
  isScanning,
  allApps,
  lockedApps,
  toggleApp,
  settingsTab,
  setSettingsTab,
  authMode,
  setAuthMode,
  setView,
  setIsUpdatingFromSettings,
  config,
  updateConfig,
  setShowResetConfirm,
  bulkUnlock,
  refreshApps
}: DashboardProps) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const toggleSelection = (name: string) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) newSelected.delete(name);
    else newSelected.add(name);
    setSelectedNames(newSelected);
  };

  const handleBulkUnlock = () => {
    const appsToUnlock = lockedApps.filter(app => selectedNames.has(app.name));
    bulkUnlock(appsToUnlock);
    setSelectionMode(false);
    setSelectedNames(new Set());
  };

  const appsToShow = useMemo(() => {
    const list = activeTab === "all" ? lockedApps : allApps;
    return list.filter(app => app.name.toLowerCase().includes(search.toLowerCase()));
  }, [activeTab, lockedApps, allApps, search]);
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={styles.dashboard}
    >
      <header className={styles.header}>
        <AnimatePresence>
          {(showUpdateSuccess || toast.visible) && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={clsx(styles.successToast, toast.type === 'lock' && styles.toastLock, toast.type === 'unlock' && styles.toastUnlock)}
            >
              {toast.type === 'lock' && <Lock size={16} />}
              {toast.type === 'unlock' && <Unlock size={16} />}
              {toast.type === 'success' && <img src={logo} style={{ width: 16, height: 16, objectFit: 'contain' }} alt="" />}
              <span>{toast.visible ? toast.message : "Credentials Updated Successfully"}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={styles.headerTitleGroup}>
          <img src={logo} className={styles.headerLogo} alt={`${appName} Logo`} />
        </div>

        <div className={styles.tabs}>
          <button className={clsx(styles.tab, activeTab === "home" && styles.tabActive)} onClick={() => setActiveTab("home")}>
            <Home size={18} /> <span>Home</span>
          </button>
          <button className={clsx(styles.tab, activeTab === "system" && styles.tabActive)} onClick={() => setActiveTab("system")}>
            <Unlock size={18} /> <span>Unlocked Apps</span>
          </button>
          <button className={clsx(styles.tab, activeTab === "all" && styles.tabActive)} onClick={() => setActiveTab("all")}>
            <Lock size={18} /> <span>Locked Apps</span>
          </button>
          <button className={clsx(styles.tab, activeTab === "settings" && styles.tabActive)} onClick={() => setActiveTab("settings")}>
            <Settings size={18} /> <span>Settings</span>
          </button>
        </div>

        <div className={styles.headerActions}>
          {activeTab !== "settings" && activeTab !== "home" && (
            <div className={styles.searchBar}>
              <Search size={16} color="var(--text-secondary)" />
              <input
                placeholder={`Search ${placeholder}|`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {activeTab !== "settings" && activeTab !== "home" && (
            <button 
              className={clsx(styles.refreshBtn, isScanning && styles.refreshBtnRotating)} 
              onClick={refreshApps} 
              title="Refresh App List"
              disabled={isScanning}
            >
              <RotateCcw size={18} />
            </button>
          )}

          <button className={styles.logoutBtn} onClick={handleLockSession} title="Lock Session">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className={styles.listDivider}>
        <div className={styles.dividerLine} />
        {(activeTab === "all" || activeTab === "system") && !isScanning && (() => {
          const count = appsToShow.length;
          return (
            <div className={styles.dividerControls}>
              <span className={styles.dividerText}>
                {count === 0 ? "No Apps Found" : `${count} ${count === 1 ? "App" : "Apps"} Found`}
              </span>
              {activeTab === "all" && count > 0 && (
                <button
                  className={clsx(styles.selectionToggle, selectionMode && styles.selectionToggleActive)}
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedNames(new Set());
                  }}
                >
                  {selectionMode ? <X size={14} /> : <MousePointer2 size={14} />}
                  {selectionMode ? "Cancel" : "Select"}
                </button>
              )}
            </div>
          )
        })()}
        {(activeTab === "all" || activeTab === "system") && !isScanning && <div className={styles.dividerLine} />}
      </div>

      <main className={styles.mainScrollArea}>
        {activeTab === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={styles.homeMinimal}
          >
            <div className={styles.homeStatusSection}>
              <div className={styles.statusCircle}>
                <img src={logo} style={{ width: 64, height: 64, objectFit: 'contain' }} alt="" />
              </div>
              <div className={styles.statusInfo}>
                <h2 className={styles.statusTitle}>{appName} Active</h2>
                <p className={styles.statusSubtitle}>System perimeter is currently secured</p>
              </div>
            </div>

            <div className={styles.minimalStats}>
              <div className={styles.minStat}>
                {isScanning ? <div className={styles.skeletonValue} /> : <span className={styles.minStatValue}>{allApps.length}</span>}
                <span className={styles.minStatLabel}>Total Apps</span>
              </div>
              <div className={styles.minStatDivider} />
              <div className={styles.minStat}>
                {isScanning ? <div className={styles.skeletonValue} /> : <span className={styles.minStatValue} style={{ color: "var(--accent-color)" }}>{lockedApps.length}</span>}
                <span className={styles.minStatLabel}>Locked</span>
              </div>
            </div>

            <button className={styles.minimalAction} onClick={() => setActiveTab("system")}>
              Manage Protection <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : activeTab === "settings" ? (
          <div className={styles.settingsContainer}>
            <aside className={styles.settingsSidebar}>
              <button className={clsx(styles.settingsNavBtn, settingsTab === "account" && styles.settingsNavBtnActive)} onClick={() => setSettingsTab("account")}>
                <User size={18} /> Account & Setup
              </button>
              <button className={clsx(styles.settingsNavBtn, settingsTab === "security" && styles.settingsNavBtnActive)} onClick={() => setSettingsTab("security")}>
                <ShieldCheck size={18} color="#888" /> Security Policy
              </button>
              <button className={clsx(styles.settingsNavBtn, settingsTab === "system" && styles.settingsNavBtnActive)} onClick={() => setSettingsTab("system")}>
                <Monitor size={18} /> System & Style
              </button>
              <button className={clsx(styles.settingsNavBtn, settingsTab === "contribution" && styles.settingsNavBtnActive)} onClick={() => setSettingsTab("contribution")}>
                <GithubIcon size={18} /> Contribution
              </button>
              <div style={{ flex: 1 }} />
              <button className={styles.dangerBtnMinimal} onClick={() => setShowResetConfirm(true)}>
                <RotateCcw size={18} /> Factory Reset
              </button>
            </aside>

            <div className={styles.settingsContent}>
              {settingsTab === "account" && (
                <section className={styles.settingsGroup}>
                  <div className={styles.settingsHeader}>
                    <h2>Account & Setup</h2>
                    <p>Manage your entry protocol and core identity.</p>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Display Identity</span>
                      <span>Your public name shown on the lock screen.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <input 
                        type="text" 
                        className={styles.settingsInput} 
                        style={{ maxWidth: '220px' }}
                        placeholder="Display Name"
                        value={config.display_name || ""}
                        onChange={(e) => updateConfig({ display_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Authentication Mode</span>
                      <span>Choose between a numeric PIN or a text password.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.pillSwitch}>
                        <button className={clsx(styles.pillSwitchBtn, authMode === "PIN" && styles.pillSwitchBtnActive)} onClick={() => setAuthMode("PIN")}>PIN</button>
                        <button className={clsx(styles.pillSwitchBtn, authMode === "Password" && styles.pillSwitchBtnActive)} onClick={() => setAuthMode("Password")}>Password</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Security Credential</span>
                      <span>Update your {authMode} to keep your {appName} secure.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <button className={styles.iconBtn} onClick={() => { setIsUpdatingFromSettings(true); setView("setup"); }}>Update {authMode}</button>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Security Recovery</span>
                      <span>Setup a hint or key to recover access if forgotten.</span>
                    </div>
                    <div className={styles.settingControl} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '220px' }}>
                      <input 
                        type="text" 
                        className={styles.settingsInput} 
                        placeholder="Recovery Hint"
                        value={config.recovery_hint || ""}
                        onChange={(e) => updateConfig({ recovery_hint: e.target.value })}
                      />
                      <button 
                        className={styles.checkBtn} 
                        style={{ width: '100%', fontSize: '0.7rem' }}
                        onClick={() => {
                          const key = Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                          updateConfig({ recovery_key: key });
                          alert(`Your Recovery Key is: ${key}\n\nPLEASE SAVE THIS SOMEWHERE SAFE!`);
                        }}
                      >
                        {config.recovery_key ? "Regenerate Key" : "Generate Key"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Biometric Login <span className={styles.comingSoonBadge}>Coming Soon</span></span>
                      <span>Use Windows Hello (Fingerprint/Face) to unlock.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.pillSwitch} style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Windows Hello support coming soon">
                        <button className={clsx(styles.pillSwitchBtn)} disabled>ON</button>
                        <button className={clsx(styles.pillSwitchBtn, styles.pillSwitchBtnActive)} disabled>OFF</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Data & Portability <span className={styles.comingSoonBadge}>Coming Soon</span></span>
                      <span>Export or import your entire configuration.</span>
                    </div>
                    <div className={styles.settingControl} style={{ display: 'flex', gap: '0.75rem', opacity: 0.5 }}>
                       <button className={styles.iconBtn} disabled style={{ cursor: 'not-allowed' }}>Export Config</button>
                       <button className={styles.iconBtn} disabled style={{ cursor: 'not-allowed' }}>Import Config</button>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Security Audit</span>
                      <span>Last Changed: {config.last_credential_change ? new Date(config.last_credential_change).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
                </section>
              )}

              {settingsTab === "security" && (
                <section className={styles.settingsGroup}>
                  <div className={styles.settingsHeader}>
                    <h2>Security Policy</h2>
                    <p>Configure how {appName} responds to intrusions.</p>
                  </div>
                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Idle Lock</span>
                      <span>Lock the dashboard automatically if you are away.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <ModernSelect
                        value={String(config.auto_lock_duration || 0)}
                        onChange={(val) => updateConfig({ auto_lock_duration: parseInt(val) })}
                        options={[
                          { label: "Never", value: "0" },
                          { label: "5 Minutes", value: "5" },
                          { label: "15 Minutes", value: "15" },
                          { label: "30 Minutes", value: "30" },
                          { label: "1 Hour", value: "60" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Emergency Lock</span>
                      <span>Press <code>Ctrl+Alt+L</code> to instantly lock everything.</span>
                    </div>
                    <div className={styles.settingControl}>
                       <span className={styles.statusPill}>Active</span>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Quick Re-entry</span>
                      <span>Skip PIN if an app is reopened within a short time.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <ModernSelect
                        value={String(config.grace_period || 0)}
                        onChange={(val) => updateConfig({ grace_period: parseInt(val) })}
                        options={[
                          { label: "Off", value: "0" },
                          { label: "15 Seconds", value: "15" },
                          { label: "30 Seconds", value: "30" },
                          { label: "1 Minute", value: "60" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Lock on Exit</span>
                      <span>Instantly lock the app when you close it.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.pillSwitch}>
                        <button 
                          className={clsx(styles.pillSwitchBtn, config.immediate_relock && styles.pillSwitchBtnActive)}
                          onClick={() => updateConfig({ immediate_relock: true })}
                        >
                          ON
                        </button>
                        <button 
                          className={clsx(styles.pillSwitchBtn, !config.immediate_relock && styles.pillSwitchBtnActive)}
                          onClick={() => updateConfig({ immediate_relock: false })}
                        >
                          OFF
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Advanced Protection</span>
                      <span>Enhanced monitoring and persistence guard.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.pillSwitch}>
                        <button 
                          className={clsx(styles.pillSwitchBtn, (config.strict_enforcement || config.protection_persistence) && styles.pillSwitchBtnActive)}
                          onClick={() => updateConfig({ strict_enforcement: true, protection_persistence: true })}
                        >
                          ON
                        </button>
                        <button 
                          className={clsx(styles.pillSwitchBtn, !(config.strict_enforcement || config.protection_persistence) && styles.pillSwitchBtnActive)}
                          onClick={() => updateConfig({ strict_enforcement: false, protection_persistence: false })}
                        >
                          OFF
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Safety Lockout</span>
                      <span>Configures automatic cooldown after failed attempts.</span>
                    </div>
                    <div className={styles.settingControl} style={{ display: 'flex', gap: '0.75rem' }}>
                      <ModernSelect
                        value={String(config.attempt_limit)}
                        onChange={(val) => updateConfig({ attempt_limit: parseInt(val) })}
                        options={[{ label: "3 Failed", value: "3" }, { label: "5 Failed", value: "5" }]}
                      />
                      <ModernSelect
                        value={String(config.lockout_duration)}
                        onChange={(val) => updateConfig({ lockout_duration: parseInt(val) })}
                        options={[{ label: "30s Wait", value: "30" }, { label: "1m Wait", value: "60" }]}
                      />
                    </div>
                  </div>
                </section>
              )}

              {settingsTab === "system" && (
                <section className={styles.settingsGroup}>
                  <div className={styles.settingsHeader}>
                    <h2>System & Appearance</h2>
                    <p>Personalize your workspace and {appName} behavior.</p>
                  </div>
                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Launch at Startup</span>
                      <span>Automatically wake {appName} when Windows starts.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.miniToggle}>
                        <button className={clsx(config.autostart && styles.miniToggleActive)} onClick={() => updateConfig({ autostart: true })}>Enable</button>
                        <button className={clsx(!config.autostart && styles.miniToggleActive)} onClick={() => updateConfig({ autostart: false })}>Disable</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Background Behavior</span>
                      <span>Manage how {appName} stays active in your system.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.stackCheck}>
                        <button 
                          className={clsx(styles.checkBtn, config.minimize_to_tray && styles.checkBtnActive)}
                          onClick={() => updateConfig({ minimize_to_tray: !config.minimize_to_tray })}
                        >
                          {config.minimize_to_tray ? "Minimize to Tray" : "Standard Exit"}
                        </button>
                        <button 
                          className={clsx(styles.checkBtn, config.stealth_mode && styles.checkBtnActive)}
                          onClick={() => updateConfig({ stealth_mode: !config.stealth_mode })}
                        >
                          {config.stealth_mode ? "Taskbar Hidden" : "Taskbar Visible"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>Experience Quality</span>
                      <span>Optimize responsiveness and interaction feel.</span>
                    </div>
                    <div className={styles.settingControl}>
                       <div className={styles.miniToggle}>
                        <button className={clsx((config.animations_intensity === "high" || !config.animations_intensity) && styles.miniToggleActive)} onClick={() => updateConfig({ animations_intensity: "high" })}>Premium</button>
                        <button className={clsx(config.animations_intensity === "low" && styles.miniToggleActive)} onClick={() => updateConfig({ animations_intensity: "low" })}>Lite</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingLabel}>
                      <span>System Events</span>
                      <span>Automate security triggers based on system state.</span>
                    </div>
                    <div className={styles.settingControl}>
                      <div className={styles.stackCheck}>
                        <button 
                          className={clsx(styles.checkBtn, config.autolock_on_sleep && styles.checkBtnActive)}
                          onClick={() => updateConfig({ autolock_on_sleep: !config.autolock_on_sleep })}
                        >
                          {config.autolock_on_sleep ? "Auto-Lock on Sleep" : "Ignore Sleep"}
                        </button>
                        <button 
                          className={clsx(styles.checkBtn, (config.notifications_enabled || config.notifications_enabled === undefined) && styles.checkBtnActive)}
                          onClick={() => updateConfig({ notifications_enabled: !config.notifications_enabled })}
                        >
                          {(config.notifications_enabled || config.notifications_enabled === undefined) ? "Notifications On" : "Notifications Off"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {settingsTab === "contribution" && (
                <section className={styles.settingsGroup}>
                  <div className={styles.settingsHeader}>
                    <h2>Contribution</h2>
                    <p>{appName} is open source. Help us shape the future of privacy.</p>
                  </div>
                  
                  <div className={styles.contributionGrid}>
                    <a href="https://github.com/RameshXT/windows-applock/issues/new?template=bug_report.md" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribIcon}><Bug size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>Report a Bug</span>
                        <span className={styles.contribDesc}>Help us identify and squash technical issues.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>

                    <a href="https://github.com/RameshXT/windows-applock/issues/new?template=feature_request.md" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribBadge}>Popular</div>
                      <div className={styles.contribIcon}><Lightbulb size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>Request Feature</span>
                        <span className={styles.contribDesc}>Suggest new ideas to make AppLock better.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>

                    <a href="https://github.com/RameshXT/windows-applock/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribIcon}><FileText size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>Documentation</span>
                        <span className={styles.contribDesc}>Improve guides or clarify instructions.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>

                    <a href="https://github.com/RameshXT/windows-applock/pulls" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribIcon}><GitPullRequest size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>Pull Requests</span>
                        <span className={styles.contribDesc}>Submit code directly to the repository.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>

                    <a href="https://github.com/RameshXT/windows-applock/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribBadge}>Beginner</div>
                      <div className={styles.contribIcon}><Heart size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>First Contribution</span>
                        <span className={styles.contribDesc}>Find easy tasks curated for newcomers.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>

                    <a href="https://github.com/RameshXT/windows-applock" target="_blank" rel="noopener noreferrer" className={styles.contribCard}>
                      <div className={styles.contribIcon}><GithubIcon size={20} /></div>
                      <div className={styles.contribContent}>
                        <span className={styles.contribTitle}>Source Code</span>
                        <span className={styles.contribDesc}>Browse the official project repository.</span>
                      </div>
                      <ExternalLink size={14} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', opacity: 0.2 }} />
                    </a>
                  </div>

                  <div className={styles.workflowSection}>
                    <h3 className={styles.workflowTitle}>How it works</h3>
                    <div className={styles.workflowSteps}>
                      <div className={styles.workflowConnector} />
                      
                      <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>1</div>
                        <span className={styles.stepLabel}>Fork</span>
                        <span className={styles.stepDesc}>Copy repo</span>
                      </div>

                      <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>2</div>
                        <span className={styles.stepLabel}>Branch</span>
                        <span className={styles.stepDesc}>Create feature</span>
                      </div>

                      <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>3</div>
                        <span className={styles.stepLabel}>Push</span>
                        <span className={styles.stepDesc}>Commit code</span>
                      </div>

                      <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>4</div>
                        <span className={styles.stepLabel}>Merge</span>
                        <span className={styles.stepDesc}>Pull Request</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <footer className={styles.settingsFooter}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', opacity: 0.8, letterSpacing: '-0.01em' }}>{appName}</span>
                  <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem', 
                    fontWeight: 700, 
                    padding: '1px 6px',
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '4px',
                    color: 'var(--accent-color)',
                    textTransform: 'lowercase',
                    transform: 'translateY(-1px)' // Optical adjustment for baseline
                  }}>v1.0.4</span>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={12} color="#888" />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', opacity: 0.3 }}>VERIFIED</span>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                  <span style={{ opacity: 0.4 }}>Designed & Developed by</span>
                  <a href="https://rameshxt.pages.dev/" target="_blank" rel="noopener noreferrer" className={styles.developerLink}>Ramesh XT</a>
                </div>
              </footer>
            </div>
          </div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={styles.appListWrapper}>
            {isScanning ? (
              <div className={styles.emptyState}>
                <div className={styles.premiumLoader}>
                  <motion.div className={styles.loaderRing} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                  <img src={logo} style={{ width: 28, height: 28, objectFit: 'contain' }} className={styles.loaderIcon} alt="" />
                </div>
                <span className={styles.loaderText}>Scanning Workspace</span>
              </div>
            ) : (
              <div className={styles.appList}>
                {appsToShow.map(app => {
                  const isLocked = lockedApps.some(la => la.name === app.name);
                  const isSelected = selectedNames.has(app.name);

                  return (
                    <motion.div
                      layout
                      key={app.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      whileHover={{ y: -2 }}
                      className={clsx(
                        styles.appCard,
                        isLocked && styles.appCardLocked,
                        isSelected && styles.appCardSelected,
                        selectionMode && activeTab === "all" && styles.appCardSelectable
                      )}
                      onClick={() => {
                        if (selectionMode && activeTab === "all") {
                          toggleSelection(app.name);
                        } else {
                          toggleApp(app, activeTab);
                        }
                      }}
                    >
                      {selectionMode && activeTab === "all" && (
                        <div className={styles.selectionIndicator}>
                          {isSelected ? <CheckSquare size={18} color="var(--accent-color)" /> : <Square size={18} opacity={0.3} />}
                        </div>
                      )}
                      {isLocked && !selectionMode && <div className={styles.lockedBadge}><Lock size={8} /> LOCKED</div>}
                      <div className={styles.appIconContainer}>
                        {app.icon
                          ? <img src={app.icon} className={styles.appIconImg} alt="" />
                          : <div className={styles.appIconFallback}><Monitor size={20} opacity={isLocked ? 0.9 : 0.3} /></div>
                        }
                      </div>
                      <div className={styles.appInfo}>
                        <div className={styles.appName}>{app.name}</div>
                        <div className={styles.appPath}>{(app as any).exec_name || (app as any).path}</div>
                      </div>
                      <div className={styles.lockIndicator}>
                        {isLocked ? <Lock size={18} className={styles.lockedIcon} /> : <Unlock size={18} style={{ opacity: 0.2 }} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {selectionMode && selectedNames.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={styles.bulkActionBar}
          >
            <div className={styles.bulkActionInfo}>
              <span className={styles.selectionCount}>{selectedNames.size}</span>
              <span className={styles.selectionLabel}>Apps Selected</span>
            </div>
            <div className={styles.bulkActionButtons}>
              <button className={styles.bulkUnlockBtn} onClick={handleBulkUnlock}>
                <Trash2 size={16} /> Unlock Selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
