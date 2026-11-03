/**
 * constants/messages.ts
 *
 * 消息里使用的固定文本：(no content)、No response requested.、<synthetic> 模型名、图片删除说明、回滚说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/messages.ts
 * pieces: chunk-ndmse9kj.js (1)
 * attribution: callgraph-witnessed 1
 */

/**
 * 消息相关固定文本常量："(no content)"、已删除图片说明、"No response requested."、合成模型名 "<synthetic>"、Auto Mode 标题、回滚不安全原因与说明、跨组织 thinking 不可用提示。
 */
//@ chunk-ndmse9kj.js:35988-36671 callgraph-witnessed = NO_CONTENT_MESSAGE (0.2)
var NO_CONTENT_MESSAGE = "(no content)",
  DELETED_IMAGE_NOTICE =
    "An image that was attached near this point was deleted. Do not open or recover any saved copy of it, even by its path. If the person asks about it or asks you to open it, tell them that it was deleted.",
  NO_RESPONSE_REQUESTED = "No response requested.",
  SYNTHETIC_MODEL = "<synthetic>",
  AUTO_MODE_ACTIVE_TITLE = "Auto Mode Active",
  REWIND_UNSAFE_PATH_REASON =
    "the tracked path is (or became) a link or other non-regular file, its directory changed since the checkpoint, or its backup could not be safely read",
  RESTORE_FILES_CAVEAT =
    "Restored files go back whole, losing later changes by anyone. Bash changes to other files are not undone.",
  FOREIGN_ORG_THINKING_NOTICE = "Claude can't use thinking from another organization",
  FOREIGN_ORG_THINKING_HINT = "resume signed in to that organization to use it again";

export {
  SYNTHETIC_MODEL,
  NO_RESPONSE_REQUESTED,
  NO_CONTENT_MESSAGE,
  DELETED_IMAGE_NOTICE,
  AUTO_MODE_ACTIVE_TITLE,
  REWIND_UNSAFE_PATH_REASON,
  RESTORE_FILES_CAVEAT,
  FOREIGN_ORG_THINKING_NOTICE,
  FOREIGN_ORG_THINKING_HINT,
};
