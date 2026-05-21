import { fetchText } from "./fetch-page";

export type LlmsTxtCheck = {
  present: boolean;
  url?: string;
  full?: boolean;
};

export async function checkLlmsTxt(origin: string): Promise<LlmsTxtCheck> {
  const candidates = [
    { url: `${origin}/llms.txt`, full: false },
    { url: `${origin}/llms-full.txt`, full: true },
  ];
  for (const c of candidates) {
    const text = await fetchText(c.url, 50_000);
    if (text && text.trim().length > 0) {
      return { present: true, url: c.url, full: c.full };
    }
  }
  return { present: false };
}
