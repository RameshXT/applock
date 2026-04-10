import React, { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, AlertCircle, ArrowRight } from "lucide-react";
import clsx from "clsx";
import styles from "../styles/App.module.css";
import { AuthMode, LockedApp } from "../types";

interface GatekeeperProps {
  blockedApp: LockedApp | null;
  authMode: AuthMode;
  gatekeeperPIN: string;
  error: string | null;
  isLaunching: boolean;
  gatekeeperInputRef: RefObject<HTMLInputElement | null>;
  setGatekeeperPIN: (val: string) => void;
  setError?: (val: string | null) => void;
  handleGatekeeperUnlock: (e: React.FormEvent, override?: string) => void;
  closeWindow: () => void;
}

export const Gatekeeper = ({
  blockedApp,
  authMode,
  gatekeeperPIN,
  error,
  isLaunching,
  gatekeeperInputRef,
  setGatekeeperPIN,
  setError,
  handleGatekeeperUnlock,
  closeWindow
}: GatekeeperProps) => {
  return (
    <motion.div
      key="gatekeeper"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(styles.gatekeeperCard, styles.solidBg)}
    >
      <div className={styles.gatekeeperBrand}>
        <div className={styles.appLogoContainer}>
          {blockedApp?.icon ? <img src={blockedApp.icon} alt={blockedApp.name} className={styles.appLogo} /> : <Lock size={32} />}
        </div>
        <h2 className={styles.gatekeeperTitle}>{blockedApp?.name}</h2>
        <p className={styles.gatekeeperSubtitle}>Secure Authentication Required</p>
      </div>
      <form onSubmit={handleGatekeeperUnlock} className={styles.gatekeeperForm} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {isLaunching ? <div className={styles.launchingState}><div className={styles.spinner} /><span>Launching...</span></div> : (
          <>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              {authMode === "PIN" ? (
                <div className={styles.pinDisplayGroup}>
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={clsx(
                        styles.pinBox, 
                        error && styles.pinBoxError,
                        !error && gatekeeperPIN.length === i && styles.pinBoxActive, 
                        gatekeeperPIN.length > i && styles.pinBoxFilled
                      )}
                    >
                      {gatekeeperPIN.length > i ? "●" : ""}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <input 
                    ref={gatekeeperInputRef} 
                    type="password" 
                    className={clsx(styles.modernInput, error && styles.modernInputError)} 
                    placeholder="Enter Password" 
                    value={gatekeeperPIN} 
                    onChange={(e) => {
                      if (error) setError?.(null);
                      setGatekeeperPIN(e.target.value);
                    }} 
                  />
                  <motion.button
                    type="submit"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: gatekeeperPIN.length > 0 ? 1 : 0.5, y: 0, scale: gatekeeperPIN.length > 0 ? 1 : 0.98 }}
                    className={styles.unlockAction}
                    disabled={gatekeeperPIN.length === 0}
                  >
                    <span>Unlock App</span>
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, margin: 0 }}
                  animate={{ height: 'auto', opacity: 1, margin: '1.5rem 0' }}
                  exit={{ height: 0, opacity: 0, margin: 0 }}
                  style={{ overflow: 'hidden', width: '100%' }}
                >
                  <div className={styles.errorMessage} style={{ width: '100%' }}><AlertCircle size={14} /> {error}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {authMode === "PIN" && (
              <input
                ref={gatekeeperInputRef}
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={4}
                className={styles.hiddenInput}
                autoComplete="one-time-code"
                name="gatekeeper-pin-hidden"
                value={gatekeeperPIN}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (error && val.length < gatekeeperPIN.length) setError?.(null);
                  setGatekeeperPIN(val);
                  if (val.length === 4) {
                    handleGatekeeperUnlock({ preventDefault: () => {} } as React.FormEvent, val);
                  }
                }}
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                  }
                }}
              />
            )}
          </>
        )}
      </form>
      <div className={styles.gatekeeperFooter}>
        <button type="button" onClick={closeWindow} className={styles.cancelBtn}>Cancel</button>
      </div>
    </motion.div>
  );
};
