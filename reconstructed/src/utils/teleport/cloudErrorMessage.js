/**
 * utils/teleport/cloudErrorMessage.ts
 *
 * 2.1.316 新增：规范化云服务错误消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (8)
 * attribution: placement 8
 */
import { RS } from "../sanitization.js";
import { UK } from "../confusables.js";
import { printableName, quotedPrintable } from "../printableName.js";
import { logForDebugging } from "../debug.js";

//@ chunk-aepeg2w5.js:781349-781527 placement
var NOT_SHOWN_PLACEHOLDER = "[not shown]",
  MESSAGE_NOT_SHOWN_NOTE =
    "is not shown because it is too long or has unusual characters or spacing. Run again with --debug to see it.",
  SUSPICIOUS_TEXT_RE = new RegExp(`^\\s*$|\\s{2}|[${RS}]`, "u");
//@ chunk-aepeg2w5.js:781527-781621 placement
function Rg(e, n, r = (s) => s) {
  return (s, h = NOT_SHOWN_PLACEHOLDER) =>
    typeof s === "string" && !SUSPICIOUS_TEXT_RE.test(s) && e(s, n) === r(s) ? s : h;
}
//@ chunk-aepeg2w5.js:781621-781686 placement
var regExp_32 = new RegExp(`[${UK.open}${UK.close}]|&#?\\w+;|\\]\\(`, "u");
//@ chunk-aepeg2w5.js:781686-781758 placement
function Lx(e) {
  return (n, r = NOT_SHOWN_PLACEHOLDER) => (typeof n === "string" && regExp_32.test(n) ? r : e(n, r));
}
//@ chunk-aepeg2w5.js:781758-781843 placement
var Clt = Lx(Rg(printableName, 200)),
  hgr = Lx(Rg(quotedPrintable, 200)),
  gro = Rg(printableName, 1000, (e) => e.replaceAll("`", "'"));
//@ chunk-aepeg2w5.js:781843-781912 placement
function Gis(e) {
  return typeof e === "string" && !/\s/u.test(e) ? hgr(e) : NOT_SHOWN_PLACEHOLDER;
}
//@ chunk-aepeg2w5.js:781912-781986 placement
function vPt(e) {
  return typeof e === "string" && /^[\w-]{1,200}$/.test(e) ? e : NOT_SHOWN_PLACEHOLDER;
}
/**
 * 规范化云服务错误消息。
 */
//@ chunk-aepeg2w5.js:781986-782331 placement
function cloudErrorMessage(e, n) {
  let r = typeof n === "string" ? n.trim() : n,
    s = gro(r, ""),
    h = (typeof r === "string" && r !== s) || void 0;
  if (h)
    logForDebugging(`the cloud service's message (HTTP ${e.status}), not shown: ${n}`, { level: "error" });
  let trimmed = `${e.status} ${Clt(e.statusText, "")}`.trim();
  return {
    message: s || void 0,
    messageHidden: h,
    statusLine: h ? `${trimmed}. The cloud service's message ${MESSAGE_NOT_SHOWN_NOTE}` : trimmed,
  };
}

export { cloudErrorMessage, vPt, hgr, Clt, Gis, gro, MESSAGE_NOT_SHOWN_NOTE };
