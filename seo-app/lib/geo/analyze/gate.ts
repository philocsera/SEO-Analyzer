import type { GateResult, PageSignals } from "../types";
import { THRESHOLDS } from "./thresholds";
import { checkRobots } from "./robots";
import { checkLlmsTxt } from "./llms-txt";

export async function runGate(
  signals: PageSignals,
  finalUrl: string,
  servedAsMarkdown = false,
): Promise<GateResult> {
  const checks: GateResult["checks"] = [];
  const blockedBots: string[] = [];
  let origin = "";
  let path = "/";
  try {
    const u = new URL(finalUrl);
    origin = u.origin;
    path = u.pathname || "/";
  } catch {
    checks.push({
      id: "status",
      status: "fail",
      detail: `Invalid final URL: ${finalUrl}`,
    });
    return {
      passed: false,
      checks,
      llmsTxt: { present: false },
      blockedBots: [],
      servedAsMarkdown,
    };
  }

  const robotsPreview = await checkRobots(origin, path);
  const botBlocked = robotsPreview.blockedBots.length > 0;

  if (signals.status >= 400 || signals.status === 0) {
    const detail = signals.status === 0
      ? `HTTP 요청 실패`
      : signals.status === 403 && botBlocked
      ? `HTTP 403 — robots.txt LLM 봇 차단(${robotsPreview.blockedBots.slice(0, 3).join(", ")})과 일치, 봇 차단 응답으로 추정`
      : signals.status >= 400 && botBlocked
      ? `HTTP ${signals.status} — robots.txt LLM 봇 차단과 일치, 봇 차단 응답일 가능성`
      : `HTTP ${signals.status}`;
    checks.push({
      id: "status",
      status: "fail",
      detail,
    });
  } else if (signals.status >= 300) {
    checks.push({
      id: "status",
      status: "warn",
      detail: `HTTP ${signals.status}`,
    });
  } else {
    checks.push({
      id: "status",
      status: "pass",
      detail: `HTTP ${signals.status} in ${signals.responseMs}ms`,
    });
  }

  blockedBots.push(...robotsPreview.blockedBots);
  if (robotsPreview.blockedBots.length > 0) {
    checks.push({
      id: "robots",
      status: "fail",
      detail: `LLM 봇 차단: ${robotsPreview.blockedBots.join(", ")}`,
    });
  } else {
    checks.push({
      id: "robots",
      status: "pass",
      detail: robotsPreview.fetched
        ? "주요 LLM 봇 모두 허용"
        : "robots.txt 없음 (기본 허용)",
    });
  }

  // htmlTextRatio가 낮아도 (a) wordCount가 충분하거나
  // (b) meta description이 풍부하면(LLM이 그것만 보고도 답에 끼움) → fail이 아닌 warn으로 다운그레이드.
  const MIN_WORDS_FOR_ANALYSIS = 150;
  const MIN_META_DESC_LEN = 120;
  const ratio = signals.htmlTextRatio;
  const metaDescLen = signals.metaDescription?.length ?? 0;
  if (ratio < THRESHOLDS.htmlTextRatio.ok) {
    if (signals.wordCount >= MIN_WORDS_FOR_ANALYSIS) {
      checks.push({
        id: "render",
        status: "warn",
        detail: `HTML 대비 텍스트 비율이 낮음 (ratio=${ratio.toFixed(3)}). 본문 ${signals.wordCount.toLocaleString()}단어가 추출되어 분석은 진행되지만, JS 렌더링 의존 부분은 LLM 봇이 못 볼 수 있습니다.`,
      });
    } else if (metaDescLen >= MIN_META_DESC_LEN) {
      checks.push({
        id: "render",
        status: "warn",
        detail: `본문이 거의 비어 있으나 meta description(${metaDescLen}자)이 있어 LLM 봇에게 최소 정보는 노출됩니다. 본문을 SSR로 노출하면 인용 가능성이 크게 올라갑니다.`,
      });
    } else {
      checks.push({
        id: "render",
        status: "fail",
        detail: `본문이 HTML에 거의 없습니다 (ratio=${ratio.toFixed(3)}, 단어 ${signals.wordCount}). JS-only 렌더링으로 LLM 봇이 본문에 접근하기 어렵습니다.`,
      });
    }
  } else if (ratio < THRESHOLDS.htmlTextRatio.good) {
    checks.push({
      id: "render",
      status: "warn",
      detail: `본문 텍스트가 다소 적음 (ratio=${ratio.toFixed(3)}). 일부 콘텐츠가 JS로 렌더링될 가능성.`,
    });
  } else {
    checks.push({
      id: "render",
      status: "pass",
      detail: `SSR 본문 충분 (ratio=${ratio.toFixed(3)})`,
    });
  }

  if (signals.paywallSuspected) {
    checks.push({
      id: "paywall",
      status: "fail",
      detail: "Paywall/loginwall 패턴 감지",
    });
  } else {
    checks.push({
      id: "paywall",
      status: "pass",
      detail: "Paywall 흔적 없음",
    });
  }

  const llmsTxt = await checkLlmsTxt(origin);

  const passed = !checks.some((c) => c.status === "fail");

  return {
    passed,
    checks,
    llmsTxt: { present: llmsTxt.present, url: llmsTxt.url },
    blockedBots,
    servedAsMarkdown,
  };
}
