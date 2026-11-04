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

//@ chunk-bss4k1z9.js:20132-20331 fingerprint (2.1.88 match: semanticNumber, 0.481)
function semanticNumber(inner) {
  if (typeof inner !== "object" || !inner) return false;
  let value = inner;
  return (
    Number.isFinite(value.number) &&
    Number.isFinite(value.step) &&
    Number.isFinite(value.latencyMs) &&
    Number.isFinite(value.at) &&
    PROPOSED_OUTCOMES.some((outcome) => outcome === value.outcome)
  );
}
export { semanticNumber };
