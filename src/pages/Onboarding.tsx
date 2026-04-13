import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Layout,
  AlertCircle
} from "lucide-react";
import styles from "../styles/Onboarding.module.css";
import logo from "../assets/logo.png";
import { AppConfig, AuthMode, InstalledApp } from "../types";
import { FinalizeProgressUI } from "../components/onboarding/FinalizeProgressUI";
import { OnboardingPayload, CredentialType } from "../services/onboardingFinalizerService";

interface OnboardingProps {
  appName: string;
  config: AppConfig;
  allApps: InstalledApp[];
  onComplete: () => void;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  fetchDetailedApps: () => Promise<void>;
  isScanning: boolean;
}

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  length: number;
  showPassword?: boolean;
  onComplete?: () => void;
  onBackspaceEmpty?: () => void;
  onFocused?: () => void;
  isFocused?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(({
  value,
  onChange,
  length,
  showPassword,
  onComplete,
  onBackspaceEmpty,
  onFocused,
  isFocused,
  error,
  autoFocus
}, ref) => {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && value.length === 0 && onBackspaceEmpty) {
      onBackspaceEmpty();
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
    if (onFocused) onFocused();
  };

  return (
    <div className={styles.pinEntryContainer}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onFocus={onFocused}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, length);
          onChange(val);
          if (val.length === length && onComplete) {
            onComplete();
          }
        }}
        className={styles.hiddenInput}
      />
      <div className={styles.pinCells} onClick={handleContainerClick}>
        {Array.from({ length }).map((_, i) => {
          const isCellFocused = isFocused && value.length === i;
          const isFilled = value.length > i;
          
          return (
            <motion.div
              key={`${length}-${i}`}
              animate={{ 
                scale: isCellFocused ? 1.05 : 1,
                borderColor: error ? "rgba(239, 68, 68, 0.5)" : (isCellFocused ? "var(--accent-color)" : (isFilled ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.08)")),
                backgroundColor: error ? "rgba(239, 68, 68, 0.05)" : (isCellFocused ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.03)")
              }}
              className={`${styles.pinCell} ${isCellFocused ? styles.pinCellActive : ""} ${isFilled ? styles.pinCellFilled : ""}`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {value[i] ? (
                  <motion.span
                    key={`char-${i}-${value[i]}`}
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {showPassword ? value[i] : "•"}
                  </motion.span>
                ) : (
                  isCellFocused && (
                    <motion.div
                      key="cursor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className={styles.pinCursor}
                    />
                  )
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export const Onboarding = ({
  appName,
  config,
  allApps,
  onComplete,
  fetchDetailedApps,
  isScanning
}: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Auth State
  const [securityType, setSecurityType] = useState<AuthMode | null>(null);
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activePinField, setActivePinField] = useState<'master' | 'confirm'>('master');
  
  // App Selection & Preferences
  const [preferences, setPreferences] = useState({
    autostart: config.autostart ?? true,
    minimize_to_tray: config.minimize_to_tray ?? true,
    lock_applock: config.strict_enforcement ?? true
  });
  const [search, setSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [showFinalize, setShowFinalize] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // Centralized Focus Management
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        if (activePinField === 'master') {
          inputRef.current?.focus();
        } else {
          confirmRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, activePinField, securityType, pinLength]);

  // Load detailed apps when reaching step 5
  useEffect(() => {
    if (step === 5) {
      fetchDetailedApps();
    }
  }, [step, fetchDetailedApps]);

  // Auto-advance PIN flow removed as per user request
  // useEffect(() => { ... })

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleNext();
      } else if (e.key === "Escape") {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, securityType, password, confirmPassword, showFinalize, activePinField]);

  const handleNext = async () => {
    if (showFinalize) return;
    setError(null);

    // Validation per step
    if (step === 2 && !securityType) {
      setError("Please select a security method");
      return;
    }

    if (step === 3) {
      if (!password || !confirmPassword) {
        setError("Please complete both fields");
        return;
      }
      if (password !== confirmPassword) {
        setError(securityType === "PIN" ? "PINs do not match" : "Passwords do not match");
        return;
      }
      if (securityType === "PIN" && password.length !== pinLength) {
        setError(`PIN must be exactly ${pinLength} digits`);
        return;
      }
      if (securityType === "Password") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setError("Password must contain at least one uppercase letter");
          return;
        }
      }
    }

    if (step === 5) {
      setShowFinalize(true);
      return;
    }

    if (step === 6) {
      onComplete();
      return;
    }

    setDirection(1);
    setStep(s => s + 1);
  };

  const buildPayload = (): OnboardingPayload => ({
    raw_credential: password,
    cred_type: securityType === "PIN" ? CredentialType.PIN : CredentialType.Password,
    locked_apps: allApps
      .filter(app => app.path && selectedApps.includes(app.path))
      .map(app => ({
        app_id: Math.random().toString(36).substring(2, 9),
        exe_path: app.path || "",
        display_name: app.name
      })),
    settings: {
      autostart_enabled: preferences.autostart,
      minimize_to_tray: preferences.minimize_to_tray,
      dashboard_lock_enabled: preferences.lock_applock,
      app_grace_secs: 15,
      dashboard_grace_secs: 300,
      max_failed_attempts: 3,
      theme: "dark",
      notify_on_lock: true,
      notify_on_unlock: true,
      notify_on_fail: true,
    }
  });

  const handleSkip = () => {
    setShowFinalize(true);
  };

  const handleBack = () => {
    if (showFinalize) return;
    setError(null);
    
    if (step === 3 && activePinField === 'confirm') {
      setActivePinField('master');
      setConfirmPassword("");
      return;
    }
    
    if (step > 1) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const calculateProgress = () => (step / 6) * 100;

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { score: 0, text: "", color: "transparent" };
    
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score === 1) return { score: 1, text: "Weak", color: "#ff5c5c" };
    if (score === 2) return { score: 2, text: "Medium", color: "#f59e0b" };
    if (score === 3) return { score: 3, text: "Strong", color: "#22c55e" };
    return { score: 0, text: "Invalid", color: "#ff5c5c" };
  };

  const strength = getPasswordStrength(password);

  const filteredApps = allApps.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    (app.path?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const toggleAppSelection = (path: string | null) => {
    if (!path) return;
    setSelectedApps(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
      filter: "blur(10px)"
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)"
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 30 : -30,
      opacity: 0,
      filter: "blur(10px)"
    })
  };

  return (
    <div className={styles.container}>
      {showFinalize && (
        <FinalizeProgressUI 
          payload={buildPayload()}
          onSuccess={() => {
            setShowFinalize(false);
            setDirection(1);
            setStep(6);
          }}
          onCancel={() => setShowFinalize(false)}
        />
      )}
      {/* Progress Bar */}
      <div className={styles.progressBarContainer}>
        <motion.div
          className={styles.progressBar}
          initial={{ width: 0 }}
          animate={{ width: `${calculateProgress()}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Navigation Buttons */}
      <AnimatePresence>
        {step > 1 && step < 6 && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.backBtn}
            onClick={handleBack}
            disabled={showFinalize}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className={styles.onboardingWrapper}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={styles.screen}
          >
            {/* Step 1: Welcome */}
            {step === 1 && (
              <>
                <div className={styles.onboardingHeader}>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={styles.heroIconWrapper}
                  >
                    <div className={styles.heroIconGlow} />
                    <div className={styles.heroIconContainer}>
                      <img src={logo} alt="AppLock Logo" style={{ width: 140, height: 140, objectFit: "contain" }} />
                    </div>
                  </motion.div>
                  <div className={styles.titleWrapper}>
                    <h1 className={styles.title}>{appName}</h1>
                    <div className={styles.titleGlow} />
                  </div>
                  <p className={styles.subtitle}>Precision Privacy for Windows</p>
                </div>

                <div className={styles.actions}>
                  <button className={styles.nextBtn} onClick={handleNext}>
                    <span>Get Started</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Auth Type */}
            {step === 2 && (
              <>
                <div className={styles.header}>
                  <h2 className={styles.title}>Secure Your Apps</h2>
                  <p className={styles.subtitle}>Choose how you want to unlock your protected applications.</p>
                </div>

                <div className={styles.choiceGrid}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${styles.choiceCard} ${securityType === "PIN" ? styles.choiceCardActive : ""}`}
                    onClick={() => { setSecurityType("PIN"); setError(null); }}
                  >
                    <div className={styles.choiceIcon}><Zap size={24} /></div>
                    <span className={styles.choiceTitle}>4-Digit PIN</span>
                    <p className={styles.toggleDesc}>Fast and convenient for daily use.</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${styles.choiceCard} ${securityType === "Password" ? styles.choiceCardActive : ""}`}
                    onClick={() => { setSecurityType("Password"); setError(null); }}
                  >
                    <div className={styles.choiceIcon}><Shield size={24} /></div>
                    <span className={styles.choiceTitle}>Alphanumeric</span>
                    <p className={styles.toggleDesc}>Maximum security for ultimate protection.</p>
                  </motion.div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.nextBtn}
                    onClick={handleNext}
                    disabled={!securityType}
                  >
                    <span>Set {securityType === "Password" ? "Password" : "PIN"}</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Setup Credential */}
            {step === 3 && (
              <>
                <div className={styles.header}>
                  <h2 className={styles.title}>Set Your {securityType || "Security"}</h2>
                  <p className={styles.subtitle}>
                    {securityType === "PIN"
                      ? `Create your ${pinLength}-digit access code.`
                      : "Create a strong master password for your vault."}
                  </p>
                </div>

                <div className={styles.content}>
                  {securityType === "PIN" && (
                    <div className={styles.lengthToggle}>
                      <div
                        className={styles.lengthSlider}
                        style={{ transform: `translateX(${pinLength === 4 ? "0" : "100"}%)` }}
                      />
                      <button
                        className={`${styles.lengthBtn} ${pinLength === 4 ? styles.lengthBtnActive : ""}`}
                        onClick={() => { setPinLength(4); setPassword(""); setConfirmPassword(""); setError(null); setActivePinField('master'); }}
                      >4 Digits</button>
                      <button
                        className={`${styles.lengthBtn} ${pinLength === 6 ? styles.lengthBtnActive : ""}`}
                        onClick={() => { setPinLength(6); setPassword(""); setConfirmPassword(""); setError(null); setActivePinField('master'); }}
                      >6 Digits</button>
                    </div>
                  )}

                  <div className={styles.inputField}>
                    <label>Master {securityType || "Security"}</label>
                    {securityType === "PIN" ? (
                      <PinInput
                        autoFocus
                        ref={inputRef}
                        value={password}
                        onChange={(v) => { setPassword(v); setError(null); }}
                        length={pinLength}
                        isFocused={activePinField === 'master'}
                        showPassword={showPassword}
                        onFocused={() => setActivePinField('master')}
                        onComplete={() => setActivePinField('confirm')}
                        error={!!error && activePinField === 'master'}
                      />
                    ) : (
                      <div className={styles.inputWrapper}>
                        <input
                          ref={inputRef}
                          type={showPassword ? "text" : "password"}
                          placeholder={`Enter ${securityType || "Security"}...`}
                          value={password}
                          autoFocus
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          onFocus={() => setActivePinField('master')}
                          onKeyDown={(e) => e.key === "Enter" && setActivePinField('confirm')}
                        />
                        <button
                          className={styles.inputIcon}
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    )}
                    {securityType === "Password" && password.length > 0 && (
                      <div className={styles.strengthContainer}>
                        <div className={styles.strengthBar}>
                          <div
                            className={styles.strengthProgress}
                            style={{
                              width: `${(strength.score / 3) * 100}%`,
                              backgroundColor: strength.color
                            }}
                          />
                        </div>
                        <span className={styles.strengthText} style={{ color: strength.color }}>
                          {strength.text}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.inputField}>
                    <label>Confirm {securityType || "Security"}</label>
                    {securityType === "PIN" ? (
                      <PinInput
                        ref={confirmRef}
                        value={confirmPassword}
                        onChange={(v) => { setConfirmPassword(v); setError(null); }}
                        length={pinLength}
                        isFocused={activePinField === 'confirm'}
                        showPassword={showPassword}
                        onFocused={() => setActivePinField('confirm')}
                        onBackspaceEmpty={() => {
                          setActivePinField('master');
                          setError(null);
                        }}
                        error={!!error && activePinField === 'confirm'}
                      />
                    ) : (
                      <div className={styles.inputWrapper}>
                        <input
                          ref={confirmRef}
                          type={showPassword ? "text" : "password"}
                          placeholder={`Confirm ${securityType || "Security"}...`}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                          onFocus={() => setActivePinField('confirm')}
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                        />
                        <div className={styles.inputIcon}>
                          {password === confirmPassword && password.length > 0 ? (
                            <Check size={20} className={styles.checkIcon} />
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={styles.errorText}
                      >
                        <AlertCircle size={14} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.nextBtn}
                    onClick={handleNext}
                    disabled={
                      !password ||
                      password !== confirmPassword ||
                      (securityType === "PIN" && password.length !== pinLength) ||
                      (securityType === "Password" && (password.length < 8 || !/[A-Z]/.test(password)))
                    }
                  >
                    <span>Continue</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Preferences */}
            {step === 4 && (
              <>
                <div className={styles.header}>
                  <h2 className={styles.title}>Setup Preferences</h2>
                  <p className={styles.subtitle}>Fine-tune how {appName} behaves on your system.</p>
                </div>

                <div className={styles.toggleList}>
                  {[
                    { key: 'autostart', icon: Zap, label: 'Auto Start', desc: 'Launch automatically with Windows.' },
                    { key: 'minimize_to_tray', icon: Layout, label: 'System Tray', desc: 'Keep running in the background tray.' },
                    { key: 'lock_applock', icon: Shield, label: 'Lock AppLock', desc: 'Lock this dashboard itself.' }
                  ].map((pref) => (
                    <div key={pref.key} className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <pref.icon size={20} className={styles.checkIcon} />
                        <div className={styles.toggleLabel}>
                          <span className={styles.toggleName}>{pref.label}</span>
                          <span className={styles.toggleDesc}>{pref.desc}</span>
                        </div>
                      </div>
                      <div
                        className={`${styles.toggleSwitch} ${preferences[pref.key as keyof typeof preferences] ? styles.toggleSwitchEnabled : ""}`}
                        onClick={() => setPreferences(p => ({ ...p, [pref.key]: !p[pref.key as keyof typeof preferences] }))}
                      >
                        <div className={styles.toggleThumb} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button className={styles.nextBtn} onClick={handleNext}>
                    <span>Apply Preferences</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 5: Apps Selection */}
            {step === 5 && (
              <>
                <div className={styles.header}>
                  <h2 className={styles.title}>Lock Your First App</h2>
                  <p className={styles.subtitle}>Pick at least one application to protect right now.</p>
                </div>

                <div className={styles.content}>
                  <div className={styles.appSearchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                      className={styles.searchInput}
                      type="text"
                      placeholder="Search installed apps..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className={styles.appListScroll}>
                    {isScanning ? (
                      <div className={styles.loadingContainer}>
                        <div className={styles.premiumLoader} />
                        <p className={styles.toggleDesc}>Scanning your system for apps...</p>
                      </div>
                    ) : (
                      <>
                        {filteredApps.map(app => (
                          <motion.div
                            key={app.path || app.name}
                            whileHover={{ x: 4 }}
                            className={`${styles.appItem} ${app.path && selectedApps.includes(app.path) ? styles.appItemSelected : ""}`}
                            onClick={() => toggleAppSelection(app.path)}
                          >
                            {app.icon ? (
                              <img src={app.icon} className={styles.appItemIcon} alt="" />
                            ) : (
                              <div className={styles.appItemIcon}><Layout size={20} /></div>
                            )}
                            <span className={styles.appItemName}>{app.name}</span>
                            {app.path && selectedApps.includes(app.path) && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <Check size={18} className={styles.checkIcon} />
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                        {filteredApps.length === 0 && (
                          <p className={styles.toggleDesc}>No apps found matching your search.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.actions}>
                  <button
                    className={styles.nextBtn}
                    onClick={handleNext}
                    disabled={selectedApps.length === 0 || showFinalize}
                  >
                    <span>{showFinalize ? "Saving..." : `Lock ${selectedApps.length} Apps`}</span>
                  </button>
                  <button className={styles.skipBtn} onClick={handleSkip} disabled={showFinalize}>
                    Skip for now
                  </button>
                </div>
              </>
            )}

            {/* Step 6: Success */}
            {step === 6 && (
              <>
                <div className={styles.header}>
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className={styles.successCheck}
                  >
                    <Check size={40} />
                  </motion.div>
                  <h2 className={styles.title}>All Secured!</h2>
                  <p className={styles.subtitle}>Your privacy shield is now fully active.</p>
                </div>

                <div className={styles.summary}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Auth Mode</span>
                    <span className={styles.summaryValue}>{securityType === "PIN" ? `${pinLength}-Digit PIN` : "Password"}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Apps locked</span>
                    <span className={styles.summaryValue}>{selectedApps.length}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className={styles.nextBtn} onClick={handleNext}>
                    <span>Go to Dashboard</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};