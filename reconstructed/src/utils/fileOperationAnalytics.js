/**
 * utils/fileOperationAnalytics.ts
 *
 * 文件操作事件：路径与内容哈希后上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileOperationAnalytics.ts
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: callgraph-fingerprint 2, placement 1, layout 1, fingerprint 1
 */
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, fromEnum } from "../services/analytics/safeMetadata.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-e6aww6q8.js:1399553-1399630 callgraph-fingerprint = hashFilePath (1)
function hashFilePath(filePath) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    createHash_11("sha256").update(filePath).digest("hex").slice(0, 16),
  );
}
//@ chunk-e6aww6q8.js:1399630-1399695 callgraph-fingerprint = hashFileContent (1)
function hashFileContent(content) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(createHash_11("sha256").update(content).digest("hex"));
}
//@ chunk-e6aww6q8.js:1399695-1399869 placement = registerSimplifySkill (0.379)
var MAX_HASHED_CONTENT_BYTES = 102400,
  SHADOWABLE_BUILTIN_SKILL_NAMES = new Set(["verify", "pr", "commit", "code-review", "simplify", "go"]),
  USER_SKILL_PATH_RE = /[/\\]\.claude[/\\](?:skills[/\\]([^/\\]+)[/\\]SKILL\.md|commands[/\\]([^/\\]+)\.md)$/;
//@ chunk-e6aww6q8.js:1399869-1400111 layout
function skillFileMetadata(e, n = homedir_5()) {
  let match = USER_SKILL_PATH_RE.exec(e);
  if (match?.index === void 0) return {};
  let s = match[1] ?? match[2];
  if (s === void 0) return {};
  let sliced = e.slice(0, match.index);
  return {
    skill_file_name: fromSanitizer_SANITIZER_OUTPUT_ONLY(
      SHADOWABLE_BUILTIN_SKILL_NAMES.has(s) ? s : "custom",
    ),
    skill_file_scope: fromEnum(n.length > 0 && sliced === n ? "user" : "project"),
  };
}
/**
 * 记文件操作事件：操作、工具、路径哈希、内容哈希（不超过上限时）、类型，以及技能文件名等元数据。
 */
//@ chunk-e6aww6q8.js:1400111-1400523 fingerprint = logFileOperation (0.771)
function logFileOperation(params) {
  let metadata = {
    operation: fromEnum(params.operation),
    tool: fromEnum(params.tool),
    filePathHash: hashFilePath(params.filePath),
  };
  if (params.content !== void 0 && params.content.length <= MAX_HASHED_CONTENT_BYTES)
    metadata.contentHash = hashFileContent(params.content);
  if (params.type !== void 0) metadata.type = fromEnum(params.type);
  if (params.operation !== "read") {
    let r = skillFileMetadata(params.filePath);
    if (r.skill_file_name !== void 0) metadata.skill_file_name = r.skill_file_name;
    if (r.skill_file_scope !== void 0) metadata.skill_file_scope = r.skill_file_scope;
  }
  logEvent("tengu_file_operation", metadata);
}

export { logFileOperation };
