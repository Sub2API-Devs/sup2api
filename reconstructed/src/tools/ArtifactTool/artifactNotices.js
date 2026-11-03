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
/**
 * 「Artifact 已变更」通知的标题。
 */
var ARTIFACT_CHANGED = "artifact-changed";
var ARTIFACT_CHANGED_TITLE = "Artifact changed";
//@ chunk-e6aww6q8.js:4672193-4672334 placement
/**
 * "已自动回复 N 个评论线程"通知文案。
 */
function autoRepliedNotice(artifactName, n = 1) {
  return n === 1
    ? `Auto-replied to comment thread on Artifact: ${artifactName}`
    : `Auto-replied to ${n} comment threads on Artifact: ${artifactName}`;
}
//@ chunk-e6aww6q8.js:4672334-4672493 placement
/**
 * "已因 N 个评论线程自动编辑 Artifact"通知文案。
 */
function autoEditedNotice(artifactName, n = 1) {
  return n === 1
    ? `Auto-edited Artifact: ${artifactName} in response to a comment thread`
    : `Auto-edited Artifact: ${artifactName} in response to ${n} comment threads`;
}
//@ chunk-e6aww6q8.js:4672493-4672558 placement
/**
 * 自动编辑需要审查的通知。
 */
function autoEditNeedsReviewNotice(artifactName) {
  return `Auto-edit on Artifact: ${artifactName} needs review`;
}
//@ chunk-e6aww6q8.js:4672558-4672624 placement
/**
 * 自动回复已暂停的通知。
 */
function autoRepliesPausedNotice(artifactName) {
  return `Auto-replies on Artifact: ${artifactName} are paused`;
}
//@ chunk-e6aww6q8.js:4672624-4672711 placement
/**
 * 本次发布重新开启自动回复的通知。
 */
function autoRepliesReenabledNotice(e) {
  return `Auto-replies on Artifact: ${e} were re-enabled by this publish`;
}
//@ chunk-e6aww6q8.js:4672711-4672779 placement
/**
 * 自动回复已恢复的通知。
 */
function autoRepliesResumedNotice(e) {
  return `Auto-replies on Artifact: ${e} were resumed`;
}
//@ chunk-e6aww6q8.js:4672779-4672893 placement
/**
 * "Artifact 已变更（N 次）"通知文案。
 */
function artifactChangedNotice(e, n = 1, r = false) {
  return n === 1 && !r ? `Artifact changed: ${e}` : `Artifact changed ${n}${r ? "+" : ""} times: ${e}`;
}
//@ chunk-e6aww6q8.js:4672893-4672956 placement
/**
 * 有评论在等待的通知。
 */
function commentsWaitingNotice(artifactName) {
  return `Comments are waiting on Artifact: ${artifactName}`;
}
//@ chunk-e6aww6q8.js:4672956-4673038 placement
/**
 * 需要用户授权才能回复评论的通知。
 */
function needsPermissionToReplyNotice(artifactName) {
  return `Claude needs your permission to reply to comments on ${artifactName}`;
}
//@ chunk-e6aww6q8.js:4673038-4673115 placement
/**
 * 回复未发出（Claude 已记下留言）的通知。
 */
function replyNotPostedNotice(artifactName) {
  return `Reply on ${artifactName} not posted \u2014 Claude has your note`;
}
//@ chunk-e6aww6q8.js:4673115-4673191 placement
/**
 * 已自动编辑、请审查改动的通知。
 */
function autoEditedReviewNotice(artifactName) {
  return `Auto-edited Artifact: ${artifactName} \u2014 review the change`;
}
//@ chunk-e6aww6q8.js:4673191-4673599 placement
/**
 * 停止前已发生自动动作的提示：Artifact 已因 N 个评论线程被自动编辑，或已自动回复了 N 个线程；待发提示随停止丢弃，记录保留在线程与版本历史中。
 */
function stoppedAfterAutoActionsNotice(e) {
  let n = `${e.count} comment ${e.count === 1 ? "thread" : "threads"}`;
  return `Before the stop, ${e.family === "auto-edited" ? `Artifact: ${e.artifactName} had already been auto-edited in response to ${n}` : `automatic replies had already been posted on ${n} of Artifact: ${e.artifactName}`} (the pending notice was discarded with the stop \u2014 the artifact's thread and version history carry the record).`;
}
//@ chunk-e6aww6q8.js:4673599-4673664 placement
/**
 * 已停止监视某 artifact 的通知。
 */
function stoppedWatchingNotice(e, shortReason) {
  return `Stopped watching Artifact: ${e} (${shortReason})`;
}
//@ chunk-e6aww6q8.js:4673664-4673725 placement
/**
 * 未在监视某 artifact 的通知。
 */
function notWatchingNotice(artifactName, shortReason) {
  return `Not watching Artifact: ${artifactName} (${shortReason})`;
}
export {
  stoppedAfterAutoActionsNotice,
  commentsWaitingNotice,
  replyNotPostedNotice,
  autoRepliesPausedNotice,
  needsPermissionToReplyNotice,
  autoRepliedNotice,
  autoEditNeedsReviewNotice,
  autoEditedNotice,
  autoEditedReviewNotice,
  autoRepliesResumedNotice,
  autoRepliesReenabledNotice,
  notWatchingNotice,
  stoppedWatchingNotice,
  ARTIFACT_CHANGED,
  ARTIFACT_CHANGED_TITLE,
  artifactChangedNotice,
};
