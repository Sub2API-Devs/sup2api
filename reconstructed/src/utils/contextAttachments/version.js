/**
 * utils/contextAttachments/version.ts
 *
 * 2.1.316 新增：版本附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { dbt } from "./remoteSession.js";
import { ubt, cbt } from "./attribution.js";

/**
 * 从后往前收集上一条带版本标记的助手消息之后、尚未公告的版本附件消息。
 */
//@ chunk-e6aww6q8.js:115760-115984 placement
function unannouncedVersionMessages(e) {
  let n = [];
  for (let r = e.length - 1; r >= 0; r--) {
    let s = e[r];
    if (s.type === "assistant" && s.message.model !== SYNTHETIC_MODEL && isLegacyVersionMarker(s)) break;
    if (
      dbt(s) &&
      s.renderedBesideToolResult !== !0 &&
      typeof mbt(s) === "string" &&
      !isLegacyVersionMarker(s)
    )
      n.push(s);
  }
  return n;
}
//@ chunk-e6aww6q8.js:115984-116037 placement
function mbt(e) {
  return "version" in e ? e.version : void 0;
}
//@ chunk-e6aww6q8.js:116037-116165 placement
function isLegacyVersionMarker(e) {
  let n = mbt(e);
  return typeof n === "string" ? n.startsWith("2.1.287") || n.startsWith("2.1.288-dev.") : "sessionId" in e;
}
//@ chunk-e6aww6q8.js:116165-116225 placement
function gbt(e) {
  return e.startsWith(ubt) || e.startsWith(cbt);
}

export { gbt, unannouncedVersionMessages };
