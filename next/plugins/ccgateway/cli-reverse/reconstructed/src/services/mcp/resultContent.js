/**
 * services/mcp/resultContent.ts
 *
 * 2.1.316 新增：MCP 结果内容转换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kq89f1h5.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { DOCS_MCP_PATH } from "./firstPartyServerIds.js";
import { requestIdMeta as requestIdMeta_2 } from "../artifacts/frameApi.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kq89f1h5.js:2312-2428 placement
/**
 * 判断配置地址是否是一方 Docs 连接器的 MCP 路径。
 */
function isDocsConnectorUrl(config) {
  try {
    let url = new URL(config.url);
    return url.protocol === "https:" && isFirstPartyAnthropicHost(url.href) && url.pathname === DOCS_MCP_PATH;
  } catch {
    return false;
  }
}
//@ chunk-kq89f1h5.js:2428-2516 placement
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
//@ chunk-kq89f1h5.js:2516-2551 placement
/**
 * Docs 连接器的写工具名（create、update）。
 */
var DOCS_WRITE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-kq89f1h5.js:2516", () => {
  DOCS_WRITE_TOOLS = new Set(["create", "update"]);
});
//@ chunk-kq89f1h5.js:2551-2787 placement
/**
 * 判断工具是否是 claude.ai Docs 连接器提供的特定工具。
 */
function isDocsConnectorTool(tool, clients) {
  let mcpInfo = tool.mcpInfo;
  if (mcpInfo === undefined || mcpInfo.scope !== "claudeai" || !DOCS_WRITE_TOOLS.has(mcpInfo.toolName))
    return false;
  let found = clients.find((client) => client.name === mcpInfo.serverName);
  return (
    found !== undefined &&
    found.config.scope === "claudeai" &&
    found.config.type === "claudeai-proxy" &&
    isDocsConnectorUrl(found.config)
  );
}
//@ chunk-kq89f1h5.js:2787-2799 placement
/**
 * 含 frame 载荷的文本最大字符数（65536）。
 */
var MAX_FRAME_PAYLOAD_CHARS = 65536;
//@ chunk-kq89f1h5.js:2799-2857 placement
/**
 * 判断文本是否可能含 frame 载荷。
 */
function hasFramePayload(text) {
  return text.length <= MAX_FRAME_PAYLOAD_CHARS && text.includes('"frame"');
}
//@ chunk-kq89f1h5.js:2857-3004 placement
/**
 * 从工具结果文本中找出第一段可解析的 JSON 载荷。
 */
function readFirstJsonPayload(content) {
  for (let text of iterateTextContent(content)) {
    if (!hasFramePayload(text)) continue;
    let firstLine = firstLineOf(
      text,
      `

`,
    );
    let parsed;
    try {
      parsed = jsonParse(firstLine);
    } catch {
      continue;
    }
    let slug = frameSlugOf(parsed);
    if (slug !== null) return slug;
  }
  return null;
}
//@ chunk-kq89f1h5.js:3004-3052 placement
/**
 * 含 frame.slug 的 JSON schema。
 */
var frameSlugSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kq89f1h5.js:3004", () => {
  frameSlugSchema = DoctorLazy(() =>
    objectSchema({
      frame: objectSchema({
        slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      }),
    }),
  );
});
//@ chunk-kq89f1h5.js:3052-3129 placement
/**
 * 从 JSON 文本里取 frame.slug（失败返回 null）。
 */
function frameSlugOf(value) {
  let parseResult = frameSlugSchema().safeParse(value);
  return parseResult.success ? parseResult.data.frame.slug : null;
}
//@ chunk-kq89f1h5.js:3129-3340 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 逐个产出内容中的文本（字符串或文本块）。
 */
function* iterateTextContent(data) {
  if (typeof data === "string") {
    yield data;
    return;
  }
  if (!Array.isArray(data)) return;
  for (let block of data)
    if (
      block !== null &&
      typeof block === "object" &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    )
      yield block.text;
}
export {
  requestIdMeta,
  isDocsConnectorUrl,
  isDocsConnectorTool,
  readFirstJsonPayload,
  iterateTextContent,
  hasFramePayload,
};
