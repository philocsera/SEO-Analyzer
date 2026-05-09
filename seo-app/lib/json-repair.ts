// LLM 응답에서 흔히 발생하는 JSON 손상을 복구하는 유틸리티 모음.
// 1) sanitizeJson — 문자열 내부의 raw 제어문자 escape, trailing comma 제거
// 2) repairTruncatedJson — max_tokens로 잘려 닫히지 않은 괄호/따옴표 보강
// 3) parseAiJson — 위 두 가지를 순차 폴백으로 적용해 JSON.parse 시도

export function repairTruncatedJson(str: string): string {
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (const ch of str) {
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (!inString) {
      if (ch === '{') stack.push('}')
      else if (ch === '[') stack.push(']')
      else if (ch === '}' || ch === ']') stack.pop()
    }
  }

  let result = str.trimEnd()
  if (inString) result += '"'
  result += stack.reverse().join('')
  return result
}

export function sanitizeJson(raw: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]

    if (escaped) {
      result += ch
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
      if (ch < ' ') {
        result += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
        continue
      }
    }

    result += ch
  }

  return result.replace(/,(\s*[}\]])/g, '$1')
}

export function parseAiJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1)
    throw new Error(`JSON 블록 없음. 응답: ${cleaned.slice(0, 200)}`)

  const jsonStr = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    const sanitized = sanitizeJson(jsonStr)
    try {
      return JSON.parse(sanitized) as T
    } catch {
      const repaired = sanitizeJson(repairTruncatedJson(sanitized))
      try {
        return JSON.parse(repaired) as T
      } catch (e3) {
        console.error('[json-repair] JSON 파싱 실패:', String(e3))
        throw e3
      }
    }
  }
}
