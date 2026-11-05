/**
 * services/errorTracking/errorTracking.ts
 *
 * 2.1.316 新增：客户端错误追踪（claude-code-error-tracking）：构建版本信息、按错误类名分类、捆绑外抛出的错误识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n3hp20kk.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { release } from "os";
import { errorTrackingClient, isErrorTrackingCapReached, enqueueErrorLog } from "./datadogErrorSink.js";
import { getOrCreateUserID, getOrCreateMachineID } from "../../utils/config.js";
import {
  isAnonymousBundledFrame,
  unifyCliBundlePath,
  getSanitizedStackFrames,
  isStackOnlyExternal,
  isSourceFrame,
} from "../../utils/errorStackSanitize.js";
import { LEGACY_MODEL_IDS_2, strip1mSuffix } from "../../utils/model/modelIds.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getAllGrowthBookFeatures, getNonDefaultFeatureKeys } from "../analytics/growthbook.js";
import {
  APIUserAbortError,
  APIConnectionTimeoutError,
  APIConnectionError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  APIError,
  RetryableError,
  AnthropicError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { WorkloadIdentityError } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import {
  ClaudeError,
  sanitizeClassName,
  getTelemetryMessage,
  sanitizeErrnoForTelemetry,
  getTelemetryChildExitStatus,
  isSyscallError,
  PERMISSION_DENIED_CODES,
  toError,
} from "../../utils/errors.js";
import { redactErrorMessage, redactErrorPaths } from "../../utils/errorRedaction.js";
import { formatGitErrorFrames } from "../../utils/gitSafeExec.js";
import { env } from "../../utils/env.js";
import { getEntrypointKind } from "../../utils/entrypointKinds.js";
import { envSessionKind } from "../../utils/concurrentSessions.js";
import { getRendererModeForAnalytics, getAttacherCaps } from "../../bootstrap/state.js";
import { currentAuthSurface, getCurrentAuthSurface } from "../analytics/authOutcomeTelemetry.js";
import { getPlatform } from "../../utils/platform.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import { isErrorReportingEnabled } from "../errorReportingGate.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n3hp20kk.js:802-837 placement
var CLAUDE_CODE_ERROR_TRACKING = "claude-code-error-tracking";
//@ chunk-n3hp20kk.js:837-1903 placement
function buildErrorTrackingRelease(sourcemapGroup) {
  return sourcemapGroup
    ? {
        version: `${
          {
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
        }_${sourcemapGroup}`,
        sourcemapGroup,
      }
    : {
        version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        sourcemapGroup: "none",
      };
}
//@ chunk-n3hp20kk.js:1903-1912 placement
/**
 * 把用户 id 哈希映射到 30 个桶之一。
 */
var USER_BUCKET_MODULUS = 30;
//@ chunk-n3hp20kk.js:1912-2116 placement
function getUserBucket() {
  let client = errorTrackingClient();
  if (client.cachedUserBucket !== undefined) return client.cachedUserBucket;
  let userId = getOrCreateUserID();
  let digest = createHash("sha256").update(userId).digest("hex");
  client.cachedUserBucket = parseInt(digest.slice(0, 8), 16) % USER_BUCKET_MODULUS;
  return client.cachedUserBucket;
}
//@ chunk-n3hp20kk.js:2116-2342 placement
function computeErrorFingerprint(message, frames) {
  let joined = frames
    .slice(0, 3)
    .map((frame) =>
      isAnonymousBundledFrame(frame)
        ? `${frame.function ?? "?"}@${frame.file}:${frame.line ?? "?"}:${frame.column ?? "?"}`
        : `${frame.function ?? "?"}@${unifyCliBundlePath(frame.file)}`,
    )
    .join("|");
  return createHash("sha256")
    .update(
      `${message}
${joined}`,
    )
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-n3hp20kk.js:2342-2361 placement
/**
 * 旧模型 id 集合（不在其中的归 other）。
 */
var LEGACY_MODEL_SET; // deferred: uses LEGACY_MODEL_IDS_2 (../../utils/model/modelIds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n3hp20kk.js:2342", () => {
  LEGACY_MODEL_SET = new Set(LEGACY_MODEL_IDS_2);
});
//@ chunk-n3hp20kk.js:2361-2472 placement
function getCanonicalModelForTracking() {
  try {
    let mainLoopModel = getMainLoopModel();
    if (!mainLoopModel) return;
    let canonicalName = getCanonicalName(strip1mSuffix(mainLoopModel), {
      identity: true,
    });
    return LEGACY_MODEL_SET.has(canonicalName) ? canonicalName : "other";
  } catch {
    return;
  }
}
//@ chunk-n3hp20kk.js:2472-2481 placement
/**
 * 事件里最多附加的文件数（50）。
 */
var MAX_ADDITIONAL_FILES = 50;
//@ chunk-n3hp20kk.js:2481-2642 placement
function getNonDefaultBooleanFlags() {
  try {
    let allGrowthBookFeatures = getAllGrowthBookFeatures();
    let nonDefaultFeatureKeys = getNonDefaultFeatureKeys();
    let flags = {};
    let count = 0;
    for (let [key, value] of Object.entries(allGrowthBookFeatures))
      if (typeof value === "boolean" && nonDefaultFeatureKeys.has(key)) {
        flags[key] = value;
        if (++count >= MAX_ADDITIONAL_FILES) break;
      }
    return flags;
  } catch {
    return {};
  }
}
//@ chunk-n3hp20kk.js:2642-2843 placement
function summarizeZodIssues(error) {
  let issues = error.issues;
  if (!Array.isArray(issues) || issues.length === 0) return;
  let filtered = issues
    .map((issue) => issue?.code)
    .filter((code) => typeof code === "string" && /^[a-z_]{1,40}$/.test(code));
  return `${issues.length} issue(s): ${filtered.join(",")}`;
}
//@ chunk-n3hp20kk.js:2843-2857 placement
/**
 * 探测函数，用其名字是否被压缩判断构建是否保留类名。
 */
function errorTrackingIdentifierProbe() {}
//@ chunk-n3hp20kk.js:2857-3369 placement
/**
 * 错误追踪：构建是否保留类名（探测函数名未被压缩）、SDK/客户端错误类名表（用 instanceof 识别）、"已验证无代码路径" 后缀正则。
 */
var CLASS_NAMES_PRESERVED; // deferred: uses errorTrackingIdentifierProbe of its import cycle while loading; runs once the cycle is complete
var KNOWN_ERROR_CLASSES;
var VERIFIED_SAFE_SUFFIX_RE;
deferInit("chunk-n3hp20kk.js:2857", () => {
  CLASS_NAMES_PRESERVED = !errorTrackingIdentifierProbe.name.startsWith("errorTrackingIdentifierProbe");
  KNOWN_ERROR_CLASSES = [
    ["APIUserAbortError", APIUserAbortError],
    ["APIConnectionTimeoutError", APIConnectionTimeoutError],
    ["APIConnectionError", APIConnectionError],
    ["BadRequestError", BadRequestError],
    ["AuthenticationError", AuthenticationError],
    ["PermissionDeniedError", PermissionDeniedError],
    ["NotFoundError", NotFoundError],
    ["ConflictError", ConflictError],
    ["UnprocessableEntityError", UnprocessableEntityError],
    ["RateLimitError", RateLimitError],
    ["InternalServerError", InternalServerError],
    ["APIError", APIError],
    ["RetryableError", RetryableError],
    ["WorkloadIdentityError", WorkloadIdentityError],
    ["AnthropicError", AnthropicError],
    ["ClaudeError", ClaudeError],
  ];
  VERIFIED_SAFE_SUFFIX_RE = /_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS$/;
});
//@ chunk-n3hp20kk.js:3369-3679 placement
function errorClassName(error, preserveKnown = CLASS_NAMES_PRESERVED) {
  let constructorName =
    typeof error.constructor?.name === "string"
      ? error.constructor.name.replace(VERIFIED_SAFE_SUFFIX_RE, "")
      : undefined;
  let nameIsClass = preserveKnown && error instanceof ClaudeError && error.name === constructorName;
  let replaced = (
    (typeof error.name === "string" && error.name !== "Error" && !nameIsClass ? error.name : undefined) ||
    (!preserveKnown && sanitizeClassName(constructorName) !== undefined
      ? constructorName
      : KNOWN_ERROR_CLASSES.find(([, ctor]) => error instanceof ctor)?.[0]) ||
    "Error"
  ).replace(VERIFIED_SAFE_SUFFIX_RE, "");
  return sanitizeClassName(replaced) ?? "Error";
}
//@ chunk-n3hp20kk.js:3679-3688 placement
/**
 * 错误事件里最多保留的栈帧数（20）。
 */
var MAX_STACK_FRAMES = 20;
//@ chunk-n3hp20kk.js:3688-5589 placement
/**
 * 构造错误追踪事件（截取栈、标记捆绑外抛出、版本信息）。
 */
function buildErrorTrackingEvent(error, origin, kind) {
  let sanitizedStackFrames = getSanitizedStackFrames(error);
  let externalOnly = isStackOnlyExternal(sanitizedStackFrames);
  let frames = sanitizedStackFrames.slice(0, MAX_STACK_FRAMES);
  let telemetryMessage = getTelemetryMessage(error);
  let message =
    externalOnly && telemetryMessage === undefined
      ? `thrown outside the Claude Code bundle (${kind})`
      : redactErrorMessage(
          redactErrorPaths(
            error,
            telemetryMessage ?? summarizeZodIssues(error) ?? error.message ?? String(error),
          ),
        );
  let stack = formatGitErrorFrames(
    {
      name: kind,
      message,
    },
    frames,
  );
  let { version, sourcemapGroup } = buildErrorTrackingRelease(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.DD_SOURCEMAP_GROUP,
  );
  let fingerprint = computeErrorFingerprint(kind, frames);
  let userBucket = getUserBucket();
  let canonicalModelForTracking = getCanonicalModelForTracking();
  let isNative = typeof Bun !== "undefined" && true;
  let errnoCode = sanitizeErrnoForTelemetry(error);
  let telemetryChildExitStatus = getTelemetryChildExitStatus(error);
  let entrypoint = env.CLAUDE_CODE_ENTRYPOINT === undefined ? "cli" : (getEntrypointKind() ?? "other");
  let sessionKind = envSessionKind();
  let rendererModeForAnalytics = getRendererModeForAnalytics();
  let remoteControlLane = currentAuthSurface();
  let majorMinorVersion = getMajorMinorVersion(release());
  return {
    ddtags: [
      `service:${CLAUDE_CODE_ERROR_TRACKING}`,
      "team:claude-code",
      `version:${version}`,
      "env:external",
      `origin:${origin}`,
      `platform:${getPlatform()}`,
      `os_release:${majorMinorVersion}`,
      `user_bucket:${userBucket}`,
      `entrypoint:${entrypoint}`,
      `node_version:${process.versions.node}`,
      "bun_version:1.4.4",
      `is_native_runtime:${isNative}`,
      ...(canonicalModelForTracking ? [`model:${canonicalModelForTracking}`] : []),
      ...(errnoCode ? [`error_code:${errnoCode}`] : []),
      ...(telemetryChildExitStatus !== undefined ? [`child_exit_status:${telemetryChildExitStatus}`] : []),
      ...(sessionKind ? [`session_kind:${sessionKind}`] : []),
      ...(sessionKind ? [`has_attacher:${getAttacherCaps() ? "1" : "0"}`] : []),
      ...(rendererModeForAnalytics ? [`renderer_mode:${rendererModeForAnalytics}`] : []),
      ...(remoteControlLane ? [`remote_control_lane:${remoteControlLane}`] : []),
      ...(getCurrentAuthSurface() ? ["projects_session:1"] : []),
    ].join(","),
    service: CLAUDE_CODE_ERROR_TRACKING,
    hostname: "claude-code",
    status: "error",
    message: `${kind}: ${message}`.slice(0, 4000),
    timestamp: new Date().toISOString(),
    error: {
      kind,
      message: message.slice(0, 4000),
      stack: stack.slice(0, 16000),
      fingerprint,
      handling: origin === "logError" ? "handled" : "unhandled",
    },
    version,
    sourcemap_group: sourcemapGroup,
    env: "external",
    user_bucket: userBucket,
    origin,
    host_platform: getPlatform(),
    host_os_release: majorMinorVersion,
    host_name_redacted: getOrCreateMachineID().slice(0, 12),
    entrypoint,
    node_version: process.versions.node,
    bun_version: "1.4.4",
    ...(canonicalModelForTracking && {
      model: canonicalModelForTracking,
    }),
    error_frames: frames,
    feature_flags: getNonDefaultBooleanFlags(),
  };
}
//@ chunk-n3hp20kk.js:5589-5873 placement
/**
 * 已知可忽略的系统栈帧（node 内部帧）。
 */
var EXPECTED_ERROR_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var KNOWN_IGNORED_ERRORS;
var KNOWN_IGNORED_SYSTEM_FRAMES;
deferInit("chunk-n3hp20kk.js:5589", () => {
  EXPECTED_ERROR_CLASSES = new Set(["APIUserAbortError", "AuthenticationError", "McpSessionExpiredError"]);
  KNOWN_IGNORED_ERRORS = [
    {
      messagePrefix: "File does not exist",
      topFrameIncludes: "FileReadTool.ts",
    },
  ];
  KNOWN_IGNORED_SYSTEM_FRAMES = [
    {
      topFile: "node:net",
      topFunction: "internalConnectMultipleTimeout",
    },
    {
      topFile: "node:_http_server",
      topFunction: "#onClose",
    },
  ];
});
//@ chunk-n3hp20kk.js:5873-6005 placement
function isIgnoredTopFrame(error) {
  let sanitizedStackFrames = getSanitizedStackFrames(error, 20);
  let topFrame = sanitizedStackFrames[0];
  if (!topFrame || sanitizedStackFrames.some(isSourceFrame)) return false;
  return KNOWN_IGNORED_SYSTEM_FRAMES.some(
    (needle) => topFrame.file === needle.topFile && topFrame.function === needle.topFunction,
  );
}
//@ chunk-n3hp20kk.js:6005-6141 placement
function isRemoteEnvironment() {
  return (
    env.CLAUDE_CODE_REMOTE === true ||
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
    Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE)
  );
}
//@ chunk-n3hp20kk.js:6141-6466 placement
function classifyFsSyscall(error, errorClass) {
  if (EXPECTED_ERROR_CLASSES.has(errorClass)) return true;
  if (
    hasEmbeddedSearchTools_2() &&
    !isRemoteEnvironment() &&
    isSyscallError(error) &&
    error.code !== undefined &&
    PERMISSION_DENIED_CODES.has(error.code) &&
    (error.syscall === "mkdir" || error.syscall === "open") &&
    getPlatform() !== "windows"
  )
    return true;
  let message = error.message ?? "";
  return KNOWN_IGNORED_ERRORS.some(
    (code) =>
      message.startsWith(code.messagePrefix) &&
      (
        error.stack
          ?.split(
            `
`,
          )
          .find((line) => line.trim().startsWith("at ")) ?? ""
      ).includes(code.topFrameIncludes),
  );
}
//@ chunk-n3hp20kk.js:6466-6547 placement
/**
 * 取版本的 major.minor，取不到返回 unknown。
 */
function getMajorMinorVersion(version) {
  let match = /^(\d+)\.(\d+)/.exec(version);
  return match ? `${match[1]}.${match[2]}` : "unknown";
}
//@ chunk-n3hp20kk.js:6547-6766 placement
/**
 * 把错误上报到客户端错误追踪：判定开启后过滤文件系统系统调用错误、已知可忽略的未处理异常、达到上限，然后构建事件入队。
 */
function trackError(thrown, source = "logError") {
  try {
    if (!isErrorReportingEnabled()) return;
    let error = toError(thrown);
    let className = errorClassName(error);
    if (source === "logError" && classifyFsSyscall(error, className)) return;
    if ((source === "unhandled_rejection" || source === "uncaught_exception") && isIgnoredTopFrame(error))
      return;
    if (isErrorTrackingCapReached()) return;
    let errorTrackingEvent = buildErrorTrackingEvent(error, source, className);
    enqueueErrorLog(errorTrackingEvent);
  } catch {}
}
export { trackError, errorClassName };
