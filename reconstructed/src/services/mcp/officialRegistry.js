/**
 * services/mcp/officialRegistry.ts
 *
 * （归属存疑）URL 安全检测小工具：反斜杠+@ 混淆检测与受限目的地判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/officialRegistry.ts
 * pieces: chunk-cgr0tezp.js (1)
 * attribution: fingerprint 1
 */
import { stripLeadingSpaceAndNewlines } from "../../utils/redaction/urlRedaction.js";

//@ chunk-cgr0tezp.js:75142-75296 fingerprint = normalizeUrl (0.695)
/**
 * normalizeUrl（实为检测反斜杠+@ 的 URL 混淆）：路径里反斜杠之后还有 @ 与冒号时返回 true。归属疑为通用 URL 安全工具。
 */
function normalizeUrl(url) {
  let n = stripLeadingSpaceAndNewlines(url);
  let r = n.search(/[?#]/);
  let index = (r === -1 ? n : n.slice(0, r)).indexOf("\\");
  let index_2 = n.lastIndexOf("@");
  return index !== -1 && index_2 > index && /:|%3a/i.test(n.slice(index, index_2));
}
export { normalizeUrl };
