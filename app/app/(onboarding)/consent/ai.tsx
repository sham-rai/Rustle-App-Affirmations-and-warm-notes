import { ConsentStep } from '../../../features/consent/ConsentStep';

// Consent 2 of 3: AI processing by a third party (docs/11 §4.4, Apple's requirement).
export default function AiConsent() {
  return <ConsentStep kind="ai_processing" next="/consent/special-category" />;
}
