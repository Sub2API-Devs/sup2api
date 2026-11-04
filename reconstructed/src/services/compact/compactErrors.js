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
//@ chunk-xndtzje6.js:191-431 placement
/**
 * 压缩错误文案常量。
 */
var NO_MESSAGES_TO_COMPACT = "No messages to compact";
var COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE =
  "Compaction failed \xB7 conversation could not be reduced below the context limit";
var COMPACT_FAILED_MEDIA_LIMIT_MESSAGE = "Compaction failed \xB7 attached media exceeds size limits";
var COMPACT_ERROR_PREFIX = "Error during compaction: ";
var COULD_NOT_COMPACT = "Could not compact";
//@ chunk-xndtzje6.js:431-558 placement
var CONVERSATION_TOO_LONG_HINT = `conversation too long \xB7 ${"/clear to start fresh"}`;
var MEDIA_TOO_LARGE_HINT = `attached media too large \xB7 ${"/clear to start fresh"}`;
export {
  CONVERSATION_TOO_LONG_HINT,
  COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE,
  MEDIA_TOO_LARGE_HINT,
  COMPACT_FAILED_MEDIA_LIMIT_MESSAGE,
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COULD_NOT_COMPACT,
};
