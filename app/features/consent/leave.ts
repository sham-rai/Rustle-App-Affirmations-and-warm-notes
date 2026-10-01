import { resetIntroSeen } from '../intro/intro-seen';
import { deleteAnonymousAccount } from '../../lib/supabase';
import { isConsentsComplete, resetConsentsComplete } from './onboarding-flags';

export type LeaveResult =
  /** Onboarding is already done on this install: nothing was deleted (a deep link, a stale screen). */
  | { readonly refused: true }
  | { readonly refused: false; readonly serverDeleted: boolean; readonly localCleared: boolean };

/**
 * Ends onboarding without keeping anything (docs/21 §1.2–1.3): an under-18 block, or a declined
 * consent. The anonymous account goes first (the `delete_own_account()` RPC, D47), then the intro
 * and consents-complete flags, so the next account created on this install sees the intro again.
 * A failed server call still wipes the local session; the never-linked account then ages out under
 * the 24-month rule. Refuses on an onboarded install, so no route can delete a real account.
 */
export async function leaveOnboarding(): Promise<LeaveResult> {
  if (isConsentsComplete()) return { refused: true };
  try {
    const result = await deleteAnonymousAccount();
    return { refused: false, serverDeleted: result.serverDeleted, localCleared: result.localCleared };
  } finally {
    resetIntroSeen();
    resetConsentsComplete();
  }
}
