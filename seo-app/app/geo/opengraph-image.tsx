import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "GEO Analyzer";

export default function Image() {
  return renderOgImage({
    eyebrow: "GEO ANALYZER",
    title: "Will AI answers cite your page?",
    subtitle: "ChatGPT · Claude · Perplexity · AI Overviews",
    accent: "geo",
  });
}
