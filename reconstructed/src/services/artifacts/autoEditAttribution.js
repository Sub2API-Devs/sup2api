/**
 * services/artifacts/autoEditAttribution.ts
 *
 * 2.1.316 新增：artifact 自动编辑的归因：暂存编辑基线与输入、匹配并消费落盘编辑、记录流水线回复来源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bhxaz9j0.js (8)
 * attribution: placement 8
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { MAX_LINE_HINT_CHARS } from "../../utils/mcpOutputStorage.js";

//@ chunk-bhxaz9j0.js:5945-6209 placement
/**
 * 暂存一次自动编辑的归属信息（按 slug 与预期的工具调用 id 登记），并限制链式发布 id 集合大小。（误归 mcpOutputStorage）
 */
function stageAutoEditAttribution(e) {
  let { staged, chainPublishIds, chainPublishSlots } = getLiveState().autoEditAttribution;
  let o = {
    ...e,
    consumed: false,
  };
  staged.set(e.slug, o);
  chainPublishSlots.set(e.expectedToolUseId, o);
  chainPublishIds.add(e.expectedToolUseId);
  if (chainPublishIds.size > MAX_LINE_HINT_CHARS) {
    let s = chainPublishIds.values().next().value;
    if (s !== undefined) chainPublishIds.delete(s);
  }
  return o;
}
//@ chunk-bhxaz9j0.js:6517-6676 placement
/**
 * 工具调用 id 与暂存记录一致且未消费时，返回暂存的基础版本。
 */
function getStagedBaseVersion(e, toolUseId) {
  let n = getLiveState().autoEditAttribution.staged.get(e);
  if (n === undefined || n.consumed || toolUseId === undefined || n.expectedToolUseId !== toolUseId)
    return null;
  return n.baseVersion;
}
//@ chunk-bhxaz9j0.js:6676-6979 placement
/**
 * 校验暂存记录与本次编辑输入完全一致（slug、工具调用 id、各字段），一致时返回内容哈希。
 */
function matchStagedEditInput(slug, toolUseId, n) {
  let i = getLiveState().autoEditAttribution.staged.get(slug);
  if (
    i === undefined ||
    i.consumed ||
    toolUseId === undefined ||
    i.expectedToolUseId !== toolUseId ||
    i.slug !== slug
  )
    return null;
  let keys = Object.keys(n);
  let keys_2 = Object.keys(i.input);
  if (keys.length !== keys_2.length || !keys_2.every((u) => n[u] === i.input[u])) return null;
  return {
    contentSha256: i.contentSha256,
  };
}
//@ chunk-bhxaz9j0.js:6979-7223 placement
/**
 * 消费暂存的自动编辑归属，返回线程/评论 id 及记录版本回显的回调。
 */
function consumeStagedAttribution(e, toolUseId) {
  let n = getLiveState().autoEditAttribution.staged.get(e);
  if (n === undefined || n.consumed || toolUseId === undefined || n.expectedToolUseId !== toolUseId)
    return null;
  n.consumed = true;
  return {
    threadId: n.threadId,
    commentId: n.commentId,
    recordVersionEcho: (versionEcho) => {
      n.versionEcho = versionEcho;
    },
  };
}
//@ chunk-bhxaz9j0.js:7223-7400 placement
/**
 * 移除仍指向该记录的暂存与链式发布槽位。
 */
function clearStagedAttribution(e) {
  let { staged, chainPublishSlots } = getLiveState().autoEditAttribution;
  if (staged.get(e.slug) === e) staged.delete(e.slug);
  if (chainPublishSlots.get(e.expectedToolUseId) === e) chainPublishSlots.delete(e.expectedToolUseId);
}
//@ chunk-bhxaz9j0.js:7400-7503 placement
/**
 * 按预期工具调用 id 登记一次流水线回复来源。
 */
function registerPipelineReplyOrigin(e) {
  let r = {
    ...e,
    consumed: false,
  };
  getLiveState().pipelineReplyOrigins.set(e.expectedToolUseId, r);
  return r;
}
//@ chunk-bhxaz9j0.js:7503-7667 placement
/**
 * 工具调用 id 对应的回复来源与 slug、线程匹配且未消费时标记已消费并返回 true。
 */
function consumePipelineReplyOrigin(slug, threadId, toolUseId) {
  let i = toolUseId === undefined ? undefined : getLiveState().pipelineReplyOrigins.get(toolUseId);
  if (i === undefined || i.consumed || i.slug !== slug || i.threadId !== threadId) return false;
  i.consumed = true;
  return true;
}
//@ chunk-bhxaz9j0.js:7733-7845 placement
/**
 * 移除仍指向该记录的流水线回复来源。
 */
function clearPipelineReplyOrigin(e) {
  let pipelineReplyOrigins = getLiveState().pipelineReplyOrigins;
  if (pipelineReplyOrigins.get(e.expectedToolUseId) === e) pipelineReplyOrigins.delete(e.expectedToolUseId);
}
export {
  consumePipelineReplyOrigin,
  getStagedBaseVersion,
  matchStagedEditInput,
  consumeStagedAttribution,
  registerPipelineReplyOrigin,
  clearPipelineReplyOrigin,
  stageAutoEditAttribution,
  clearStagedAttribution,
};
