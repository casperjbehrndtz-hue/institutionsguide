const STORAGE_KEY = "suite_gate_institutionsguide_institution_profile";
const EMAIL_KEY = "suite_gate_email";
const EXPIRY_DAYS = 7;

export function isInstitutionUnlocked(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { timestamp: number };
    const elapsed = Date.now() - data.timestamp;
    const maxAge = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (elapsed > maxAge) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setInstitutionUnlocked(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
}

export function getSuiteEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setSuiteEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email);
}
