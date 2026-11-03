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
var m = 256;
//@ chunk-bf8g35sz.js:273-362 placement
function hqn(e = randomUUID(), t) {
  if (t !== void 0) {
    let laneNoticeSlugs = getLiveState().laneNoticeSlugs;
    (laneNoticeSlugs.set(e, t), r(laneNoticeSlugs));
  }
  return e;
}
//@ chunk-bf8g35sz.js:362-413 placement
function fGs(e) {
  return getLiveState().laneNoticeSlugs.get(e);
}
/**
 * 记录一次评论读取：按工具调用 id 记 slug 与是否只读自己的评论，更新该 slug 最近读取时间（表有上限）；读到他人评论时更新 lastOthersCommentReadAt。
 */
//@ chunk-bf8g35sz.js:413-658 placement
function recordCommentRead(e, t, o) {
  let n = getLiveState(),
    now = Date.now();
  if (e !== void 0) (n.commentReads.set(e, { slug: t, ownWordsOnly: o }), r(n.commentReads));
  if ((n.commentReadAtBySlug.delete(t), n.commentReadAtBySlug.set(t, now), r(n.commentReadAtBySlug) || !o))
    n.lastOthersCommentReadAt = now;
}
//@ chunk-bf8g35sz.js:658-706 placement
function mGs(e) {
  return getLiveState().commentReads.get(e);
}
/**
 * 判断除给定 slug 外，是否有在某时间之后读过评论的 artifact。
 */
//@ chunk-bf8g35sz.js:706-819 placement
function hasOtherRecentCommentRead(e, t) {
  for (let [o, n] of getLiveState().commentReadAtBySlug)
    if (o !== e && !(Number.isFinite(t) && n < t)) return !0;
  return !1;
}
//@ chunk-bf8g35sz.js:819-870 placement
function _qn() {
  return getLiveState().lastOthersCommentReadAt;
}
//@ chunk-bf8g35sz.js:870-969 placement
function r(e) {
  if (e.size <= m) return !1;
  let t = e.keys().next().value;
  if (t !== void 0) e.delete(t);
  return !0;
}

export { recordCommentRead, _qn, hasOtherRecentCommentRead, hqn, fGs, mGs };
