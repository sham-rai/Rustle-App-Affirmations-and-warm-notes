// Help lines shown by the age gate's block screen and the "get help now" page.
// VERIFY AT BUILD: every number below is copied from docs/11 §5 (youth) and §5b (crisis) and must be
// checked before each release and every six months (docs/11 §5b). Names and countries are in
// en.json / fr.json under `resources`; only numbers and links live here.

export type CountryCode = 'US' | 'CA' | 'GB' | 'IE' | 'AU' | 'FR' | 'BE' | 'CH';

export type HelpLineId =
  | 'kidsHelpPhone'
  | 'filSanteJeunes'
  | 'childline'
  | 'lifeline988'
  | 'canada988'
  | 'quebecAppelle'
  | 'samaritans'
  | 'lifelineAu'
  | 'france3114'
  | 'sosAmitie'
  | 'belgiumCps'
  | 'mainTendue';

export type HelpLine = {
  /** Key under `resources.lines` in the string files. */
  readonly id: HelpLineId;
  readonly countries: readonly CountryCode[];
  /** As written for people in that country. */
  readonly display: string;
  /** What a tap opens: `tel:` for a phone line, a web page otherwise. */
  readonly href: string;
  /** True for a phone line ("Call …"), false for a web page ("Open …"). */
  readonly phone: boolean;
};

const tel = (digits: string) => `tel:${digits}`;

/** docs/11 §5: youth helplines for the under-18 screen. Verify at build. */
export const YOUTH_LINES: readonly HelpLine[] = [
  { id: 'kidsHelpPhone', countries: ['CA'], display: '1-800-668-6868', href: tel('18006686868'), phone: true },
  { id: 'filSanteJeunes', countries: ['FR'], display: '0 800 235 236', href: tel('0800235236'), phone: true },
  { id: 'childline', countries: ['GB'], display: '0800 1111', href: tel('08001111'), phone: true },
];

/** docs/11 §5b: crisis lines for "get help now". Verify at build. */
export const CRISIS_LINES: readonly HelpLine[] = [
  { id: 'lifeline988', countries: ['US'], display: '988', href: tel('988'), phone: true },
  { id: 'canada988', countries: ['CA'], display: '9-8-8', href: tel('988'), phone: true },
  { id: 'quebecAppelle', countries: ['CA'], display: '1 866 APPELLE (277-3553)', href: tel('18662773553'), phone: true },
  { id: 'samaritans', countries: ['GB', 'IE'], display: '116 123', href: tel('116123'), phone: true },
  { id: 'lifelineAu', countries: ['AU'], display: '13 11 14', href: tel('131114'), phone: true },
  { id: 'france3114', countries: ['FR'], display: '3114', href: tel('3114'), phone: true },
  // docs/11 §5b names SOS Amitié without a number; the page lists its phone lines and chat. Verify at build.
  { id: 'sosAmitie', countries: ['FR'], display: 'sos-amitie.com', href: 'https://www.sos-amitie.com', phone: false },
  { id: 'belgiumCps', countries: ['BE'], display: '0800 32 123', href: tel('080032123'), phone: true },
  { id: 'mainTendue', countries: ['CH'], display: '143', href: tel('143'), phone: true },
];

/** The fallback for any other country (docs/11 §5b). */
export const FIND_A_HELPLINE_URL = 'https://findahelpline.com';

/**
 * The lines for the device's country first, then the rest in their listed order, so the most
 * useful number is on top without hiding the others (a traveller, a phone set to another region).
 */
export function linesFor(lines: readonly HelpLine[], region: string | null | undefined): readonly HelpLine[] {
  const code = region?.toUpperCase();
  const local = lines.filter((line) => line.countries.some((country) => country === code));
  const others = lines.filter((line) => !local.includes(line));
  return [...local, ...others];
}
