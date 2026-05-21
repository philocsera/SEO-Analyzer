import { LLM_BOTS } from "./thresholds";
import { fetchText } from "./fetch-page";

export type RobotsCheck = {
  fetched: boolean;
  blockedBots: string[];
  allowedBots: string[];
  raw: string | null;
};

export async function checkRobots(origin: string, path: string): Promise<RobotsCheck> {
  const robotsUrl = `${origin}/robots.txt`;
  const raw = await fetchText(robotsUrl, 100_000);
  if (raw === null) {
    return { fetched: false, blockedBots: [], allowedBots: [], raw: null };
  }
  const groups = parseRobots(raw);
  const blocked: string[] = [];
  const allowed: string[] = [];
  for (const bot of LLM_BOTS) {
    const verdict = evaluate(groups, bot, path);
    if (verdict === "disallow") blocked.push(bot);
    else if (verdict === "allow") allowed.push(bot);
  }
  return { fetched: true, blockedBots: blocked, allowedBots: allowed, raw };
}

type RobotsGroup = {
  agents: string[];
  rules: Array<{ type: "allow" | "disallow"; pattern: string }>;
};

function parseRobots(text: string): RobotsGroup[] {
  const lines = text.split(/\r?\n/);
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let inAgentsBlock = false;

  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !inAgentsBlock) {
        current = { agents: [], rules: [] };
        groups.push(current);
        inAgentsBlock = true;
      }
      current.agents.push(value.toLowerCase());
    } else if (field === "allow" || field === "disallow") {
      if (!current) {
        current = { agents: ["*"], rules: [] };
        groups.push(current);
      }
      inAgentsBlock = false;
      current.rules.push({
        type: field,
        pattern: value,
      });
    } else {
      inAgentsBlock = false;
    }
  }
  return groups;
}

function evaluate(
  groups: RobotsGroup[],
  bot: string,
  path: string,
): "allow" | "disallow" | "unspecified" {
  const botLower = bot.toLowerCase();
  const matching = groups.filter((g) =>
    g.agents.some((a) => a === botLower || a === "*"),
  );
  if (!matching.length) return "unspecified";

  const exact = matching.filter((g) => g.agents.includes(botLower));
  const useGroups = exact.length ? exact : matching;

  let best: { type: "allow" | "disallow"; length: number } | null = null;
  for (const g of useGroups) {
    for (const rule of g.rules) {
      if (matchPattern(rule.pattern, path)) {
        const len = rule.pattern.length;
        if (!best || len > best.length) {
          best = { type: rule.type, length: len };
        }
      }
    }
  }
  if (!best) return "unspecified";
  return best.type;
}

function matchPattern(pattern: string, path: string): boolean {
  if (!pattern) return false;
  if (pattern === "/") return true;
  if (!pattern.includes("*") && !pattern.endsWith("$")) {
    return path.startsWith(pattern);
  }
  const end = pattern.endsWith("$");
  const core = end ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(
    "^" +
      core
        .split("*")
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      (end ? "$" : ""),
  );
  return re.test(path);
}
