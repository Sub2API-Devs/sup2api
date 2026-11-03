/**
 * services/artifacts/autoEditAttribution.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bhxaz9j0.js (8)
 * attribution: placement 8
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { B } from "../../utils/mcpOutputStorage.js";

/**
 * 暂存一次自动编辑的归属信息（按 slug 与预期的工具调用 id 登记），并限制链式发布 id 集合大小。（误归 mcpOutputStorage）
 */
//@ chunk-bhxaz9j0.js:5945-6209 placement
function stageAutoEditAttribution(e) {
  let {
      staged: staged,
      chainPublishIds: chainPublishIds,
      chainPublishSlots: chainPublishSlots,
    } = getLiveState().autoEditAttribution,
    o = { ...e, consumed: !1 };
  if (
    (staged.set(e.slug, o),
    chainPublishSlots.set(e.expectedToolUseId, o),
    chainPublishIds.add(e.expectedToolUseId),
    chainPublishIds.size > B)
  ) {
    let s = chainPublishIds.values().next().value;
    if (s !== void 0) chainPublishIds.delete(s);
  }
  return o;
}
/**
 * 工具调用 id 与暂存记录一致且未消费时，返回暂存的基础版本。
 */
//@ chunk-bhxaz9j0.js:6517-6676 placement
function getStagedBaseVersion(e, r) {
  let n = getLiveState().autoEditAttribution.staged.get(e);
  if (n === void 0 || n.consumed || r === void 0 || n.expectedToolUseId !== r) return null;
  return n.baseVersion;
}
/**
 * 校验暂存记录与本次编辑输入完全一致（slug、工具调用 id、各字段），一致时返回内容哈希。
 */
//@ chunk-bhxaz9j0.js:6676-6979 placement
function matchStagedEditInput(e, r, n) {
  let i = getLiveState().autoEditAttribution.staged.get(e);
  if (i === void 0 || i.consumed || r === void 0 || i.expectedToolUseId !== r || i.slug !== e) return null;
  let keys = Object.keys(n),
    keys_2 = Object.keys(i.input);
  if (keys.length !== keys_2.length || !keys_2.every((u) => n[u] === i.input[u])) return null;
  return { contentSha256: i.contentSha256 };
}
/**
 * 消费暂存的自动编辑归属，返回线程/评论 id 及记录版本回显的回调。
 */
//@ chunk-bhxaz9j0.js:6979-7223 placement
function consumeStagedAttribution(e, r) {
  let n = getLiveState().autoEditAttribution.staged.get(e);
  if (n === void 0 || n.consumed || r === void 0 || n.expectedToolUseId !== r) return null;
  return (
    (n.consumed = !0),
    {
      threadId: n.threadId,
      commentId: n.commentId,
      recordVersionEcho: (i) => {
        n.versionEcho = i;
      },
    }
  );
}
/**
 * 移除仍指向该记录的暂存与链式发布槽位。
 */
//@ chunk-bhxaz9j0.js:7223-7400 placement
function clearStagedAttribution(e) {
  let { staged: staged, chainPublishSlots: chainPublishSlots } = getLiveState().autoEditAttribution;
  if (staged.get(e.slug) === e) staged.delete(e.slug);
  if (chainPublishSlots.get(e.expectedToolUseId) === e) chainPublishSlots.delete(e.expectedToolUseId);
}
/**
 * 按预期工具调用 id 登记一次流水线回复来源。
 */
//@ chunk-bhxaz9j0.js:7400-7503 placement
function registerPipelineReplyOrigin(e) {
  let r = { ...e, consumed: !1 };
  return (getLiveState().pipelineReplyOrigins.set(e.expectedToolUseId, r), r);
}
/**
 * 工具调用 id 对应的回复来源与 slug、线程匹配且未消费时标记已消费并返回 true。
 */
//@ chunk-bhxaz9j0.js:7503-7667 placement
function consumePipelineReplyOrigin(e, r, n) {
  let i = n === void 0 ? void 0 : getLiveState().pipelineReplyOrigins.get(n);
  if (i === void 0 || i.consumed || i.slug !== e || i.threadId !== r) return !1;
  return ((i.consumed = !0), !0);
}
/**
 * 移除仍指向该记录的流水线回复来源。
 */
//@ chunk-bhxaz9j0.js:7733-7845 placement
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
