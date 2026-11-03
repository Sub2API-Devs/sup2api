/**
 * bridge/_new/firstSentenceSnippet.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cg2r2hy6.js (2)
 * attribution: sole-consumer-new 2
 */
import { uft } from "../../utils/systemReminder.js";

//@ chunk-cg2r2hy6.js:48738-48748 sole-consumer-new
var hn = 50;
/**
 * 取文本的第一句、压缩空白，超过长度上限截断加省略号。
 */
//@ chunk-cg2r2hy6.js:48748-48898 sole-consumer-new
function firstSentenceSnippet(s) {
  let u = uft(s),
    trimmed = (/^(.*?[.!?])\s/.exec(u)?.[1] ?? u).replace(/\s+/g, " ").trim();
  if (!trimmed) return;
  return trimmed.length > hn ? trimmed.slice(0, hn - 1) + "\u2026" : trimmed;
}

export { firstSentenceSnippet };
