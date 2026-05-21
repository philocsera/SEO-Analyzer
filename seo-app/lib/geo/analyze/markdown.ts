// 미니멀 Markdown → HTML 변환.
// LLM 봇에게 마크다운으로 응답하는 페이지(Stripe Docs 등)를 cheerio 파이프라인에 흘려보내기 위함.
// 모든 일반 마크다운을 완벽 지원할 필요는 없음 — 우리가 측정하는 시그널(헤딩·리스트·표·인용·링크·코드·통계 패턴)만 보존하면 충분.

export function looksLikeMarkdown(text: string): boolean {
  const head = text.slice(0, 4000);
  const score =
    (/^#{1,6} \S/m.test(head) ? 2 : 0) +
    (/^[*-] \S/m.test(head) ? 1 : 0) +
    (/^\d+\.\s\S/m.test(head) ? 1 : 0) +
    (/```/.test(head) ? 1 : 0) +
    (/\[[^\]]+\]\([^)]+\)/.test(head) ? 1 : 0) +
    (/^>\s/m.test(head) ? 1 : 0);
  return score >= 2;
}

export function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = ['<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><main>'];
  let inCode = false;
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inBlockquote = false;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${inline(paraBuf.join(" "))}</p>`);
      paraBuf = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const raw of lines) {
    const line = raw;

    if (/^```/.test(line)) {
      flushPara();
      closeList();
      closeBlockquote();
      if (!inCode) {
        out.push("<pre><code>");
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushPara();
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const ul = line.match(/^[*-]\s+(.+)$/);
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ul || ol) {
      flushPara();
      closeBlockquote();
      const wanted: "ul" | "ol" = ul ? "ul" : "ol";
      if (!inList || listType !== wanted) {
        closeList();
        out.push(wanted === "ol" ? "<ol>" : "<ul>");
        inList = true;
        listType = wanted;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushPara();
      closeList();
      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }
      out.push(`<p>${inline(bq[1])}</p>`);
      continue;
    }

    // 표 (간단): | a | b | / |---|---|
    if (/^\s*\|/.test(line) && /\|/.test(line)) {
      flushPara();
      closeList();
      closeBlockquote();
      out.push(renderTableRow(line));
      continue;
    }

    if (!line.trim()) {
      flushPara();
      closeList();
      closeBlockquote();
      continue;
    }

    paraBuf.push(line.trim());
  }

  flushPara();
  closeList();
  closeBlockquote();
  if (inCode) out.push("</code></pre>");

  out.push("</main></body></html>");

  return mergeTableRows(out.join("\n"));
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, t, u) => {
      const safe = /^(https?:|mailto:|\/)/i.test(u) ? u : "#";
      return `<a href="${escapeAttr(safe)}">${t}</a>`;
    });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function renderTableRow(line: string): string {
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.every((c) => /^:?-+:?$/.test(c))) return "__TR_SEP__";
  return "__TR__" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "__/TR__";
}

function mergeTableRows(html: string): string {
  if (!html.includes("__TR__")) return html;
  const lines = html.split("\n");
  const merged: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("__TR__")) {
      merged.push("<table>");
      let isHeader = false;
      while (i < lines.length && (lines[i].startsWith("__TR__") || lines[i] === "__TR_SEP__")) {
        if (lines[i] === "__TR_SEP__") {
          isHeader = true;
          i++;
          continue;
        }
        const cells = lines[i].slice(6, -7);
        if (isHeader) {
          merged.push(`<tr>${cells.replaceAll("<td>", "<th>").replaceAll("</td>", "</th>")}</tr>`);
          isHeader = false;
        } else {
          merged.push(`<tr>${cells}</tr>`);
        }
        i++;
      }
      merged.push("</table>");
      continue;
    }
    merged.push(lines[i]);
    i++;
  }
  return merged.join("\n");
}
