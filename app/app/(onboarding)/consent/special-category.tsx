import { ConsentStep } from '../../../features/consent/ConsentStep';

// Consent 3 of 3: special-category data (GDPR Art. 9, Quebec Law 25; docs/11 §4.2).
// TODO(M2-02): the five onboarding screens come next; until they exist this opens Today.
export default function SpecialCategoryConsent() {
  return <ConsentStep kind="special_category" next="/today" />;
}
