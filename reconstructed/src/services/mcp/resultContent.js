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
import { requestIdMeta as requestIdMeta_2 } from "../artifacts/frameApi.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";

//@ chunk-kszbqxwr.js:481-597 placement
/**
 * 判断配置地址是否是一方 Docs 连接器的 MCP 路径。
 */
function isDocsConnectorUrl(config) {
  try {
    let e = new URL(config.url);
    return e.protocol === "https:" && isFirstPartyAnthropicHost(e.href) && e.pathname === DOCS_MCP_PATH;
  } catch {
    return false;
  }
}
//@ chunk-kszbqxwr.js:597-685 placement
/**
 * 把结果里的 request_id 转成 anthropic/requestId 元数据。
 */
function requestIdMeta(requestId) {
  let { request_id: requestId_2 } = requestIdMeta_2(requestId);
  return requestId_2 === undefined
    ? {}
    : {
        "anthropic/requestId": requestId_2,
      };
}
//@ chunk-kszbqxwr.js:685-720 placement
/**
 * Docs 连接器的写工具名（create、update）。
 */
var DOCS_WRITE_TOOLS = new Set(["create", "update"]);
//@ chunk-kszbqxwr.js:720-956 placement
/**
 * 判断工具是否是 claude.ai Docs 连接器提供的特定工具。
 */
function isDocsConnectorTool(tool, clients) {
  let mcpInfo = tool.mcpInfo;
  if (mcpInfo === undefined || mcpInfo.scope !== "claudeai" || !DOCS_WRITE_TOOLS.has(mcpInfo.toolName))
    return false;
  let found = clients.find((i) => i.name === mcpInfo.serverName);
  return (
    found !== undefined &&
    found.config.scope === "claudeai" &&
    found.config.type === "claudeai-proxy" &&
    isDocsConnectorUrl(found.config)
  );
}
//@ chunk-kszbqxwr.js:956-968 placement
/**
 * 含 frame 载荷的文本最大字符数（65536）。
 */
var MAX_FRAME_PAYLOAD_CHARS = 65536;
//@ chunk-kszbqxwr.js:968-1026 placement
/**
 * 判断文本是否可能含 frame 载荷。
 */
function hasFramePayload(t) {
  return t.length <= MAX_FRAME_PAYLOAD_CHARS && t.includes('"frame"');
}
//@ chunk-kszbqxwr.js:1026-1173 placement
/**
 * 从工具结果文本中找出第一段可解析的 JSON 载荷。
 */
function readFirstJsonPayload(t) {
  for (let e of iterateTextContent(t)) {
    if (!hasFramePayload(e)) continue;
    let r = firstLineOf(
      e,
      `

`,
    );
    let n;
    try {
      n = jsonParse(r);
    } catch {
      continue;
    }
    let i = frameSlugOf(n);
    if (i !== null) return i;
  }
  return null;
}
//@ chunk-kszbqxwr.js:1173-1221 placement
/**
 * 含 frame.slug 的 JSON schema。
 */
var frameSlugSchema = DoctorLazy(() =>
  u({
    frame: u({
      slug: string().regex(ARTIFACT_SLUG_RE),
    }),
  }),
);
//@ chunk-kszbqxwr.js:1221-1298 placement
/**
 * 从 JSON 文本里取 frame.slug（失败返回 null）。
 */
function frameSlugOf(t) {
  let e = frameSlugSchema().safeParse(t);
  return e.success ? e.data.frame.slug : null;
}
//@ chunk-kszbqxwr.js:1298-1509 placement = extractErrorTypeFromData (1)
/**
 * 逐个产出内容中的文本（字符串或文本块）。
 */
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
export {
  requestIdMeta,
  iterateTextContent,
  hasFramePayload,
  isDocsConnectorTool,
  readFirstJsonPayload,
  isDocsConnectorUrl,
};
