/**
 * tools/ArtifactTool/artifactNotices.ts
 *
 * 2.1.316 新增：Artifact 变更、评论自动回复/自动编辑的通知文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */

//@ chunk-e6aww6q8.js:4672143-4672193 placement
var ARTIFACT_CHANGED = "artifact-changed",
  T2n = "Artifact changed";
/**
 * "已自动回复 N 个评论线程"通知文案。
 */
//@ chunk-e6aww6q8.js:4672193-4672334 placement
function autoRepliedNotice(e, n = 1) {
  return n === 1
    ? `Auto-replied to comment thread on Artifact: ${e}`
    : `Auto-replied to ${n} comment threads on Artifact: ${e}`;
}
/**
 * "已因 N 个评论线程自动编辑 Artifact"通知文案。
 */
//@ chunk-e6aww6q8.js:4672334-4672493 placement
function autoEditedNotice(e, n = 1) {
  return n === 1
    ? `Auto-edited Artifact: ${e} in response to a comment thread`
    : `Auto-edited Artifact: ${e} in response to ${n} comment threads`;
}
//@ chunk-e6aww6q8.js:4672493-4672558 placement
function bwt(e) {
  return `Auto-edit on Artifact: ${e} needs review`;
}
//@ chunk-e6aww6q8.js:4672558-4672624 placement
function c6s(e) {
  return `Auto-replies on Artifact: ${e} are paused`;
}
//@ chunk-e6aww6q8.js:4672624-4672711 placement
function u6s(e) {
  return `Auto-replies on Artifact: ${e} were re-enabled by this publish`;
}
//@ chunk-e6aww6q8.js:4672711-4672779 placement
function FWr(e) {
  return `Auto-replies on Artifact: ${e} were resumed`;
}
/**
 * "Artifact 已变更（N 次）"通知文案。
 */
//@ chunk-e6aww6q8.js:4672779-4672893 placement
function artifactChangedNotice(e, n = 1, r = !1) {
  return n === 1 && !r ? `Artifact changed: ${e}` : `Artifact changed ${n}${r ? "+" : ""} times: ${e}`;
}
//@ chunk-e6aww6q8.js:4672893-4672956 placement
function Fpn(e) {
  return `Comments are waiting on Artifact: ${e}`;
}
//@ chunk-e6aww6q8.js:4672956-4673038 placement
function p6s(e) {
  return `Claude needs your permission to reply to comments on ${e}`;
}
//@ chunk-e6aww6q8.js:4673038-4673115 placement
function m6s(e) {
  return `Reply on ${e} not posted \u2014 Claude has your note`;
}
//@ chunk-e6aww6q8.js:4673115-4673191 placement
function g6s(e) {
  return `Auto-edited Artifact: ${e} \u2014 review the change`;
}
/**
 * 停止前已发生自动动作的提示：Artifact 已因 N 个评论线程被自动编辑，或已自动回复了 N 个线程；待发提示随停止丢弃，记录保留在线程与版本历史中。
 */
//@ chunk-e6aww6q8.js:4673191-4673599 placement
function stoppedAfterAutoActionsNotice(e) {
  let n = `${e.count} comment ${e.count === 1 ? "thread" : "threads"}`;
  return `Before the stop, ${e.family === "auto-edited" ? `Artifact: ${e.artifactName} had already been auto-edited in response to ${n}` : `automatic replies had already been posted on ${n} of Artifact: ${e.artifactName}`} (the pending notice was discarded with the stop \u2014 the artifact's thread and version history carry the record).`;
}
//@ chunk-e6aww6q8.js:4673599-4673664 placement
function h6s(e, n) {
  return `Stopped watching Artifact: ${e} (${n})`;
}
//@ chunk-e6aww6q8.js:4673664-4673725 placement
function y6s(e, n) {
  return `Not watching Artifact: ${e} (${n})`;
}

export {
  stoppedAfterAutoActionsNotice,
  Fpn,
  m6s,
  c6s,
  p6s,
  autoRepliedNotice,
  bwt,
  autoEditedNotice,
  g6s,
  FWr,
  u6s,
  y6s,
  h6s,
  ARTIFACT_CHANGED,
  T2n,
  artifactChangedNotice,
};
