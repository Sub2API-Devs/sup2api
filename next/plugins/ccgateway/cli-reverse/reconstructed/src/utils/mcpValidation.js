/**
 * utils/mcpValidation.ts
 *
 * MCP 工具输出大小控制：输出 token 上限（MAX_MCP_OUTPUT_TOKENS）、是否需要截断的估算与 API 计数、文本/图片块截断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpValidation.ts
 * pieces: chunk-0rd17ynw.js (15)
 * attribution: affinity 1, fingerprint 2, placement 7, layout 2, callgraph-fingerprint 1, callgraph-witnessed 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { roughTokenCountEstimation, countMessagesTokensWithAPI } from "../services/tokenEstimation.js";
import { isImageBlock } from "../components/CustomSelect/select-input-option.js";
import { truncateToLength, truncateCodePoints } from "./stringUtils.js";
import { compressImageBlock, createImageMetadataText } from "./imageResizer.js";
import { toolResultStoreOrNull } from "./toolResultStorage.js";
import { logError } from "./log.js";

//@ chunk-0rd17ynw.js:520-549 affinity
var ESTIMATE_SKIP_RATIO = 0.5;
var ESTIMATE_CERTAIN_RATIO = 4;
var IMAGE_TOKEN_ESTIMATE = 1600;
var DEFAULT_MAX_MCP_OUTPUT_TOKENS = 25000;
//@ chunk-0rd17ynw.js:549-728 fingerprint (2.1.88 match: getMaxMcpOutputTokens, 0.552)
/**
 * getMaxMcpOutputTokens：MAX_MCP_OUTPUT_TOKENS > GrowthBook tengu_velvet_ibis.mcp_tool > 默认 25000。
 */
function getMaxMcpOutputTokens() {
  let envValue = env.MAX_MCP_OUTPUT_TOKENS;
  if (envValue !== undefined && envValue > 0) return envValue;
  let override = getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_ibis", {})?.mcp_tool;
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return DEFAULT_MAX_MCP_OUTPUT_TOKENS;
}
//@ chunk-0rd17ynw.js:728-998 placement
/**
 * 去掉 MCP 结果中文本块的 `_meta` 字段（没有则原样返回同一数组）。
 */
function stripTextBlockMeta(content) {
  if (!content || typeof content === "string" || !Array.isArray(content)) return content;
  let blocks = content;
  let hasMeta = false;
  for (let block of blocks)
    if (block?.type === "text" && "_meta" in block && block._meta) {
      hasMeta = true;
      break;
    }
  if (!hasMeta) return content;
  return blocks.map((block) => {
    if (block?.type === "text" && "_meta" in block && block._meta) {
      let { _meta, ...blockWithoutMeta } = block;
      return blockWithoutMeta;
    }
    return block;
  });
}
//@ chunk-0rd17ynw.js:998-1010 placement
var MAX_META_JSON_CHARS = 65536;
//@ chunk-0rd17ynw.js:1010-1326 placement
/**
 * 若 MCP 结果文本块的 `_meta` 序列化后总长超过上限（或无法序列化），保留结果时去掉这些 `_meta` 并记日志；否则原样返回。
 */
function capTextBlockMeta(content) {
  if (!Array.isArray(content)) return content;
  let metaChars = 0;
  for (let block of content) {
    if (block?.type !== "text" || !("_meta" in block) || !block._meta) continue;
    try {
      metaChars += jsonStringify(block._meta).length;
    } catch {
      metaChars = 1 / 0;
    }
    if (metaChars > MAX_META_JSON_CHARS) {
      logForDebugging(
        `MCP result: text blocks' _meta (over ${MAX_META_JSON_CHARS} characters of JSON in all, or not serializable) left off the retained result`,
      );
      return stripTextBlockMeta(content);
    }
  }
  return content;
}
//@ chunk-0rd17ynw.js:1326-1363 placement
function isTextBlock(block) {
  return block.type === "text";
}
//@ chunk-0rd17ynw.js:1401-1587 placement
/**
 * 粗估 MCP 结果内容的 token 数：字符串按文本估算，数组累加文本块估算值与每张图片固定估值。
 */
function getContentSizeEstimate(content) {
  if (!content) return 0;
  if (typeof content === "string") return roughTokenCountEstimation(content);
  if (!Array.isArray(content)) return 0;
  return content.reduce((total, block) => {
    if (isTextBlock(block)) return total + roughTokenCountEstimation(block.text);
    else if (isImageBlock(block)) return total + IMAGE_TOKEN_ESTIMATE;
    return total;
  }, 0);
}
//@ chunk-0rd17ynw.js:1587-1615 placement
/**
 * MCP 输出字符上限 = 输出 token 上限 × 4。
 */
function getMaxMcpOutputChars() {
  return getMaxMcpOutputTokens() * 4;
}
//@ chunk-0rd17ynw.js:1615-1653 layout
var TRUNCATION_MARKER_PREFIX = "[OUTPUT TRUNCATED - exceeded ";
//@ chunk-0rd17ynw.js:1653-1808 layout
function imagesLeftOutText(imageCount) {
  return imageCount === 1
    ? "[Image left out: it did not fit in the tool output limit]"
    : `[${imageCount} images left out: they did not fit in the tool output limit]`;
}
//@ chunk-0rd17ynw.js:1808-2120 fingerprint (2.1.88 match: getTruncationMessage, 1)
/**
 * getTruncationMessage：截断尾注 "[OUTPUT TRUNCATED - exceeded N token limit]" 加分页建议。
 */
function getTruncationMessage() {
  return `

${TRUNCATION_MARKER_PREFIX}${getMaxMcpOutputTokens()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`;
}
//@ chunk-0rd17ynw.js:2120-3060 callgraph-fingerprint (2.1.88 match: truncateContentBlocks, 0.472)
/**
 * truncateContentBlocks：按字符预算截断内容块；文本截到剩余预算，图片按 1600 token 估算并尝试压缩，放不下的图片计数后插入"N images left out"说明（可另存）。
 */
async function truncateContentBlocks(blocks, maxChars) {
  let result = [];
  let currentChars = 0;
  let leftOutInsertAt;
  let leftOutImageIndices = [];
  let stopIndex;
  for (let [index, block] of blocks.entries())
    if (isTextBlock(block)) {
      let remainingChars = maxChars - currentChars;
      if (remainingChars <= 0) {
        stopIndex = index;
        break;
      }
      if (block.text.length <= remainingChars) {
        result.push(block);
        currentChars += block.text.length;
      } else {
        let truncatedText = truncateToLength(block.text, remainingChars);
        if (truncatedText) {
          let truncatedBlock = {
            type: "text",
            text: truncatedText,
          };
          if (block._meta) truncatedBlock._meta = block._meta;
          result.push(truncatedBlock);
        }
        stopIndex = index + 1;
        break;
      }
    } else if (isImageBlock(block)) {
      let imageChars = IMAGE_TOKEN_ESTIMATE * 4;
      if (currentChars + imageChars <= maxChars) {
        result.push(block);
        currentChars += imageChars;
      } else {
        let remainingChars = maxChars - currentChars;
        let compressedBlock;
        if (remainingChars > 0) {
          let remainingBytes = Math.floor(remainingChars * 0.75);
          compressedBlock = await compressImageBlock(block, remainingBytes).catch(() => {
            return;
          });
        }
        if (compressedBlock) {
          result.push(compressedBlock);
          currentChars +=
            compressedBlock.source.type === "base64" ? compressedBlock.source.data.length : imageChars;
        } else {
          if (leftOutInsertAt === undefined) {
            leftOutInsertAt = result.length;
            currentChars += imagesLeftOutText(1).length;
          }
          leftOutImageIndices.push(index);
        }
      }
    } else result.push(block);
  if (stopIndex !== undefined) {
    for (let tailIndex = stopIndex; tailIndex < blocks.length; tailIndex++)
      if (isImageBlock(blocks[tailIndex])) leftOutImageIndices.push(tailIndex);
  }
  if (leftOutImageIndices.length > 0) {
    let store = toolResultStoreOrNull();
    let results = await Promise.all(
      leftOutImageIndices.map(async (leftOutImageIndex) => {
        let block = blocks[leftOutImageIndex];
        return isImageBlock(block) && block.source.type === "base64"
          ? ((await store?.saveLeftOut?.(block.source.data).catch(() => null)) ?? null)
          : null;
      }),
    );
    result.splice(
      leftOutInsertAt ?? result.length,
      0,
      {
        type: "text",
        text: imagesLeftOutText(leftOutImageIndices.length),
      },
      ...results.flatMap((saved) => {
        let metadataText = saved === null ? null : createImageMetadataText({}, saved.path);
        return metadataText === null
          ? []
          : [
              {
                type: "text",
                text: metadataText,
              },
            ];
      }),
    );
  }
  return result;
}
//@ chunk-0rd17ynw.js:3060-3346 callgraph-witnessed (2.1.88 match: mcpContentNeedsTruncation, 1)
/**
 * mcpContentNeedsTruncation：先用粗估（≤上限×0.5 不截、> 上限×4 必截），中间区域用 API 计 token 判断是否超过 MCP 输出上限。
 */
async function mcpContentNeedsTruncation(content, credentials) {
  if (!content) return false;
  let contentSizeEstimate = getContentSizeEstimate(content);
  if (contentSizeEstimate <= getMaxMcpOutputTokens() * ESTIMATE_SKIP_RATIO) return false;
  if (
    getContentSizeEstimate(typeof content === "string" ? content : content.filter(isTextBlock)) >
    getMaxMcpOutputTokens() * ESTIMATE_CERTAIN_RATIO
  )
    return true;
  try {
    return (
      ((await countMessagesTokensWithAPI(
        typeof content === "string"
          ? [
              {
                role: "user",
                content,
              },
            ]
          : [
              {
                role: "user",
                content,
              },
            ],
        [],
        undefined,
        {
          credentials,
        },
      )) ?? contentSizeEstimate) > getMaxMcpOutputTokens()
    );
  } catch (error) {
    logError(error);
    return contentSizeEstimate > getMaxMcpOutputTokens();
  }
}
//@ chunk-0rd17ynw.js:3346-3504 callgraph-witnessed (2.1.88 match: truncateMcpContent, 0)
/**
 * truncateMcpContent：字符串按 token 上限×4 字符截断，块数组走 truncateContentBlocks，都追加截断说明。
 */
async function truncateMcpContent(content) {
  if (!content) return content;
  let maxChars = getMaxMcpOutputChars();
  let truncationMsg = getTruncationMessage();
  if (typeof content === "string") return truncateCodePoints(content, maxChars) + truncationMsg;
  else {
    let truncatedBlocks = await truncateContentBlocks(content, maxChars);
    truncatedBlocks.push({
      type: "text",
      text: truncationMsg,
    });
    return truncatedBlocks;
  }
}
//@ chunk-0rd17ynw.js:3504-3576 placement
/**
 * truncateMcpContentIfNeeded：需要时才截断。
 */
async function truncateMcpContentIfNeeded(content, credentials) {
  if (!(await mcpContentNeedsTruncation(content, credentials))) return content;
  return await truncateMcpContent(content);
}
export {
  stripTextBlockMeta,
  mcpContentNeedsTruncation,
  getContentSizeEstimate,
  truncateMcpContentIfNeeded,
  truncateMcpContent,
  getMaxMcpOutputChars,
  capTextBlockMeta,
};
