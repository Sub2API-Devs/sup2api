/**
 * services/artifacts/autoEditAttribution.ts
 *
 * 2.1.316 新增：artifact 自动编辑的归因：暂存编辑基线与输入、匹配并消费落盘编辑、记录流水线回复来源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1jwzj2da.js (13)
 * attribution: placement 13
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { MAX_LINE_HINT_CHARS } from "../../utils/mcpOutputStorage.js";

//@ chunk-1jwzj2da.js:3543-3807 placement
/**
 * 暂存一次自动编辑的归属信息（按 slug 与预期的工具调用 id 登记），并限制链式发布 id 集合大小。（误归 mcpOutputStorage）
 */
function stageAutoEditAttribution(attribution) {
  let { staged, chainPublishIds, chainPublishSlots } = getLiveState().autoEditAttribution;
  let entry = {
    ...attribution,
    consumed: false,
  };
  staged.set(attribution.slug, entry);
  chainPublishSlots.set(attribution.expectedToolUseId, entry);
  chainPublishIds.add(attribution.expectedToolUseId);
  if (chainPublishIds.size > MAX_LINE_HINT_CHARS) {
    let oldest = chainPublishIds.values().next().value;
    if (oldest !== undefined) chainPublishIds.delete(oldest);
  }
  return entry;
}
//@ chunk-1jwzj2da.js:3807-3890 placement
/**
 * 判断某 id 是否在自动编辑归属的链发布集合中。
 */
function hasChainPublishId(toolUseId) {
  return toolUseId !== undefined && getLiveState().autoEditAttribution.chainPublishIds.has(toolUseId);
}
//@ chunk-1jwzj2da.js:3890-3982 placement
function chainPublishSlot(toolUseId) {
  if (toolUseId === undefined) return;
  return getLiveState().autoEditAttribution.chainPublishSlots.get(toolUseId);
}
//@ chunk-1jwzj2da.js:3982-4019 placement
/**
 * 判断某 id 是否有链发布槽。
 */
function hasChainPublishSlot(toolUseId) {
  return chainPublishSlot(toolUseId) !== undefined;
}
//@ chunk-1jwzj2da.js:4019-4115 placement
/**
 * 取走并清除某槽的往返标记。
 */
function takeRoundTripMark(toolUseId) {
  let slot = chainPublishSlot(toolUseId);
  let result = {
    roundTrip: slot?.roundTrip,
  };
  if (slot !== undefined) slot.roundTrip = undefined;
  return result;
}
//@ chunk-1jwzj2da.js:4115-4274 placement
/**
 * 工具调用 id 与暂存记录一致且未消费时，返回暂存的基础版本。
 */
function getStagedBaseVersion(slug, toolUseId) {
  let staged = getLiveState().autoEditAttribution.staged.get(slug);
  if (
    staged === undefined ||
    staged.consumed ||
    toolUseId === undefined ||
    staged.expectedToolUseId !== toolUseId
  )
    return null;
  return staged.baseVersion;
}
//@ chunk-1jwzj2da.js:4274-4577 placement
/**
 * 校验暂存记录与本次编辑输入完全一致（slug、工具调用 id、各字段），一致时返回内容哈希。
 */
function matchStagedEditInput(slug, toolUseId, input) {
  let staged = getLiveState().autoEditAttribution.staged.get(slug);
  if (
    staged === undefined ||
    staged.consumed ||
    toolUseId === undefined ||
    staged.expectedToolUseId !== toolUseId ||
    staged.slug !== slug
  )
    return null;
  let keys = Object.keys(input);
  let keys_2 = Object.keys(staged.input);
  if (keys.length !== keys_2.length || !keys_2.every((key) => input[key] === staged.input[key])) return null;
  return {
    contentSha256: staged.contentSha256,
  };
}
//@ chunk-1jwzj2da.js:4577-4821 placement
/**
 * 消费暂存的自动编辑归属，返回线程/评论 id 及记录版本回显的回调。
 */
function consumeStagedAttribution(slug, toolUseId) {
  let staged = getLiveState().autoEditAttribution.staged.get(slug);
  if (
    staged === undefined ||
    staged.consumed ||
    toolUseId === undefined ||
    staged.expectedToolUseId !== toolUseId
  )
    return null;
  staged.consumed = true;
  return {
    threadId: staged.threadId,
    commentId: staged.commentId,
    recordVersionEcho: (versionEcho) => {
      staged.versionEcho = versionEcho;
    },
  };
}
//@ chunk-1jwzj2da.js:4821-4998 placement
/**
 * 移除仍指向该记录的暂存与链式发布槽位。
 */
function clearStagedAttribution(slug) {
  let { staged, chainPublishSlots } = getLiveState().autoEditAttribution;
  if (staged.get(slug.slug) === slug) staged.delete(slug.slug);
  if (chainPublishSlots.get(slug.expectedToolUseId) === slug)
    chainPublishSlots.delete(slug.expectedToolUseId);
}
//@ chunk-1jwzj2da.js:4998-5101 placement
/**
 * 按预期工具调用 id 登记一次流水线回复来源。
 */
function registerPipelineReplyOrigin(origin) {
  let entry = {
    ...origin,
    consumed: false,
  };
  getLiveState().pipelineReplyOrigins.set(origin.expectedToolUseId, entry);
  return entry;
}
//@ chunk-1jwzj2da.js:5101-5265 placement
/**
 * 工具调用 id 对应的回复来源与 slug、线程匹配且未消费时标记已消费并返回 true。
 */
function consumePipelineReplyOrigin(slug, threadId, toolUseId) {
  let origin = toolUseId === undefined ? undefined : getLiveState().pipelineReplyOrigins.get(toolUseId);
  if (origin === undefined || origin.consumed || origin.slug !== slug || origin.threadId !== threadId)
    return false;
  origin.consumed = true;
  return true;
}
//@ chunk-1jwzj2da.js:5265-5331 placement
/**
 * 判断某 id 是否有 pipeline 回复来源。
 */
function hasPipelineReplyOrigin(toolUseId) {
  return toolUseId !== undefined && getLiveState().pipelineReplyOrigins.has(toolUseId);
}
//@ chunk-1jwzj2da.js:5331-5443 placement
/**
 * 移除仍指向该记录的流水线回复来源。
 */
function clearPipelineReplyOrigin(toolUseId) {
  let pipelineReplyOrigins = getLiveState().pipelineReplyOrigins;
  if (pipelineReplyOrigins.get(toolUseId.expectedToolUseId) === toolUseId)
    pipelineReplyOrigins.delete(toolUseId.expectedToolUseId);
}
export {
  hasPipelineReplyOrigin,
  hasChainPublishId,
  hasChainPublishSlot,
  getStagedBaseVersion,
  matchStagedEditInput,
  takeRoundTripMark,
  consumeStagedAttribution,
  registerPipelineReplyOrigin,
  clearPipelineReplyOrigin,
  stageAutoEditAttribution,
  clearStagedAttribution,
  consumePipelineReplyOrigin,
};
