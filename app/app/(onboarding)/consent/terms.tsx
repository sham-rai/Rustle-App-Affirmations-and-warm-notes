import { ConsentStep } from '../../../features/consent/ConsentStep';

// Consent 1 of 3: the terms of use (docs/11 §4.2, docs/21 §1.3).
export default function TermsConsent() {
  return <ConsentStep kind="terms" next="/consent/ai" />;
}
