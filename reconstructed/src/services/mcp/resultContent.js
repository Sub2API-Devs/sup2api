/**
 * services/mcp/resultContent.ts
 *
 * 2.1.316 新增：MCP 结果内容转换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kszbqxwr.js (10)
 * attribution: placement 10
 */
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { DOCS_MCP_PATH } from "./firstPartyServerIds.js";
import { Kxe } from "../artifacts/frameApi.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";

/**
 * 判断配置地址是否是一方 Docs 连接器的 MCP 路径。
 */
//@ chunk-kszbqxwr.js:481-597 placement
function isDocsConnectorUrl(t) {
  try {
    let e = new URL(t.url);
    return e.protocol === "https:" && isFirstPartyAnthropicHost(e.href) && e.pathname === DOCS_MCP_PATH;
  } catch {
    return !1;
  }
}
//@ chunk-kszbqxwr.js:597-685 placement
function tor(t) {
  let { request_id: request_id } = Kxe(t);
  return request_id === void 0 ? {} : { "anthropic/requestId": request_id };
}
//@ chunk-kszbqxwr.js:685-720 placement
var c = new Set(["create", "update"]);
/**
 * 判断工具是否是 claude.ai Docs 连接器提供的特定工具。
 */
//@ chunk-kszbqxwr.js:720-956 placement
function isDocsConnectorTool(t, e) {
  let mcpInfo = t.mcpInfo;
  if (mcpInfo === void 0 || mcpInfo.scope !== "claudeai" || !c.has(mcpInfo.toolName)) return !1;
  let found = e.find((i) => i.name === mcpInfo.serverName);
  return (
    found !== void 0 &&
    found.config.scope === "claudeai" &&
    found.config.type === "claudeai-proxy" &&
    isDocsConnectorUrl(found.config)
  );
}
//@ chunk-kszbqxwr.js:956-968 placement
var s = 65536;
//@ chunk-kszbqxwr.js:968-1026 placement
function z6o(t) {
  return t.length <= s && t.includes('"frame"');
}
/**
 * 从工具结果文本中找出第一段可解析的 JSON 载荷。
 */
//@ chunk-kszbqxwr.js:1026-1173 placement
function readFirstJsonPayload(t) {
  for (let e of iterateTextContent(t)) {
    if (!z6o(e)) continue;
    let r = firstLineOf(
        e,
        `

`,
      ),
      n;
    try {
      n = jsonParse(r);
    } catch {
      continue;
    }
    let i = a(n);
    if (i !== null) return i;
  }
  return null;
}
//@ chunk-kszbqxwr.js:1173-1221 placement
var f = DoctorLazy(() => u({ frame: u({ slug: o().regex(ARTIFACT_SLUG_RE) }) }));
//@ chunk-kszbqxwr.js:1221-1298 placement
function a(t) {
  let safeParse = f().safeParse(t);
  return safeParse.success ? safeParse.data.frame.slug : null;
}
/**
 * 逐个产出内容中的文本（字符串或文本块）。
 */
//@ chunk-kszbqxwr.js:1298-1509 placement = extractErrorTypeFromData (1)
function* iterateTextContent(data) {
  if (typeof data === "string") {
    yield data;
    return;
  }
  if (!Array.isArray(data)) return;
  for (let e of data)
    if (
      e !== null &&
      typeof e === "object" &&
      "type" in e &&
      e.type === "text" &&
      "text" in e &&
      typeof e.text === "string"
    )
      yield e.text;
}

export { tor, iterateTextContent, z6o, isDocsConnectorTool, readFirstJsonPayload, isDocsConnectorUrl };
