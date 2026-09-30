// Splits a string such as "If you’re in crisis, <link>get help now</link>." around its link, so
// translators can put the link anywhere in the sentence.

export type LinkedText = { readonly before: string; readonly link: string; readonly after: string };

const LINK = /^([\s\S]*)<link>([\s\S]*)<\/link>([\s\S]*)$/;

export function splitLink(text: string): LinkedText {
  const match = LINK.exec(text);
  if (!match) return { before: text, link: '', after: '' };
  return { before: match[1] ?? '', link: match[2] ?? '', after: match[3] ?? '' };
}
