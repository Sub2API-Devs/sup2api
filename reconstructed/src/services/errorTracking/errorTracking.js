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
  jOi,
  UOi,
  getSanitizedStackFrames,
  isStackOnlyExternal,
  DSr,
} from "../../utils/errorStackSanitize.js";
import { LEGACY_MODEL_IDS, Lt } from "../../utils/model/modelIds.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getAllGrowthBookFeatures, getNonDefaultFeatureKeys } from "../analytics/growthbook.js";
import {
  Lf,
  fT,
  ef,
  q7t,
  K9e,
  Y7t,
  V9e,
  X7t,
  J7t,
  Q7t,
  Z7t,
  Ot,
  AHn,
  pr,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { rp } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
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
import { aro, getCurrentAuthSurface } from "../analytics/authOutcomeTelemetry.js";
import { getPlatform } from "../../utils/platform.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import { isErrorReportingEnabled } from "../errorReportingGate.js";

//@ chunk-crrjgh95.js:802-837 placement
var CLAUDE_CODE_ERROR_TRACKING = "claude-code-error-tracking";
//@ chunk-crrjgh95.js:837-1903 placement
function buildErrorTrackingRelease(e) {
  return e
    ? {
        version: `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}_${e}`,
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
var O = 30;
//@ chunk-crrjgh95.js:1912-2116 placement
function getUserBucket() {
  let e = errorTrackingClient();
  if (e.cachedUserBucket !== void 0) return e.cachedUserBucket;
  let r = getOrCreateUserID(),
    digest = createHash("sha256").update(r).digest("hex");
  return ((e.cachedUserBucket = parseInt(digest.slice(0, 8), 16) % O), e.cachedUserBucket);
}
//@ chunk-crrjgh95.js:2116-2342 placement
function computeErrorFingerprint(e, r) {
  let joined = r
    .slice(0, 3)
    .map((n) =>
      jOi(n)
        ? `${n.function ?? "?"}@${n.file}:${n.line ?? "?"}:${n.column ?? "?"}`
        : `${n.function ?? "?"}@${UOi(n.file)}`,
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
var M = new Set(LEGACY_MODEL_IDS);
//@ chunk-crrjgh95.js:2361-2472 placement
function getCanonicalModelForTracking() {
  try {
    let e = getMainLoopModel();
    if (!e) return;
    let r = getCanonicalName(Lt(e), { identity: !0 });
    return M.has(r) ? r : "other";
  } catch {
    return;
  }
}
//@ chunk-crrjgh95.js:2472-2481 placement
var U = 50;
//@ chunk-crrjgh95.js:2481-2642 placement
function getNonDefaultBooleanFlags() {
  try {
    let e = getAllGrowthBookFeatures(),
      r = getNonDefaultFeatureKeys(),
      o = {},
      n = 0;
    for (let [t, s] of Object.entries(e))
      if (typeof s === "boolean" && r.has(t)) {
        if (((o[t] = s), ++n >= U)) break;
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
  let filtered = issues.map((n) => n?.code).filter((n) => typeof n === "string" && /^[a-z_]{1,40}$/.test(n));
  return `${issues.length} issue(s): ${filtered.join(",")}`;
}
//@ chunk-crrjgh95.js:2843-2857 placement
function B() {}
/**
 * 错误追踪：构建是否保留类名（探测函数名未被压缩）、SDK/客户端错误类名表（用 instanceof 识别）、"已验证无代码路径" 后缀正则。
 */
//@ chunk-crrjgh95.js:2857-3369 placement
var CLASS_NAMES_PRESERVED = !B.name.startsWith("errorTrackingIdentifierProbe"),
  KNOWN_ERROR_CLASSES = [
    ["APIUserAbortError", Lf],
    ["APIConnectionTimeoutError", fT],
    ["APIConnectionError", ef],
    ["BadRequestError", q7t],
    ["AuthenticationError", K9e],
    ["PermissionDeniedError", Y7t],
    ["NotFoundError", V9e],
    ["ConflictError", X7t],
    ["UnprocessableEntityError", J7t],
    ["RateLimitError", Q7t],
    ["InternalServerError", Z7t],
    ["APIError", Ot],
    ["RetryableError", AHn],
    ["WorkloadIdentityError", rp],
    ["AnthropicError", pr],
    ["ClaudeError", ClaudeError],
  ],
  VERIFIED_SAFE_SUFFIX_RE = /_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS$/;
//@ chunk-crrjgh95.js:3369-3679 placement
function errorClassName(e, r = CLASS_NAMES_PRESERVED) {
  let o =
      typeof e.constructor?.name === "string"
        ? e.constructor.name.replace(VERIFIED_SAFE_SUFFIX_RE, "")
        : void 0,
    n = r && e instanceof ClaudeError && e.name === o,
    replaced = (
      (typeof e.name === "string" && e.name !== "Error" && !n ? e.name : void 0) ||
      (!r && sanitizeClassName(o) !== void 0
        ? o
        : KNOWN_ERROR_CLASSES.find(([, a]) => e instanceof a)?.[0]) ||
      "Error"
    ).replace(VERIFIED_SAFE_SUFFIX_RE, "");
  return sanitizeClassName(replaced) ?? "Error";
}
//@ chunk-crrjgh95.js:3679-3688 placement
var G = 20;
/**
 * 构造错误追踪事件（截取栈、标记捆绑外抛出、版本信息）。
 */
//@ chunk-crrjgh95.js:3688-5589 placement
function buildErrorTrackingEvent(e, r, o) {
  let n = getSanitizedStackFrames(e),
    t = isStackOnlyExternal(n),
    sliced = n.slice(0, G),
    c = getTelemetryMessage(e),
    a =
      t && c === void 0
        ? `thrown outside the Claude Code bundle (${o})`
        : redactErrorMessage(redactErrorPaths(e, c ?? summarizeZodIssues(e) ?? e.message ?? String(e))),
    C = formatGitErrorFrames({ name: o, message: a }, sliced),
    { version: version, sourcemapGroup: sourcemapGroup } = buildErrorTrackingRelease(
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
    ),
    y = computeErrorFingerprint(o, sliced),
    E = getUserBucket(),
    u = getCanonicalModelForTracking(),
    F = typeof Bun < "u" && !0,
    m = sanitizeErrnoForTelemetry(e),
    p = getTelemetryChildExitStatus(e),
    f = env.CLAUDE_CODE_ENTRYPOINT === void 0 ? "cli" : (getEntrypointKind() ?? "other"),
    d = envSessionKind(),
    g = getRendererModeForAnalytics(),
    _ = aro(),
    h = X(release());
  return {
    ddtags: [
      `service:${CLAUDE_CODE_ERROR_TRACKING}`,
      "team:claude-code",
      `version:${version}`,
      "env:external",
      `origin:${r}`,
      `platform:${getPlatform()}`,
      `os_release:${h}`,
      `user_bucket:${E}`,
      `entrypoint:${f}`,
      `node_version:${process.versions.node}`,
      "bun_version:1.4.4",
      `is_native_runtime:${F}`,
      ...(u ? [`model:${u}`] : []),
      ...(m ? [`error_code:${m}`] : []),
      ...(p !== void 0 ? [`child_exit_status:${p}`] : []),
      ...(d ? [`session_kind:${d}`] : []),
      ...(d ? [`has_attacher:${getAttacherCaps() ? "1" : "0"}`] : []),
      ...(g ? [`renderer_mode:${g}`] : []),
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
      fingerprint: y,
      handling: r === "logError" ? "handled" : "unhandled",
    },
    version: version,
    sourcemap_group: sourcemapGroup,
    env: "external",
    user_bucket: E,
    origin: r,
    host_platform: getPlatform(),
    host_os_release: h,
    host_name_redacted: getOrCreateMachineID().slice(0, 12),
    entrypoint: f,
    node_version: process.versions.node,
    bun_version: "1.4.4",
    ...(u && { model: u }),
    error_frames: sliced,
    feature_flags: getNonDefaultBooleanFlags(),
  };
}
//@ chunk-crrjgh95.js:5589-5873 placement
var EXPECTED_ERROR_CLASSES = new Set(["APIUserAbortError", "AuthenticationError", "McpSessionExpiredError"]),
  W = [{ messagePrefix: "File does not exist", topFrameIncludes: "FileReadTool.ts" }],
  z = [
    { topFile: "node:net", topFunction: "internalConnectMultipleTimeout" },
    { topFile: "node:_http_server", topFunction: "#onClose" },
  ];
//@ chunk-crrjgh95.js:5873-6005 placement
function isIgnoredTopFrame(e) {
  let r = getSanitizedStackFrames(e, 20),
    o = r[0];
  if (!o || r.some(DSr)) return !1;
  return z.some((n) => o.file === n.topFile && o.function === n.topFunction);
}
//@ chunk-crrjgh95.js:6005-6141 placement
function isRemoteEnvironment() {
  return (
    env.CLAUDE_CODE_REMOTE === !0 ||
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
    Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE)
  );
}
//@ chunk-crrjgh95.js:6141-6466 placement
function classifyFsSyscall(e, r) {
  if (EXPECTED_ERROR_CLASSES.has(r)) return !0;
  if (
    hasEmbeddedSearchTools_2() &&
    !isRemoteEnvironment() &&
    isSyscallError(e) &&
    e.code !== void 0 &&
    PERMISSION_DENIED_CODES.has(e.code) &&
    (e.syscall === "mkdir" || e.syscall === "open") &&
    getPlatform() !== "windows"
  )
    return !0;
  let o = e.message ?? "";
  return W.some(
    (n) =>
      o.startsWith(n.messagePrefix) &&
      (
        e.stack
          ?.split(
            `
`,
          )
          .find((t) => t.trim().startsWith("at ")) ?? ""
      ).includes(n.topFrameIncludes),
  );
}
//@ chunk-crrjgh95.js:6466-6547 placement
function X(e) {
  let match = /^(\d+)\.(\d+)/.exec(e);
  return match ? `${match[1]}.${match[2]}` : "unknown";
}
/**
 * 把错误上报到客户端错误追踪：判定开启后过滤文件系统系统调用错误、已知可忽略的未处理异常、达到上限，然后构建事件入队。
 */
//@ chunk-crrjgh95.js:6547-6766 placement
function trackError(e, r = "logError") {
  try {
    if (!isErrorReportingEnabled()) return;
    let o = toError(e),
      n = errorClassName(o);
    if (r === "logError" && classifyFsSyscall(o, n)) return;
    if ((r === "unhandled_rejection" || r === "uncaught_exception") && isIgnoredTopFrame(o)) return;
    if (isErrorTrackingCapReached()) return;
    let t = buildErrorTrackingEvent(o, r, n);
    enqueueErrorLog(t);
  } catch {}
}

export { trackError, errorClassName };
