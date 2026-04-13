import { invoke } from "@tauri-apps/api/core";

/**
 * Supported credential types for the AppLock system.
 */
export type CredentialType = "pin_4" | "pin_6" | "alphanumeric" | "none";

/**
 * Securely hashes and stores a new user credential.
 * Validates strength and common/sequential patterns in Rust.
 */
export async function setCredential(pinOrPassword: string, credType: Exclude<CredentialType, "none">): Promise<void> {
  return await invoke("set_credential", { pinOrPassword, credType });
}

/**
 * Verifies input against the stores secure hash using Argon2id.
 * Performs silent re-hash if security protocols have been updated.
 */
export async function verifyCredential(input: string): Promise<boolean> {
  return await invoke<boolean>("verify_credential", { input });
}

/**
 * Updates an existing credential. Verifies old input before allowing change.
 */
export async function updateCredential(
  oldInput: string,
  newInput: string,
  credType: Exclude<CredentialType, "none">
): Promise<void> {
  return await invoke("update_credential", { oldInput, newInput, credType });
}

/**
 * Returns the currently active credential type.
 */
export async function getCredentialType(): Promise<CredentialType> {
  return await invoke<CredentialType>("get_credential_type");
}

/**
 * Checks if the system requires a credential re-hash.
 */
export async function checkRehashNeeded(): Promise<boolean> {
  return await invoke<boolean>("check_rehash_needed");
}
