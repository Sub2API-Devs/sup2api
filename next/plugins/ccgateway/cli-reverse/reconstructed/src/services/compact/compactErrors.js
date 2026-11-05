/**
 * services/compact/compactErrors.ts
 *
 * 2.1.316 新增：压缩错误类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v7ffshjk.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-v7ffshjk.js:191-431 placement
/**
 * 压缩错误文案常量。
 */
var NO_MESSAGES_TO_COMPACT = "No messages to compact";
var COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE =
  "Compaction failed \xB7 conversation could not be reduced below the context limit";
var COMPACT_FAILED_MEDIA_LIMIT_MESSAGE = "Compaction failed \xB7 attached media exceeds size limits";
var COMPACT_ERROR_PREFIX = "Error during compaction: ";
var COULD_NOT_COMPACT = "Could not compact";
//@ chunk-v7ffshjk.js:431-558 placement
var CONVERSATION_TOO_LONG_HINT = `conversation too long \xB7 ${"/clear to start fresh"}`;
var MEDIA_TOO_LARGE_HINT = `attached media too large \xB7 ${"/clear to start fresh"}`;
export {
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE,
  COMPACT_FAILED_MEDIA_LIMIT_MESSAGE,
  MEDIA_TOO_LARGE_HINT,
  COULD_NOT_COMPACT,
  CONVERSATION_TOO_LONG_HINT,
};
