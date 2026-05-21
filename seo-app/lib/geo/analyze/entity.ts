const STOPWORDS_EN = new Set([
  "The",
  "A",
  "An",
  "This",
  "That",
  "These",
  "Those",
  "It",
  "Is",
  "Are",
  "Was",
  "Were",
  "And",
  "But",
  "Or",
  "However",
  "Also",
  "Therefore",
  "We",
  "You",
  "I",
  "They",
  "He",
  "She",
  "In",
  "On",
  "At",
  "For",
  "By",
  "With",
  "From",
  "To",
  "Of",
  "As",
]);

export function extractNamedEntities(text: string): string[] {
  const found = new Set<string>();

  const enRe = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = enRe.exec(text))) {
    const phrase = m[1];
    const first = phrase.split(/\s+/)[0];
    if (STOPWORDS_EN.has(first)) continue;
    if (phrase.length < 3) continue;
    found.add(phrase);
  }

  const quotedRe = /[「」"'"](([가-힣A-Za-z0-9][^「」"'"\n]{1,40}))[」""']/g;
  while ((m = quotedRe.exec(text))) {
    const phrase = m[1].trim();
    if (phrase.length >= 2) found.add(phrase);
  }

  return Array.from(found).slice(0, 200);
}

const VERSION_RE = /\bv?\d+\.\d+(?:\.\d+)?\b/g;
const DATE_RE = /\b(20\d{2})[-./년](\d{1,2})[-./월]?(\d{1,2})?\b/g;
const PRICE_RE = /(\$|₩|￥|€)\s?\d[\d,]*(\.\d+)?/g;
const PERCENT_RE = /\b\d+(\.\d+)?\s?%/g;

export function countVersionDateNumber(text: string): number {
  let n = 0;
  n += (text.match(VERSION_RE) ?? []).length;
  n += (text.match(DATE_RE) ?? []).length;
  n += (text.match(PRICE_RE) ?? []).length;
  n += (text.match(PERCENT_RE) ?? []).length;
  return n;
}
