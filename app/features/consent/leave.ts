import { resetIntroSeen } from '../intro/intro-seen';
import { deleteAnonymousAccount } from '../../lib/supabase';
import { resetConsentsComplete } from './block-flag';

/**
 * Ends onboarding without keeping anything (docs/21 §1.2–1.3): an under-18 block, or a declined
 * consent. The anonymous account goes first (the `delete_own_account()` RPC, D47), then the intro
 * and consents-complete flags, so the next account created on this install sees the intro again. A failed server call
 * still wipes the local session; the never-linked account then ages out under the 24-month rule.
 */
export async function leaveOnboarding(): Promise<void> {
  try {
    await deleteAnonymousAccount();
  } finally {
    resetIntroSeen();
    resetConsentsComplete();
  }
}
