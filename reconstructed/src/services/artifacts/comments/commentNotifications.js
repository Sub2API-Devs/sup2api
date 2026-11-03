/**
 * services/artifacts/comments/commentNotifications.ts
 *
 * 2.1.316 新增：评论通知开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (1)
 * attribution: placement 1
 */

/**
 * 评论通知（单条/多条"发送给 Claude"）的标题与字段前缀、桌面应用平台名、召唤宽限/轮询/表大小上限常量，以及 tengu_madrone_spindle_corbel 开关名。
 */
//@ chunk-9tgt55am.js:27469-27724 placement
var COMMENT_NOTICE_HEADER = "[Artifact comment sent to Claude]",
  ARTIFACT_LINE_PREFIX = "Artifact: ",
  THREAD_LINE_PREFIX = "Comment thread: ",
  SENT_AT_LINE_PREFIX = "Sent to Claude at: ",
  COMMENTS_NOTICE_HEADER = "[Artifact comments sent to Claude]",
  THREADS_LINE_PREFIX = "Comment threads: ",
  DESKTOP_APP = "desktop_app",
  SUMMON_GRACE_MS = 5000,
  SUMMON_POLL_MS = 100,
  MAX_SUMMON_CLAIMS = 32,
  MAX_READ_CLAIMS = 256,
  MAX_OPEN_SUMMONS = 32,
  TENGU_MADRONE_SPINDLE_CORBEL = "tengu_madrone_spindle_corbel";

export {
  TENGU_MADRONE_SPINDLE_CORBEL,
  COMMENT_NOTICE_HEADER,
  COMMENTS_NOTICE_HEADER,
  ARTIFACT_LINE_PREFIX,
  THREAD_LINE_PREFIX,
  SENT_AT_LINE_PREFIX,
  THREADS_LINE_PREFIX,
  MAX_OPEN_SUMMONS,
  DESKTOP_APP,
  MAX_READ_CLAIMS,
  MAX_SUMMON_CLAIMS,
  SUMMON_GRACE_MS,
  SUMMON_POLL_MS,
};
