/**
 * tools/ArtifactTool/artifactNotices.ts
 *
 * 2.1.316 新增：Artifact 变更、评论自动回复/自动编辑的通知文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:4780746-4780796 placement
/**
 * 「Artifact 已变更」通知的标题。
 */
var ARTIFACT_CHANGED = "artifact-changed";
var ARTIFACT_CHANGED_TITLE = "Artifact changed";
//@ chunk-5xgkngpb.js:4780796-4780937 placement
/**
 * "已自动回复 N 个评论线程"通知文案。
 */
function autoRepliedNotice(artifactName, threadCount = 1) {
  return threadCount === 1
    ? `Auto-replied to comment thread on Artifact: ${artifactName}`
    : `Auto-replied to ${threadCount} comment threads on Artifact: ${artifactName}`;
}
//@ chunk-5xgkngpb.js:4780937-4781096 placement
/**
 * "已因 N 个评论线程自动编辑 Artifact"通知文案。
 */
function autoEditedNotice(artifactName, threadCount = 1) {
  return threadCount === 1
    ? `Auto-edited Artifact: ${artifactName} in response to a comment thread`
    : `Auto-edited Artifact: ${artifactName} in response to ${threadCount} comment threads`;
}
//@ chunk-5xgkngpb.js:4781096-4781161 placement
/**
 * 自动编辑需要审查的通知。
 */
function autoEditNeedsReviewNotice(artifactName) {
  return `Auto-edit on Artifact: ${artifactName} needs review`;
}
//@ chunk-5xgkngpb.js:4781161-4781227 placement
/**
 * 自动回复已暂停的通知。
 */
function autoRepliesPausedNotice(artifactName) {
  return `Auto-replies on Artifact: ${artifactName} are paused`;
}
//@ chunk-5xgkngpb.js:4781227-4781314 placement
/**
 * 本次发布重新开启自动回复的通知。
 */
function autoRepliesReenabledNotice(artifactName) {
  return `Auto-replies on Artifact: ${artifactName} were re-enabled by this publish`;
}
//@ chunk-5xgkngpb.js:4781314-4781382 placement
/**
 * 自动回复已恢复的通知。
 */
function autoRepliesResumedNotice(artifactName) {
  return `Auto-replies on Artifact: ${artifactName} were resumed`;
}
//@ chunk-5xgkngpb.js:4781382-4781496 placement
/**
 * "Artifact 已变更（N 次）"通知文案。
 */
function artifactChangedNotice(artifactName, changeCount = 1, isMore = false) {
  return changeCount === 1 && !isMore
    ? `Artifact changed: ${artifactName}`
    : `Artifact changed ${changeCount}${isMore ? "+" : ""} times: ${artifactName}`;
}
//@ chunk-5xgkngpb.js:4781496-4781559 placement
/**
 * 有评论在等待的通知。
 */
function commentsWaitingNotice(artifactName) {
  return `Comments are waiting on Artifact: ${artifactName}`;
}
//@ chunk-5xgkngpb.js:4781559-4781641 placement
/**
 * 需要用户授权才能回复评论的通知。
 */
function needsPermissionToReplyNotice(artifactName) {
  return `Claude needs your permission to reply to comments on ${artifactName}`;
}
//@ chunk-5xgkngpb.js:4781641-4781718 placement
/**
 * 回复未发出（Claude 已记下留言）的通知。
 */
function replyNotPostedNotice(artifactName) {
  return `Reply on ${artifactName} not posted \u2014 Claude has your note`;
}
//@ chunk-5xgkngpb.js:4781718-4781794 placement
/**
 * 已自动编辑、请审查改动的通知。
 */
function autoEditedReviewNotice(artifactName) {
  return `Auto-edited Artifact: ${artifactName} \u2014 review the change`;
}
//@ chunk-5xgkngpb.js:4781794-4782202 placement
/**
 * 停止前已发生自动动作的提示：Artifact 已因 N 个评论线程被自动编辑，或已自动回复了 N 个线程；待发提示随停止丢弃，记录保留在线程与版本历史中。
 */
function stoppedAfterAutoActionsNotice(summary) {
  let threadText = `${summary.count} comment ${summary.count === 1 ? "thread" : "threads"}`;
  return `Before the stop, ${summary.family === "auto-edited" ? `Artifact: ${summary.artifactName} had already been auto-edited in response to ${threadText}` : `automatic replies had already been posted on ${threadText} of Artifact: ${summary.artifactName}`} (the pending notice was discarded with the stop \u2014 the artifact's thread and version history carry the record).`;
}
//@ chunk-5xgkngpb.js:4782202-4782267 placement
/**
 * 已停止监视某 artifact 的通知。
 */
function stoppedWatchingNotice(artifactName, shortReason) {
  return `Stopped watching Artifact: ${artifactName} (${shortReason})`;
}
//@ chunk-5xgkngpb.js:4782267-4782328 placement
/**
 * 未在监视某 artifact 的通知。
 */
function notWatchingNotice(artifactName, shortReason) {
  return `Not watching Artifact: ${artifactName} (${shortReason})`;
}
export {
  ARTIFACT_CHANGED,
  ARTIFACT_CHANGED_TITLE,
  commentsWaitingNotice,
  replyNotPostedNotice,
  autoRepliesPausedNotice,
  needsPermissionToReplyNotice,
  autoRepliedNotice,
  autoEditNeedsReviewNotice,
  autoEditedNotice,
  autoEditedReviewNotice,
  artifactChangedNotice,
  stoppedAfterAutoActionsNotice,
  autoRepliesResumedNotice,
  autoRepliesReenabledNotice,
  notWatchingNotice,
  stoppedWatchingNotice,
};
