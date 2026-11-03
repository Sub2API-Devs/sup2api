/**
 * services/artifacts/connectorNames.ts
 *
 * 2.1.316 新增：MCP 连接器名称建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-99h01h55.js (7)
 * attribution: placement 7
 */
import {
  MAX_NAME_LENGTH,
  PRINTABLE_TEXT_RE,
  WELL_FORMED_EDGES_RE,
  BIDI_CONTROL_RE,
  ARABIC_FORMAT_RE,
  MARK_STACK_RE,
  looksLikeHostLabel,
  ESCAPE_NEEDED_RE,
  escapeChar,
  Pe,
  DISPLAY_UNSAFE_RE,
} from "./textSanitize.js";
import { CLAUDE_AI } from "../mcp/normalization.js";
import { Vt } from "../../utils/agentId.js";
import { scrubArtifactEnvelopeTags, sweepAskCopy } from "../../tools/ArtifactTool/artifactUrls.js";
import { truncateWithEscapes, sanitizeDisplayText } from "./capabilityDeclaration.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";

/**
 * （归属疑误：通用显示名校验）字符串可原样作为可声明名（长度、字符集、非 mcp__ 前缀等）。
 */
//@ chunk-99h01h55.js:4051-4264 placement = getMcpPrefix (1)
function getMcpPrefix(serverName) {
  return (
    Array.from(serverName).length <= MAX_NAME_LENGTH &&
    !serverName.startsWith(" ") &&
    !serverName.endsWith(" ") &&
    PRINTABLE_TEXT_RE.test(serverName) &&
    WELL_FORMED_EDGES_RE.test(serverName) &&
    !BIDI_CONTROL_RE.test(serverName) &&
    !ARABIC_FORMAT_RE.test(serverName) &&
    !MARK_STACK_RE.test(serverName) &&
    !looksLikeHostLabel(serverName) &&
    !serverName.startsWith(CLAUDE_AI) &&
    !serverName.startsWith("mcp__") &&
    Vt(serverName) === null
  );
}
/**
 * （归属疑误：通用显示）把名字转成安全的引号显示形式，超长截断加省略号。
 */
//@ chunk-99h01h55.js:4264-4523 placement
function sanitizeConnectorName(e, n) {
  if (typeof e === "string" && getMcpPrefix(e))
    return scrubArtifactEnvelopeTags(e.replace(ESCAPE_NEEDED_RE, escapeChar));
  let t = n?.max ?? MAX_NAME_LENGTH,
    r = e,
    s = !1;
  if (typeof e === "string") ({ text: r, cut: s } = truncateWithEscapes(e, Pe(e), t));
  let i = scrubArtifactEnvelopeTags(
    sweepAskCopy(sanitizeDisplayText(r, { ...n, max: t }).replace(/`/g, "'"))?.replace(
      /^\p{M}+/u,
      escapeChar,
    ) ?? "?",
  );
  return s ? `${i}\u2026` : i;
}
//@ chunk-99h01h55.js:4523-4573 placement
function Vcr(e) {
  return scrubArtifactEnvelopeTags(
    truncateCodePoints(e, MAX_NAME_LENGTH).replace(DISPLAY_UNSAFE_RE, escapeChar),
  );
}
//@ chunk-99h01h55.js:4573-4629 placement
function zit(e) {
  return e.declarable !== !1 && getMcpPrefix(e.server);
}
//@ chunk-99h01h55.js:4629-4677 placement
var Qe = ["name", "connector", "id", "display_name"];
//@ chunk-99h01h55.js:4677-4773 placement
function G() {
  return { ok: !1, unresolved: [], internal: [], malformed: [], oversized: [], serverCount: null };
}
//@ chunk-99h01h55.js:4773-4844 placement
function k4(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}

export { sanitizeConnectorName, zit, k4, Vcr, G, Qe, getMcpPrefix };
