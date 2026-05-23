import { renderOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "SEO Analyzer";

export default function Image() {
  return renderOgImage({
    eyebrow: "SEO ANALYZER",
    title: "Analyze any URL's SEO in one click",
    subtitle: "Technical SEO · AI brand insights · Core Web Vitals",
    accent: "seo",
  });
}
