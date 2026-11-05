/**
 * constants/buildInfo.ts
 *
 * 2.1.316 新增：构建信息常量（版本号、构建时间、问题反馈地址）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:125964-126133 placement
var MAX_SECRET_LENGTH = 256;
var MAX_SECRET_REDACT_CHARS = 64;
var TRANSCRIPT_PAGE_BYTES = 1048576;
var ENTRY_THREAD = "entry.thread";
var TOOL_USE_ID_PATTERN =
  /^toolu_(?:(?:(?:staging|bdrk|vrtx)_){0,2}[A-Za-z0-9]{1,64}|rekeyed_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;
//@ chunk-5xgkngpb.js:199661-200662 placement
/**
 * 构建信息常量：包名、版本号 2.1.316、构建时间、文档与问题反馈地址。
 */
var BUILD_INFO =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
var SMALL_RESULT_BYTES = 64;
export {
  MAX_SECRET_REDACT_CHARS,
  ENTRY_THREAD,
  TOOL_USE_ID_PATTERN,
  MAX_SECRET_LENGTH,
  TRANSCRIPT_PAGE_BYTES,
  BUILD_INFO,
  SMALL_RESULT_BYTES,
};
