/**
 * utils/mcpValidation.ts
 *
 * MCP 工具输出大小控制：输出 token 上限（MAX_MCP_OUTPUT_TOKENS）、是否需要截断的估算与 API 计数、文本/图片块截断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpValidation.ts
 * pieces: chunk-f8r3h98t.js (16)
 * attribution: affinity 1, fingerprint 2, layout 7, file-local 2, callgraph-fingerprint 1, callgraph-witnessed 3
 */
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { roughTokenCountEstimation, countMessagesTokensWithAPI } from "../services/tokenEstimation.js";
import { truncateToLength, truncateCodePoints } from "./stringUtils.js";
import { compressImageBlock, createImageMetadataText } from "./imageResizer.js";
import { dy } from "./toolResultStorage.js";
import { logError } from "./log.js";

//@ chunk-f8r3h98t.js:521-550 affinity
var ESTIMATE_SKIP_RATIO = 0.5,
  ESTIMATE_CERTAIN_RATIO = 4,
  IMAGE_TOKEN_ESTIMATE = 1600,
  DEFAULT_MAX_MCP_OUTPUT_TOKENS = 25000;
/**
 * getMaxMcpOutputTokens：MAX_MCP_OUTPUT_TOKENS > GrowthBook tengu_velvet_ibis.mcp_tool > 默认 25000。
 */
//@ chunk-f8r3h98t.js:550-729 fingerprint = getMaxMcpOutputTokens (0.606)
function getMaxMcpOutputTokens() {
  let envValue = env.MAX_MCP_OUTPUT_TOKENS;
  if (envValue !== void 0 && envValue > 0) return envValue;
  let override = getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_ibis", {})?.mcp_tool;
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return DEFAULT_MAX_MCP_OUTPUT_TOKENS;
}
/**
 * 去掉 MCP 结果中文本块的 `_meta` 字段（没有则原样返回同一数组）。
 */
//@ chunk-f8r3h98t.js:729-999 layout
function stripTextBlockMeta(e) {
  if (!e || typeof e === "string" || !Array.isArray(e)) return e;
  let n = e,
    r = !1;
  for (let o of n)
    if (o?.type === "text" && "_meta" in o && o._meta) {
      r = !0;
      break;
    }
  if (!r) return e;
  return n.map((o) => {
    if (o?.type === "text" && "_meta" in o && o._meta) {
      let { _meta: _meta, ...c } = o;
      return c;
    }
    return o;
  });
}
//@ chunk-f8r3h98t.js:999-1011 layout
var T = 65536;
/**
 * 若 MCP 结果文本块的 `_meta` 序列化后总长超过上限（或无法序列化），保留结果时去掉这些 `_meta` 并记日志；否则原样返回。
 */
//@ chunk-f8r3h98t.js:1011-1327 layout
function capTextBlockMeta(e) {
  if (!Array.isArray(e)) return e;
  let n = 0;
  for (let r of e) {
    if (r?.type !== "text" || !("_meta" in r) || !r._meta) continue;
    try {
      n += jsonStringify(r._meta).length;
    } catch {
      n = 1 / 0;
    }
    if (n > T)
      return (
        logForDebugging(
          `MCP result: text blocks' _meta (over ${T} characters of JSON in all, or not serializable) left off the retained result`,
        ),
        stripTextBlockMeta(e)
      );
  }
  return e;
}
//@ chunk-f8r3h98t.js:1327-1364 file-local
function isTextBlock(block) {
  return block.type === "text";
}
//@ chunk-f8r3h98t.js:1364-1402 layout = _temp (1)
function P(c) {
  return c.type === "image";
}
/**
 * 粗估 MCP 结果内容的 token 数：字符串按文本估算，数组累加文本块估算值与每张图片固定估值。
 */
//@ chunk-f8r3h98t.js:1402-1588 file-local
function getContentSizeEstimate(content) {
  if (!content) return 0;
  if (typeof content === "string") return roughTokenCountEstimation(content);
  if (!Array.isArray(content)) return 0;
  return content.reduce((total, block) => {
    if (isTextBlock(block)) return total + roughTokenCountEstimation(block.text);
    else if (P(block)) return total + IMAGE_TOKEN_ESTIMATE;
    return total;
  }, 0);
}
/**
 * MCP 输出字符上限 = 输出 token 上限 × 4。
 */
//@ chunk-f8r3h98t.js:1588-1616 layout
function getMaxMcpOutputChars() {
  return getMaxMcpOutputTokens() * 4;
}
//@ chunk-f8r3h98t.js:1616-1654 layout
var TRUNCATION_MARKER_PREFIX = "[OUTPUT TRUNCATED - exceeded ";
//@ chunk-f8r3h98t.js:1654-1809 layout
function imagesLeftOutText(e) {
  return e === 1
    ? "[Image left out: it did not fit in the tool output limit]"
    : `[${e} images left out: they did not fit in the tool output limit]`;
}
/**
 * getTruncationMessage：截断尾注 "[OUTPUT TRUNCATED - exceeded N token limit]" 加分页建议。
 */
//@ chunk-f8r3h98t.js:1809-2121 fingerprint = getTruncationMessage (1)
function getTruncationMessage() {
  return `

${TRUNCATION_MARKER_PREFIX}${getMaxMcpOutputTokens()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`;
}
/**
 * truncateContentBlocks：按字符预算截断内容块；文本截到剩余预算，图片按 1600 token 估算并尝试压缩，放不下的图片计数后插入"N images left out"说明（可另存）。
 */
//@ chunk-f8r3h98t.js:2121-3062 callgraph-fingerprint = truncateContentBlocks (0.475)
async function truncateContentBlocks(blocks, maxChars) {
  let result = [],
    currentChars = 0,
    leftOutInsertAt,
    leftOutImageIndices = [],
    stopIndex;
  for (let [f, a] of blocks.entries())
    if (isTextBlock(a)) {
      let s = maxChars - currentChars;
      if (s <= 0) {
        stopIndex = f;
        break;
      }
      if (a.text.length <= s) (result.push(a), (currentChars += a.text.length));
      else {
        let u = truncateToLength(a.text, s);
        if (u) {
          let m = { type: "text", text: u };
          if (a._meta) m._meta = a._meta;
          result.push(m);
        }
        stopIndex = f + 1;
        break;
      }
    } else if (P(a)) {
      let s = IMAGE_TOKEN_ESTIMATE * 4;
      if (currentChars + s <= maxChars) (result.push(a), (currentChars += s));
      else {
        let u = maxChars - currentChars,
          m;
        if (u > 0) {
          let remainingBytes = Math.floor(u * 0.75);
          m = await compressImageBlock(a, remainingBytes).catch(() => {
            return;
          });
        }
        if (m) (result.push(m), (currentChars += m.source.type === "base64" ? m.source.data.length : s));
        else {
          if (leftOutInsertAt === void 0)
            ((leftOutInsertAt = result.length), (currentChars += imagesLeftOutText(1).length));
          leftOutImageIndices.push(f);
        }
      }
    } else result.push(a);
  if (stopIndex !== void 0) {
    for (let f = stopIndex; f < blocks.length; f++) if (P(blocks[f])) leftOutImageIndices.push(f);
  }
  if (leftOutImageIndices.length > 0) {
    let f = dy(),
      results = await Promise.all(
        leftOutImageIndices.map(async (s) => {
          let u = blocks[s];
          return P(u) && u.source.type === "base64"
            ? ((await f?.saveLeftOut?.(u.source.data).catch(() => null)) ?? null)
            : null;
        }),
      );
    result.splice(
      leftOutInsertAt ?? result.length,
      0,
      { type: "text", text: imagesLeftOutText(leftOutImageIndices.length) },
      ...results.flatMap((s) => {
        let u = s === null ? null : createImageMetadataText({}, s.path);
        return u === null ? [] : [{ type: "text", text: u }];
      }),
    );
  }
  return result;
}
/**
 * mcpContentNeedsTruncation：先用粗估（≤上限×0.5 不截、> 上限×4 必截），中间区域用 API 计 token 判断是否超过 MCP 输出上限。
 */
//@ chunk-f8r3h98t.js:3062-3348 callgraph-witnessed = mcpContentNeedsTruncation (1)
async function mcpContentNeedsTruncation(content, credentials) {
  if (!content) return !1;
  let contentSizeEstimate = getContentSizeEstimate(content);
  if (contentSizeEstimate <= getMaxMcpOutputTokens() * ESTIMATE_SKIP_RATIO) return !1;
  if (
    getContentSizeEstimate(typeof content === "string" ? content : content.filter(isTextBlock)) >
    getMaxMcpOutputTokens() * ESTIMATE_CERTAIN_RATIO
  )
    return !0;
  try {
    return (
      ((await countMessagesTokensWithAPI(
        typeof content === "string"
          ? [{ role: "user", content: content }]
          : [{ role: "user", content: content }],
        [],
        void 0,
        { credentials: credentials },
      )) ?? contentSizeEstimate) > getMaxMcpOutputTokens()
    );
  } catch (error) {
    return (logError(error), contentSizeEstimate > getMaxMcpOutputTokens());
  }
}
/**
 * truncateMcpContent：字符串按 token 上限×4 字符截断，块数组走 truncateContentBlocks，都追加截断说明。
 */
//@ chunk-f8r3h98t.js:3348-3506 callgraph-witnessed = truncateMcpContent (0)
async function truncateMcpContent(content) {
  if (!content) return content;
  let maxChars = getMaxMcpOutputChars(),
    truncationMsg = getTruncationMessage();
  if (typeof content === "string") return truncateCodePoints(content, maxChars) + truncationMsg;
  else {
    let truncatedBlocks = await truncateContentBlocks(content, maxChars);
    return (truncatedBlocks.push({ type: "text", text: truncationMsg }), truncatedBlocks);
  }
}
/**
 * truncateMcpContentIfNeeded：需要时才截断。
 */
//@ chunk-f8r3h98t.js:3506-3578 callgraph-witnessed = truncateMcpContentIfNeeded (0)
async function truncateMcpContentIfNeeded(e, n) {
  if (!(await mcpContentNeedsTruncation(e, n))) return e;
  return await truncateMcpContent(e);
}

export {
  getMaxMcpOutputChars,
  stripTextBlockMeta,
  mcpContentNeedsTruncation,
  getContentSizeEstimate,
  truncateMcpContentIfNeeded,
  truncateMcpContent,
  capTextBlockMeta,
};
