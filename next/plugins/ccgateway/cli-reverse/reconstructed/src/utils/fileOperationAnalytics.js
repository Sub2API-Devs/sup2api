/**
 * utils/fileOperationAnalytics.ts
 *
 * 文件操作事件：路径与内容哈希后上报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileOperationAnalytics.ts
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: callgraph-fingerprint 2, placement 1, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { homedir } from "os";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, fromEnum } from "../services/analytics/safeMetadata.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1399024-1399101 callgraph-fingerprint (2.1.88 match: hashFilePath, 1)
function hashFilePath(filePath) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    createHash("sha256").update(filePath).digest("hex").slice(0, 16),
  );
}
//@ chunk-5xgkngpb.js:1399101-1399166 callgraph-fingerprint (2.1.88 match: hashFileContent, 1)
function hashFileContent(content) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(createHash("sha256").update(content).digest("hex"));
}
//@ chunk-5xgkngpb.js:1399166-1399340 placement (2.1.88 match: registerSimplifySkill, 0.379)
var MAX_HASHED_CONTENT_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SHADOWABLE_BUILTIN_SKILL_NAMES;
var USER_SKILL_PATH_RE;
deferInit("chunk-5xgkngpb.js:1399166", () => {
  MAX_HASHED_CONTENT_BYTES = 102400;
  SHADOWABLE_BUILTIN_SKILL_NAMES = new Set(["verify", "pr", "commit", "code-review", "simplify", "go"]);
  USER_SKILL_PATH_RE = /[/\\]\.claude[/\\](?:skills[/\\]([^/\\]+)[/\\]SKILL\.md|commands[/\\]([^/\\]+)\.md)$/;
});
//@ chunk-5xgkngpb.js:1399340-1399582 layout
function skillFileMetadata(filePath, homeDir = homedir()) {
  let match = USER_SKILL_PATH_RE.exec(filePath);
  if (match?.index === undefined) return {};
  let skillName = match[1] ?? match[2];
  if (skillName === undefined) return {};
  let sliced = filePath.slice(0, match.index);
  return {
    skill_file_name: fromSanitizer_SANITIZER_OUTPUT_ONLY(
      SHADOWABLE_BUILTIN_SKILL_NAMES.has(skillName) ? skillName : "custom",
    ),
    skill_file_scope: fromEnum(homeDir.length > 0 && sliced === homeDir ? "user" : "project"),
  };
}
//@ chunk-5xgkngpb.js:1399582-1399994 fingerprint (2.1.88 match: logFileOperation, 0.771)
/**
 * 记文件操作事件：操作、工具、路径哈希、内容哈希（不超过上限时）、类型，以及技能文件名等元数据。
 */
function logFileOperation(params) {
  let metadata = {
    operation: fromEnum(params.operation),
    tool: fromEnum(params.tool),
    filePathHash: hashFilePath(params.filePath),
  };
  if (params.content !== undefined && params.content.length <= MAX_HASHED_CONTENT_BYTES)
    metadata.contentHash = hashFileContent(params.content);
  if (params.type !== undefined) metadata.type = fromEnum(params.type);
  if (params.operation !== "read") {
    let metadata_2 = skillFileMetadata(params.filePath);
    if (metadata_2.skill_file_name !== undefined) metadata.skill_file_name = metadata_2.skill_file_name;
    if (metadata_2.skill_file_scope !== undefined) metadata.skill_file_scope = metadata_2.skill_file_scope;
  }
  logEvent("tengu_file_operation", metadata);
}
export { logFileOperation };
