/**
 * services/errorTracking/errorTracking.ts
 *
 * 2.1.316 新增：客户端错误追踪（claude-code-error-tracking）：构建版本信息、按错误类名分类、捆绑外抛出的错误识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-crrjgh95.js (21)
 * attribution: placement 21
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

//@ chunk-crrjgh95.js:802-837 placement
var CLAUDE_CODE_ERROR_TRACKING = "claude-code-error-tracking";
//@ chunk-crrjgh95.js:837-1903 placement
function buildErrorTrackingRelease(e) {
  return e
    ? {
        version: `${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        }_${e}`,
        sourcemapGroup: e,
      }
    : {
        version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        sourcemapGroup: "none",
      };
}
//@ chunk-crrjgh95.js:1903-1912 placement
/**
 * 把用户 id 哈希映射到 30 个桶之一。
 */
var USER_BUCKET_MODULUS = 30;
//@ chunk-crrjgh95.js:1912-2116 placement
function getUserBucket() {
  let e = errorTrackingClient();
  if (e.cachedUserBucket !== undefined) return e.cachedUserBucket;
  let r = getOrCreateUserID();
  let o = createHash("sha256").update(r).digest("hex");
  e.cachedUserBucket = parseInt(o.slice(0, 8), 16) % USER_BUCKET_MODULUS;
  return e.cachedUserBucket;
}
//@ chunk-crrjgh95.js:2116-2342 placement
function computeErrorFingerprint(e, r) {
  let joined = r
    .slice(0, 3)
    .map((n) =>
      isAnonymousBundledFrame(n)
        ? `${n.function ?? "?"}@${n.file}:${n.line ?? "?"}:${n.column ?? "?"}`
        : `${n.function ?? "?"}@${unifyCliBundlePath(n.file)}`,
    )
    .join("|");
  return createHash("sha256")
    .update(
      `${e}
${joined}`,
    )
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-crrjgh95.js:2342-2361 placement
/**
 * 旧模型 id 集合（不在其中的归 other）。
 */
var LEGACY_MODEL_SET = new Set(LEGACY_MODEL_IDS_2);
//@ chunk-crrjgh95.js:2361-2472 placement
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
//@ chunk-crrjgh95.js:2472-2481 placement
/**
 * 事件里最多附加的文件数（50）。
 */
var MAX_ADDITIONAL_FILES = 50;
//@ chunk-crrjgh95.js:2481-2642 placement
function getNonDefaultBooleanFlags() {
  try {
    let allGrowthBookFeatures = getAllGrowthBookFeatures();
    let nonDefaultFeatureKeys = getNonDefaultFeatureKeys();
    let o = {};
    let n = 0;
    for (let [key, value] of Object.entries(allGrowthBookFeatures))
      if (typeof value === "boolean" && nonDefaultFeatureKeys.has(key)) {
        o[key] = value;
        if (++n >= MAX_ADDITIONAL_FILES) break;
      }
    return o;
  } catch {
    return {};
  }
}
//@ chunk-crrjgh95.js:2642-2843 placement
function summarizeZodIssues(e) {
  let issues = e.issues;
  if (!Array.isArray(issues) || issues.length === 0) return;
  let filtered = issues
    .map((issue) => issue?.code)
    .filter((n) => typeof n === "string" && /^[a-z_]{1,40}$/.test(n));
  return `${issues.length} issue(s): ${filtered.join(",")}`;
}
//@ chunk-crrjgh95.js:2843-2857 placement
/**
 * 探测函数，用其名字是否被压缩判断构建是否保留类名。
 */
function errorTrackingIdentifierProbe() {}
//@ chunk-crrjgh95.js:2857-3369 placement
/**
 * 错误追踪：构建是否保留类名（探测函数名未被压缩）、SDK/客户端错误类名表（用 instanceof 识别）、"已验证无代码路径" 后缀正则。
 */
var CLASS_NAMES_PRESERVED = !errorTrackingIdentifierProbe.name.startsWith("errorTrackingIdentifierProbe");
var KNOWN_ERROR_CLASSES = [
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
var VERIFIED_SAFE_SUFFIX_RE = /_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS$/;
//@ chunk-crrjgh95.js:3369-3679 placement
function errorClassName(e, r = CLASS_NAMES_PRESERVED) {
  let o =
    typeof e.constructor?.name === "string"
      ? e.constructor.name.replace(VERIFIED_SAFE_SUFFIX_RE, "")
      : undefined;
  let n = r && e instanceof ClaudeError && e.name === o;
  let replaced = (
    (typeof e.name === "string" && e.name !== "Error" && !n ? e.name : undefined) ||
    (!r && sanitizeClassName(o) !== undefined
      ? o
      : KNOWN_ERROR_CLASSES.find(([, a]) => e instanceof a)?.[0]) ||
    "Error"
  ).replace(VERIFIED_SAFE_SUFFIX_RE, "");
  return sanitizeClassName(replaced) ?? "Error";
}
//@ chunk-crrjgh95.js:3679-3688 placement
/**
 * 错误事件里最多保留的栈帧数（20）。
 */
var MAX_STACK_FRAMES = 20;
//@ chunk-crrjgh95.js:3688-5589 placement
/**
 * 构造错误追踪事件（截取栈、标记捆绑外抛出、版本信息）。
 */
function buildErrorTrackingEvent(error, r, o) {
  let sanitizedStackFrames = getSanitizedStackFrames(error);
  let t = isStackOnlyExternal(sanitizedStackFrames);
  let sliced = sanitizedStackFrames.slice(0, MAX_STACK_FRAMES);
  let telemetryMessage = getTelemetryMessage(error);
  let a =
    t && telemetryMessage === undefined
      ? `thrown outside the Claude Code bundle (${o})`
      : redactErrorMessage(
          redactErrorPaths(
            error,
            telemetryMessage ?? summarizeZodIssues(error) ?? error.message ?? String(error),
          ),
        );
  let C = formatGitErrorFrames(
    {
      name: o,
      message: a,
    },
    sliced,
  );
  let { version, sourcemapGroup } = buildErrorTrackingRelease(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.DD_SOURCEMAP_GROUP,
  );
  let fingerprint = computeErrorFingerprint(o, sliced);
  let userBucket = getUserBucket();
  let canonicalModelForTracking = getCanonicalModelForTracking();
  let F = typeof Bun !== "undefined" && true;
  let m = sanitizeErrnoForTelemetry(error);
  let telemetryChildExitStatus = getTelemetryChildExitStatus(error);
  let f = env.CLAUDE_CODE_ENTRYPOINT === undefined ? "cli" : (getEntrypointKind() ?? "other");
  let d = envSessionKind();
  let rendererModeForAnalytics = getRendererModeForAnalytics();
  let _ = currentAuthSurface();
  let majorMinorVersion = getMajorMinorVersion(release());
  return {
    ddtags: [
      `service:${CLAUDE_CODE_ERROR_TRACKING}`,
      "team:claude-code",
      `version:${version}`,
      "env:external",
      `origin:${r}`,
      `platform:${getPlatform()}`,
      `os_release:${majorMinorVersion}`,
      `user_bucket:${userBucket}`,
      `entrypoint:${f}`,
      `node_version:${process.versions.node}`,
      "bun_version:1.4.4",
      `is_native_runtime:${F}`,
      ...(canonicalModelForTracking ? [`model:${canonicalModelForTracking}`] : []),
      ...(m ? [`error_code:${m}`] : []),
      ...(telemetryChildExitStatus !== undefined ? [`child_exit_status:${telemetryChildExitStatus}`] : []),
      ...(d ? [`session_kind:${d}`] : []),
      ...(d ? [`has_attacher:${getAttacherCaps() ? "1" : "0"}`] : []),
      ...(rendererModeForAnalytics ? [`renderer_mode:${rendererModeForAnalytics}`] : []),
      ...(_ ? [`remote_control_lane:${_}`] : []),
      ...(getCurrentAuthSurface() ? ["projects_session:1"] : []),
    ].join(","),
    service: CLAUDE_CODE_ERROR_TRACKING,
    hostname: "claude-code",
    status: "error",
    message: `${o}: ${a}`.slice(0, 4000),
    timestamp: new Date().toISOString(),
    error: {
      kind: o,
      message: a.slice(0, 4000),
      stack: C.slice(0, 16000),
      fingerprint,
      handling: r === "logError" ? "handled" : "unhandled",
    },
    version,
    sourcemap_group: sourcemapGroup,
    env: "external",
    user_bucket: userBucket,
    origin: r,
    host_platform: getPlatform(),
    host_os_release: majorMinorVersion,
    host_name_redacted: getOrCreateMachineID().slice(0, 12),
    entrypoint: f,
    node_version: process.versions.node,
    bun_version: "1.4.4",
    ...(canonicalModelForTracking && {
      model: canonicalModelForTracking,
    }),
    error_frames: sliced,
    feature_flags: getNonDefaultBooleanFlags(),
  };
}
//@ chunk-crrjgh95.js:5589-5873 placement
/**
 * 已知可忽略的系统栈帧（node 内部帧）。
 */
var EXPECTED_ERROR_CLASSES = new Set(["APIUserAbortError", "AuthenticationError", "McpSessionExpiredError"]);
var KNOWN_IGNORED_ERRORS = [
  {
    messagePrefix: "File does not exist",
    topFrameIncludes: "FileReadTool.ts",
  },
];
var KNOWN_IGNORED_SYSTEM_FRAMES = [
  {
    topFile: "node:net",
    topFunction: "internalConnectMultipleTimeout",
  },
  {
    topFile: "node:_http_server",
    topFunction: "#onClose",
  },
];
//@ chunk-crrjgh95.js:5873-6005 placement
function isIgnoredTopFrame(error) {
  let sanitizedStackFrames = getSanitizedStackFrames(error, 20);
  let o = sanitizedStackFrames[0];
  if (!o || sanitizedStackFrames.some(isSourceFrame)) return false;
  return KNOWN_IGNORED_SYSTEM_FRAMES.some((n) => o.file === n.topFile && o.function === n.topFunction);
}
//@ chunk-crrjgh95.js:6005-6141 placement
function isRemoteEnvironment() {
  return (
    env.CLAUDE_CODE_REMOTE === true ||
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
    Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE)
  );
}
//@ chunk-crrjgh95.js:6141-6466 placement
function classifyFsSyscall(error, r) {
  if (EXPECTED_ERROR_CLASSES.has(r)) return true;
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
    (n) =>
      message.startsWith(n.messagePrefix) &&
      (
        error.stack
          ?.split(
            `
`,
          )
          .find((line) => line.trim().startsWith("at ")) ?? ""
      ).includes(n.topFrameIncludes),
  );
}
//@ chunk-crrjgh95.js:6466-6547 placement
/**
 * 取版本的 major.minor，取不到返回 unknown。
 */
function getMajorMinorVersion(e) {
  let match = /^(\d+)\.(\d+)/.exec(e);
  return match ? `${match[1]}.${match[2]}` : "unknown";
}
//@ chunk-crrjgh95.js:6547-6766 placement
/**
 * 把错误上报到客户端错误追踪：判定开启后过滤文件系统系统调用错误、已知可忽略的未处理异常、达到上限，然后构建事件入队。
 */
function trackError(e, r = "logError") {
  try {
    if (!isErrorReportingEnabled()) return;
    let error = toError(e);
    let n = errorClassName(error);
    if (r === "logError" && classifyFsSyscall(error, n)) return;
    if ((r === "unhandled_rejection" || r === "uncaught_exception") && isIgnoredTopFrame(error)) return;
    if (isErrorTrackingCapReached()) return;
    let errorTrackingEvent = buildErrorTrackingEvent(error, r, n);
    enqueueErrorLog(errorTrackingEvent);
  } catch {}
}
export { trackError, errorClassName };
