import { Injectable, signal } from '@angular/core';

const AGE_VERIFIED_KEY = 'sc_age_verified';

/**
 * Tracks whether the visitor has confirmed they are 18+ for this browser.
 * Backed by localStorage so verification persists across reloads/tabs.
 */
@Injectable({ providedIn: 'root' })
export class AgeVerificationService {
  private readonly verifiedSignal = signal<boolean>(this.readFromStorage());

  readonly verified = this.verifiedSignal.asReadonly();

  isVerified(): boolean {
    return this.verifiedSignal();
  }

  confirmAge(): void {
    this.verifiedSignal.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    }
  }

  private readFromStorage(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    return localStorage.getItem(AGE_VERIFIED_KEY) === 'true';
  }
}
