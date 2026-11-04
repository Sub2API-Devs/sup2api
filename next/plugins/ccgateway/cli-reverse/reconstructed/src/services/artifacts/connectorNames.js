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
  displaySafetyMasker,
  DISPLAY_UNSAFE_RE,
} from "./textSanitize.js";
import { CLAUDE_AI } from "../mcp/normalization.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { scrubArtifactEnvelopeTags, sweepAskCopy } from "../../tools/ArtifactTool/artifactUrls.js";
import { truncateWithEscapes, sanitizeDisplayText } from "./capabilityDeclaration.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";

//@ chunk-99h01h55.js:4051-4264 placement = getMcpPrefix (1)
/**
 * （归属疑误：通用显示名校验）字符串可原样作为可声明名（长度、字符集、非 mcp__ 前缀等）。
 */
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
    normalizeUuidOrNull(serverName) === null
  );
}
//@ chunk-99h01h55.js:4264-4523 placement
/**
 * （归属疑误：通用显示）把名字转成安全的引号显示形式，超长截断加省略号。
 */
function sanitizeConnectorName(name, options) {
  if (typeof name === "string" && getMcpPrefix(name))
    return scrubArtifactEnvelopeTags(name.replace(ESCAPE_NEEDED_RE, escapeChar));
  let max = options?.max ?? MAX_NAME_LENGTH;
  let text = name;
  let cut = false;
  if (typeof name === "string") ({ text, cut } = truncateWithEscapes(name, displaySafetyMasker(name), max));
  let cleaned = scrubArtifactEnvelopeTags(
    sweepAskCopy(
      sanitizeDisplayText(text, {
        ...options,
        max,
      }).replace(/`/g, "'"),
    )?.replace(/^\p{M}+/u, escapeChar) ?? "?",
  );
  return cut ? `${cleaned}\u2026` : cleaned;
}
//@ chunk-99h01h55.js:4523-4573 placement
/**
 * 导出函数 `sanitizeConnectorNameConnectors`：参数 e，返回 scrubArtifactEnvelopeTags( truncateCodePoints(e, MAX_NAME_LENGTH).replace(DISPLAY_UNSAFE_RE, escapeChar), )。
 */
function sanitizeConnectorNameConnectors(server) {
  return scrubArtifactEnvelopeTags(
    truncateCodePoints(server, MAX_NAME_LENGTH).replace(DISPLAY_UNSAFE_RE, escapeChar),
  );
}
//@ chunk-99h01h55.js:4573-4629 placement
/**
 * 导出函数 `isDeclarableServer`：参数 e，返回 e.declarable !== !1 && getMcpPrefix(e.server)。
 */
function isDeclarableServer(server) {
  return server.declarable !== false && getMcpPrefix(server.server);
}
//@ chunk-99h01h55.js:4629-4677 placement
var CONNECTOR_NAME_FIELDS = ["name", "connector", "id", "display_name"];
//@ chunk-99h01h55.js:4677-4773 placement
function emptyConnectorResolution() {
  return {
    ok: false,
    unresolved: [],
    internal: [],
    malformed: [],
    oversized: [],
    serverCount: null,
  };
}
//@ chunk-99h01h55.js:4773-4844 placement
/**
 * 导出函数 `isPlainObjectConnector`：参数 e，返回 e !== null && typeof e === "object" && !Array.isArray(e); } export { sanitizeConnectorName, zit, k4, Vcr, G, Q…。
 */
function isPlainObjectConnector(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export {
  sanitizeConnectorName,
  isDeclarableServer,
  isPlainObjectConnector,
  sanitizeConnectorNameConnectors,
  emptyConnectorResolution,
  CONNECTOR_NAME_FIELDS,
  getMcpPrefix,
};
