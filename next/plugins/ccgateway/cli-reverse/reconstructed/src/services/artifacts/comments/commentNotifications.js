/**
 * services/artifacts/comments/commentNotifications.ts
 *
 * 2.1.316 新增：评论通知开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r9a43qwr.js (1)
 * attribution: placement 1
 */
//@ chunk-r9a43qwr.js:447-692 placement
/**
 * 评论通知（单条/多条"发送给 Claude"）的标题与字段前缀、桌面应用平台名、召唤宽限/轮询/表大小上限常量，以及 tengu_madrone_spindle_corbel 开关名。
 */
var COMMENT_NOTICE_HEADER = "[Artifact comment sent to Claude]";
var ARTIFACT_LINE_PREFIX = "Artifact: ";
var THREAD_LINE_PREFIX = "Comment thread: ";
var SENT_AT_LINE_PREFIX = "Sent to Claude at: ";
var COMMENTS_NOTICE_HEADER = "[Artifact comments sent to Claude]";
var THREADS_LINE_PREFIX = "Comment threads: ";
var DESKTOP_APP = "desktop_app";
var SUMMON_GRACE_MS = 5000;
var SUMMON_POLL_MS = 100;
var MAX_SUMMON_CLAIMS = 32;
var MAX_READ_CLAIMS = 256;
var MAX_OPEN_SUMMONS = 32;
var TENGU_MADRONE_SPINDLE_CORBEL = "tengu_madrone_spindle_corbel";
export {
  ARTIFACT_LINE_PREFIX,
  DESKTOP_APP,
  TENGU_MADRONE_SPINDLE_CORBEL,
  COMMENT_NOTICE_HEADER,
  COMMENTS_NOTICE_HEADER,
  THREAD_LINE_PREFIX,
  SENT_AT_LINE_PREFIX,
  THREADS_LINE_PREFIX,
  MAX_OPEN_SUMMONS,
  MAX_READ_CLAIMS,
  MAX_SUMMON_CLAIMS,
  SUMMON_GRACE_MS,
  SUMMON_POLL_MS,
};
