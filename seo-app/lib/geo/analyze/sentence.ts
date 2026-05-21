export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const rough = normalized.split(/(?<=[.!?。！？])\s+(?=[A-Z가-힣"'(])/u);
  return rough
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
}

const PRONOUN_STARTS = new Set([
  "이",
  "그",
  "저",
  "이것",
  "그것",
  "저것",
  "여기",
  "거기",
  "this",
  "that",
  "it",
  "they",
  "these",
  "those",
  "he",
  "she",
  "we",
  "i",
]);

export function isSelfContained(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 12) return false;
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase().replace(/[,.;:].*$/, "");
  if (PRONOUN_STARTS.has(firstWord)) return false;
  if (/^(또한|그러나|그리고|하지만|따라서|즉,?)/.test(trimmed)) return false;
  if (/^(also|however|therefore|but|so|moreover)\b/i.test(trimmed)) return false;
  return true;
}

const DEFINITION_PATTERNS: RegExp[] = [
  /^[^,.;:?!]{2,40}(는|은|이란|란|이라(고|는)? 함은) [^.!?]{4,}(이다|입니다|을 말한다|을 의미한다)/,
  /^[A-Z][\w-]+ is (a|an|the) [\w][^.?!]{3,}/i,
  /^[A-Z][\w-]+ refers to [^.?!]{3,}/i,
  /^[A-Z][\w-]+ means [^.?!]{3,}/i,
];

export function isDefinitional(sentence: string): boolean {
  const t = sentence.trim();
  return DEFINITION_PATTERNS.some((re) => re.test(t));
}

const STAT_PATTERN =
  /\d{1,3}(,\d{3})*(\.\d+)?\s?(%|배|명|건|회|개|원|달러|\$|USD|KRW|km|m|kg|g|초|분|시간|GB|MB|KB|TB|MW|kW|점|위|위까지|x|×)/i;
const STAT_ENGLISH =
  /\b\d{1,3}(,\d{3})*(\.\d+)?\s?(percent|times|million|billion|users|customers|seconds|minutes|hours|dollars|MB|GB|kg|km)\b/i;

export function hasStat(sentence: string): boolean {
  return STAT_PATTERN.test(sentence) || STAT_ENGLISH.test(sentence);
}

export function isLong(sentence: string, lang: "ko" | "en" | "mixed"): boolean {
  if (lang === "ko" || lang === "mixed") {
    if (sentence.length > 90) return true;
  }
  const wordCount = sentence.split(/\s+/).length;
  if (lang === "en" && wordCount > 30) return true;
  if (lang === "mixed" && wordCount > 30 && sentence.length > 90) return true;
  return false;
}

export function detectLang(text: string): "ko" | "en" | "mixed" {
  const koChars = (text.match(/[가-힣]/g) ?? []).length;
  const enChars = (text.match(/[A-Za-z]/g) ?? []).length;
  if (koChars > enChars * 2) return "ko";
  if (enChars > koChars * 2) return "en";
  return "mixed";
}
