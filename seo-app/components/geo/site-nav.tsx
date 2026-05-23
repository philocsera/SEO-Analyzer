import Link from "next/link";
import { Sparkles, ArrowLeftRight } from "lucide-react";

const NAV = [
  { href: "/geo", label: "분석" },
];

export function SiteNav({ active }: { active?: string }) {
  return (
    <header data-chrome className="border-b border-slate-800/50 px-6 py-4 sticky top-0 z-10 bg-[#0a0f1e]/85 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
        <Link href="/geo" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">GEO Analyzer</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "text-violet-300 font-medium"
                  : "text-slate-400 hover:text-slate-100 transition-colors"
              }
            >
              {item.label}
            </Link>
          ))}
          {/* SEO 분석기로 전환 */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 transition-colors border-l border-slate-700/50 pl-4"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            SEO 분석
          </Link>
        </nav>
      </div>
    </header>
  );
}
