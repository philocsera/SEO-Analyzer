import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "GEO Optimizer";

export default function Image() {
  return renderOgImage({
    eyebrow: "GEO OPTIMIZER",
    title: "Will AI answers cite your page?",
    subtitle: "ChatGPT · Claude · Perplexity · AI Overviews",
    accent: "geo",
  });
}
