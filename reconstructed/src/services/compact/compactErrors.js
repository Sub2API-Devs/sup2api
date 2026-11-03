/**
 * services/compact/compactErrors.ts
 *
 * 2.1.316 新增：压缩错误类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xndtzje6.js (2)
 * attribution: placement 2
 */

/**
 * 压缩错误文案常量。
 */
//@ chunk-xndtzje6.js:191-431 placement
var NO_MESSAGES_TO_COMPACT = "No messages to compact",
  COMPACT_FAILED_CONTEXT_LIMIT =
    "Compaction failed \xB7 conversation could not be reduced below the context limit",
  COMPACT_FAILED_MEDIA_LIMIT = "Compaction failed \xB7 attached media exceeds size limits",
  COMPACT_ERROR_PREFIX = "Error during compaction: ",
  COULD_NOT_COMPACT = "Could not compact";
//@ chunk-xndtzje6.js:431-558 placement
var CONVERSATION_TOO_LONG_HINT = `conversation too long \xB7 ${"/clear to start fresh"}`,
  MEDIA_TOO_LARGE_HINT = `attached media too large \xB7 ${"/clear to start fresh"}`;

export {
  CONVERSATION_TOO_LONG_HINT,
  COMPACT_FAILED_CONTEXT_LIMIT,
  MEDIA_TOO_LARGE_HINT,
  COMPACT_FAILED_MEDIA_LIMIT,
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COULD_NOT_COMPACT,
};
