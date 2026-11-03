/**
 * utils/semanticNumber.ts
 *
 * 接受数字字符串的数字 schema 预处理，及保留最近 N 个数值的小工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/semanticNumber.ts
 * pieces: chunk-bss4k1z9.js (1)
 * attribution: fingerprint 1
 */
import { PROPOSED_OUTCOMES } from "../plugins/bundled/youShouldKnow/NoteCard.js";

//@ chunk-bss4k1z9.js:20132-20331 fingerprint = semanticNumber (0.481)
function semanticNumber(inner) {
  if (typeof inner !== "object" || !inner) return !1;
  let t = inner;
  return (
    Number.isFinite(t.number) &&
    Number.isFinite(t.step) &&
    Number.isFinite(t.latencyMs) &&
    Number.isFinite(t.at) &&
    PROPOSED_OUTCOMES.some((o) => o === t.outcome)
  );
}

export { semanticNumber };
