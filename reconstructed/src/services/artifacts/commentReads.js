/**
 * services/artifacts/commentReads.ts
 *
 * 2.1.316 新增。Artifact 评论读取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bf8g35sz.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-bf8g35sz.js:263-273 placement
/**
 * 评论读取记录（按工具调用 id、按 slug）表的容量上限 256。
 */
var MAX_TRACKED_COMMENT_READS = 256;
//@ chunk-bf8g35sz.js:273-362 placement
/**
 * 导出函数 `newLaneNoticeId`：参数 e = randomUUID(，返回 e。
 */
function newLaneNoticeId(handOff = randomUUID(), reason) {
  if (reason !== undefined) {
    let laneNoticeSlugs = getLiveState().laneNoticeSlugs;
    laneNoticeSlugs.set(handOff, reason);
    evictOldest(laneNoticeSlugs);
  }
  return handOff;
}
//@ chunk-bf8g35sz.js:362-413 placement
/**
 * 导出函数 `laneNoticeSlug`：参数 e，返回 getLiveState().laneNoticeSlugs.get(e)。
 */
function laneNoticeSlug(uuid) {
  return getLiveState().laneNoticeSlugs.get(uuid);
}
//@ chunk-bf8g35sz.js:413-658 placement
/**
 * 记录一次评论读取：按工具调用 id 记 slug 与是否只读自己的评论，更新该 slug 最近读取时间（表有上限）；读到他人评论时更新 lastOthersCommentReadAt。
 */
function recordCommentRead(toolUseId, slug, record) {
  let liveState = getLiveState();
  let now = Date.now();
  if (toolUseId !== undefined) {
    liveState.commentReads.set(toolUseId, {
      slug,
      ownWordsOnly: record,
    });
    evictOldest(liveState.commentReads);
  }
  liveState.commentReadAtBySlug.delete(slug);
  liveState.commentReadAtBySlug.set(slug, now);
  if (evictOldest(liveState.commentReadAtBySlug) || !record) liveState.lastOthersCommentReadAt = now;
}
//@ chunk-bf8g35sz.js:658-706 placement
/**
 * 导出函数 `commentReadFor`：参数 e，返回 getLiveState().commentReads.get(e)。
 */
function commentReadFor(id) {
  return getLiveState().commentReads.get(id);
}
//@ chunk-bf8g35sz.js:706-819 placement
/**
 * 判断除给定 slug 外，是否有在某时间之后读过评论的 artifact。
 */
function hasOtherRecentCommentRead(slug, toolUseId) {
  for (let [otherSlug, at] of getLiveState().commentReadAtBySlug)
    if (otherSlug !== slug && !(Number.isFinite(toolUseId) && at < toolUseId)) return true;
  return false;
}
//@ chunk-bf8g35sz.js:819-870 placement
/**
 * 导出函数 `lastOthersCommentReadAt`：返回 getLiveState().lastOthersCommentReadAt。
 */
function lastOthersCommentReadAt() {
  return getLiveState().lastOthersCommentReadAt;
}
//@ chunk-bf8g35sz.js:870-969 placement
function evictOldest(map) {
  if (map.size <= MAX_TRACKED_COMMENT_READS) return false;
  let oldest = map.keys().next().value;
  if (oldest !== undefined) map.delete(oldest);
  return true;
}
export {
  recordCommentRead,
  lastOthersCommentReadAt,
  hasOtherRecentCommentRead,
  newLaneNoticeId,
  laneNoticeSlug,
  commentReadFor,
};
