/**
 * tools/FileEditTool/constants.ts
 *
 * Edit 工具名、.claude 目录权限模式与文件编辑类错误文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/constants.ts
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: callgraph-witnessed 1
 */
import { ALLOW_LARGE_PARAM } from "../FileReadTool/constants.js";

/**
 * 文件编辑类常量：工具名 "Edit"、.claude 目录会话权限模式（项目 /.claude/**、全局 ~/.claude/**）、各类拒绝/失败文案（未读、只读了开头、目录被拒、Read deny、文件已变），以及不可写编码原因表。
 */
//@ chunk-bwbq4xvm.js:174061-175345 callgraph-witnessed = CLAUDE_FOLDER_PERMISSION_PATTERN (0.122)
var FILE_EDIT_TOOL_NAME = "Edit",
  CLAUDE_FOLDER_PERMISSION_PATTERN = "/.claude/**",
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = "~/.claude/**",
  FILE_NOT_READ_ERROR = "File has not been read yet. Read it first before writing to it.",
  PARTIAL_READ_WRITE_ERROR = `You were given only the start of this file, and nothing shows that you have since read all of it in one call, so a Write could lose the rest. To change part of it, use ${FILE_EDIT_TOOL_NAME}. To replace it whole, first Read it in one call with no offset or limit. If Read returns only a page or says the file is too large, Read it again with ${ALLOW_LARGE_PARAM}: true. If even that cannot return all of it, use ${FILE_EDIT_TOOL_NAME}.`,
  DENIED_DIRECTORY_ERROR = "File is in a directory that is denied by your permission settings.",
  READ_DENY_RULE_EDIT_ERROR =
    "File is covered by a Read deny rule in your permission settings and cannot be edited.",
  READ_DENY_RULE_WRITE_ERROR =
    "File is covered by a Read deny rule in your permission settings and cannot be written.",
  FILE_UNEXPECTEDLY_MODIFIED_ERROR =
    "File content has changed since it was last read. This commonly happens when a linter or formatter run via Bash rewrites the file. Call Read on this file to refresh, then retry the edit.",
  UNWRITABLE_ENCODING_REASONS = {
    not_utf8:
      "is not valid UTF-8: it uses a legacy encoding such as Windows-1252, Shift-JIS or GBK, or it is binary",
    nul: "has NUL bytes in its first 8 KB: binary data, UTF-16/UTF-32 without a byte-order mark, or text with embedded NULs",
    utf16be: "is UTF-16 big-endian (it starts FE FF), which these tools cannot write",
  };

export {
  FILE_EDIT_TOOL_NAME,
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  FILE_UNEXPECTEDLY_MODIFIED_ERROR,
  DENIED_DIRECTORY_ERROR,
  UNWRITABLE_ENCODING_REASONS,
  READ_DENY_RULE_EDIT_ERROR,
  READ_DENY_RULE_WRITE_ERROR,
  FILE_NOT_READ_ERROR,
  PARTIAL_READ_WRITE_ERROR,
};
