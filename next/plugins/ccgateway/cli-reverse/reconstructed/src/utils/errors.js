/**
 * utils/errors.ts
 *
 * 错误类型与工具：AbortError、TelemetrySafeError、errno 分类、axios 错误分类、错误消息/栈格式化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/errors.ts
 * pieces: chunk-51jy8ztq.js (1), chunk-5xgkngpb.js (1), chunk-63094ahz.js (68), chunk-asf5gh8x.js (1), chunk-hb44av3w.js (1), chunk-xd1cb3xs.js (1)
 * attribution: fingerprint 3, callgraph-witnessed 1, placement 68, facade-majority 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, join, relative } from "path";
import { realpath, lstat } from "fs/promises";
import { APIUserAbortError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { stripStackHeader } from "./errorStackSanitize.js";
import { ARTIFACT_DOC_PATH_RE } from "../services/artifacts/artifactToolGates.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-63094ahz.js:2325-2406 placement
class ClaudeError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
//@ chunk-63094ahz.js:2406-2430 placement
class MalformedCommandError extends Error {}
//@ chunk-63094ahz.js:2430-2473 placement
class CliUserError extends Error {
  name = "CliUserError";
}
//@ chunk-63094ahz.js:2473-2544 placement (2.1.88 match: AbortError, 1)
class AbortError extends Error {
  constructor(message) {
    super(message);
    this.name = "AbortError";
  }
}
//@ chunk-63094ahz.js:2544-2565 placement
let StreamClosedAbortError; // deferred: uses AbortError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-63094ahz.js:2544", () => {
  StreamClosedAbortError = class StreamClosedAbortError extends AbortError {};
});
//@ chunk-63094ahz.js:2565-2728 placement (2.1.88 match: isAbortError, 0.469)
/**
 * 判断是否为中断错误（AbortError、内部取消、name=AbortError 或 axios __CANCEL__）。
 */
function isAbortError(e) {
  try {
    return (
      e instanceof AbortError ||
      e instanceof APIUserAbortError ||
      (e instanceof Error && (e.name === "AbortError" || ("__CANCEL__" in e && Boolean(e.__CANCEL__))))
    );
  } catch {
    return false;
  }
}
//@ chunk-63094ahz.js:2728-2869 placement (2.1.88 match: ConfigParseError, 1)
class ConfigParseError extends Error {
  filePath;
  defaultConfig;
  constructor(message, filePath, defaultConfig) {
    super(message);
    this.name = "ConfigParseError";
    this.filePath = filePath;
    this.defaultConfig = defaultConfig;
  }
}
//@ chunk-63094ahz.js:2869-3251 placement (2.1.88 match: ShellError, 0.704)
class ShellError extends Error {
  stdout;
  stderr;
  code;
  interrupted;
  hadSandboxViolation;
  sandboxViolations;
  sandboxed;
  constructor(details) {
    super("Shell command failed");
    this.name = "ShellError";
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    this.code = details.code;
    this.interrupted = details.interrupted;
    this.hadSandboxViolation = details.hadSandboxViolation ?? false;
    this.sandboxViolations = details.sandboxViolations;
    this.sandboxed = details.sandboxed;
  }
}
//@ chunk-63094ahz.js:3251-3377 placement (2.1.88 match: TeleportOperationError, 0.814)
class TeleportOperationError extends Error {
  formattedMessage;
  constructor(message, formattedMessage) {
    super(message);
    this.formattedMessage = formattedMessage;
    this.name = "TeleportOperationError";
  }
}
//@ chunk-63094ahz.js:3377-3532 placement (2.1.88 match: TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, 0.878)
/**
 * 可上报遥测的错误类型：构造时显式给出不含代码和路径的遥测消息。
 */
class TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends Error {
  telemetryMessage;
  errorClass;
  constructor(message, telemetryMessage, defaultConfig) {
    super(message);
    this.name = "TelemetrySafeError";
    this.telemetryMessage = telemetryMessage ?? message;
    this.errorClass = defaultConfig;
  }
}
//@ chunk-63094ahz.js:3532-3552 placement
let WireSafeControlError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-63094ahz.js:3532", () => {
  WireSafeControlError = class WireSafeControlError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-63094ahz.js:3552-3851 placement
var withTelemetryMessage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BUILTIN_ERROR_NAMES;
var LANGUAGE_ERROR_NAMES;
deferInit("chunk-63094ahz.js:3552", () => {
  withTelemetryMessage = (error, telemetryMessage) => {
    try {
      if (
        error !== null &&
        typeof error === "object" &&
        !("telemetryMessage" in error) &&
        Object.isExtensible(error)
      )
        Object.assign(error, {
          telemetryMessage,
        });
    } catch {}
    return error;
  };
  BUILTIN_ERROR_NAMES = [
    "AggregateError",
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SuppressedError",
    "SyntaxError",
    "TypeError",
    "URIError",
  ];
  LANGUAGE_ERROR_NAMES = new Set(BUILTIN_ERROR_NAMES);
});
//@ chunk-63094ahz.js:3851-4006 placement
function languageErrorNameOf(error) {
  try {
    let errorName = error instanceof Error ? error.name : undefined;
    let found = BUILTIN_ERROR_NAMES.find((builtinName) => builtinName === errorName);
    if (found !== undefined) return found;
  } catch {}
  return "a value that is not a built-in error";
}
//@ chunk-63094ahz.js:4006-4446 placement
/**
 * 把非空的附加字段并入一个可扩展对象（只补缺失键，失败时原样返回），用于给错误对象附加退出状态等元信息。
 */
var withTelemetryFacts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHILD_EXIT_STATUS_SYMBOL;
var withTelemetryChildExitStatus;
deferInit("chunk-63094ahz.js:4006", () => {
  withTelemetryFacts = (target, facts) => {
    try {
      if (target !== null && typeof target === "object" && Object.isExtensible(target)) {
        let targetObject = target;
        let filtered = Object.entries(facts).filter(
          ([key, value]) => value !== undefined && !(key in targetObject),
        );
        Object.assign(targetObject, Object.fromEntries(filtered));
      }
    } catch {}
    return target;
  };
  CHILD_EXIT_STATUS_SYMBOL = Symbol("telemetryChildExitStatus");
  withTelemetryChildExitStatus = (target, status) => {
    try {
      if (
        status !== undefined &&
        target !== null &&
        typeof target === "object" &&
        !Object.hasOwn(target, CHILD_EXIT_STATUS_SYMBOL) &&
        Object.isExtensible(target)
      )
        Object.defineProperty(target, CHILD_EXIT_STATUS_SYMBOL, {
          value: status,
          enumerable: false,
          writable: false,
          configurable: false,
        });
    } catch {}
    return target;
  };
});
//@ chunk-63094ahz.js:4446-4600 placement
/**
 * 读取错误对象上附加的 telemetryMessage（可安全上报的描述）。
 */
function getTelemetryMessage(value) {
  try {
    if (
      value !== null &&
      typeof value === "object" &&
      "telemetryMessage" in value &&
      typeof value.telemetryMessage === "string"
    )
      return value.telemetryMessage;
  } catch {}
  return;
}
//@ chunk-63094ahz.js:4600-4658 placement
function hasExactErrorMessage(error, message) {
  return error instanceof Error && error.message === message;
}
//@ chunk-63094ahz.js:4658-4717 placement
/**
 * 非 Error 值包装成 Error。
 */
function toError(e) {
  return e instanceof Error ? e : Error(String(e));
}
//@ chunk-63094ahz.js:4717-4777 facade-majority (2.1.88 match: errorMessage, 0)
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
//@ chunk-63094ahz.js:4777-4876 placement (2.1.88 match: isConnectionError, 1)
/**
 * 取错误对象的字符串 code（如 ENOENT），没有返回 undefined。全项目大量使用。
 */
function getErrnoCode(err) {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") return err.code;
  return;
}
//@ chunk-63094ahz.js:4876-4907 placement
function sanitizeErrnoForTelemetry(error) {
  return sanitizeErrnoTokenForTelemetry(getErrnoCode(error));
}
//@ chunk-63094ahz.js:4907-4978 placement
function sanitizeErrnoTokenForTelemetry(token) {
  return token && /^[A-Z][A-Z0-9_]{0,63}$/.test(token)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(token)
    : undefined;
}
//@ chunk-63094ahz.js:4978-5009 placement
var MIN_INT32 = -2147483648;
var MAX_UINT32 = 4294967295;
//@ chunk-63094ahz.js:5009-5249 placement
function getTelemetryChildExitStatus(target) {
  try {
    if (target === null || typeof target !== "object") return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(target, CHILD_EXIT_STATUS_SYMBOL);
    let status =
      ownPropertyDescriptor !== undefined && Object.hasOwn(ownPropertyDescriptor, "value")
        ? ownPropertyDescriptor.value
        : undefined;
    return typeof status === "number" &&
      Number.isInteger(status) &&
      status >= MIN_INT32 &&
      status <= MAX_UINT32
      ? status
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-63094ahz.js:5249-5383 placement
var DAEMON_UNREACHABLE_TIMEOUT_PHRASE = "did not become reachable within";
var DAEMON_EXITED_BEFORE_REACHABLE_PHRASE = "exited before it became reachable";
var BUN_CONNECTION_CLOSED_MESSAGE_PREFIX = "The socket connection was closed unexpectedly";
//@ chunk-63094ahz.js:5383-5508 placement
function extractErrnoTokens(text) {
  return [...text.matchAll(/\bE\d?[A-Z]{2,14}\b/g)]
    .filter((match) => !"/\\".includes(text[match.index - 1] ?? "."))
    .map((match) => match[0]);
}
//@ chunk-63094ahz.js:5508-5610 placement
function sanitizeErrorName(error) {
  let errorName = error?.name;
  return typeof errorName === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(errorName)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(errorName)
    : undefined;
}
//@ chunk-63094ahz.js:5610-5645 placement
function sanitizedErrCodeForTelemetry(error) {
  return sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error);
}
//@ chunk-63094ahz.js:5645-5701 placement
function sanitizedErrnoLowerForTelemetry(error) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(sanitizeErrnoForTelemetry(error)?.toLowerCase() ?? "other");
}
//@ chunk-63094ahz.js:5701-5729 placement
function sanitizedErrorNameForTelemetry(error) {
  return sanitizeErrorName(error);
}
//@ chunk-63094ahz.js:5729-5813 placement
function sanitizedConnectionCodeForTelemetry(code) {
  return code !== undefined && /^[A-Z][A-Za-z0-9_]{0,63}$/.test(code)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(code)
    : undefined;
}
//@ chunk-63094ahz.js:5813-5887 placement
function sanitizedConnectionCodeLowerForTelemetry(errnoCode) {
  let sanitizedCode = sanitizedConnectionCodeForTelemetry(errnoCode);
  return sanitizedCode === undefined
    ? undefined
    : fromSanitizer_SANITIZER_OUTPUT_ONLY(sanitizedCode.toLowerCase());
}
//@ chunk-63094ahz.js:5887-5975 placement
function sanitizeClassName(className) {
  return typeof className === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(className)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(className)
    : undefined;
}
//@ chunk-63094ahz.js:5975-6072 placement
function sanitizedOAuthErrorTypeForTelemetry(errorType) {
  return typeof errorType === "string" && /^[a-z][a-z_]{0,39}$/.test(errorType)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(errorType)
    : lit("unparseable");
}
//@ chunk-63094ahz.js:6072-6149 placement
function sanitizedMachineReasonForTelemetry(reason) {
  return /^[a-z][a-z0-9_]{0,39}$/.test(reason)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(reason)
    : lit("unparseable");
}
//@ chunk-63094ahz.js:6149-6265 placement
function sanitizedFeatureErrorCodeForTelemetry(errorCode) {
  if (typeof errorCode !== "string") return;
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(errorCode)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(errorCode)
    : lit("nonconforming");
}
//@ chunk-63094ahz.js:6265-6531 placement
function sanitizedBgExitCauseForTelemetry(cause) {
  if (cause === undefined) return;
  let index = cause.indexOf(":");
  let causeKind = index === -1 ? cause : cause.slice(0, index);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(causeKind)) return lit("unparseable");
  if (index === -1) return fromSanitizer_SANITIZER_OUTPUT_ONLY(causeKind);
  let sliced = cause.slice(index + 1);
  let causeDetail =
    sanitizeErrnoTokenForTelemetry(sliced) ??
    sanitizeClassName(sliced) ??
    (sliced === "string" || sliced === "non-error" ? sliced : "Error");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${causeKind}:${causeDetail}`);
}
//@ chunk-63094ahz.js:6531-6560 placement
function sanitizedClassNameForTelemetry(name) {
  return sanitizeClassName(name);
}
//@ chunk-63094ahz.js:6560-6693 placement
function sanitizedErrorClassNameForTelemetry(error) {
  let className = error?.constructor?.name;
  return typeof className === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(className)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(className)
    : lit("unparseable");
}
//@ chunk-63094ahz.js:6693-6739 placement
function sanitizeTopFrame(frame) {
  return STACK_FRAME_FILE_RE.test(frame) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(frame) : undefined;
}
//@ chunk-63094ahz.js:6739-7221 placement
/**
 * 匹配堆栈帧文件名的正则（用户代码、常见脚本扩展名、node 内部模块等），以及表示资源耗尽的 errno 集合。
 */
var STACK_FRAME_FILE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESOURCE_EXHAUSTION_CODES;
deferInit("chunk-63094ahz.js:6739", () => {
  STACK_FRAME_FILE_RE =
    /^(?:<user-code>|(?:[\w$.\-<>[\]]{1,72}\.(?:[cm]?[jt]sx?|json|node|wasm|exe)|node:internal(?:\/[a-z0-9_-]{1,40}){1,4}|node:[a-z0-9_]{1,30}(?:\/(?:promises|web|consumers|posix|win32|types|strict|reporters))?|bun:[a-z0-9_]{1,20}|internal:[a-z0-9_-]{1,30}(?:\/[a-z0-9_-]{1,40}){0,3}|<anonymous>|\[eval\](?:-wrapper)?|native|unknown|cli|claude|ws|undici|node-fetch|isomorphic-fetch|vercel_fetch|utf-8-validate)(?::\d{1,8}){2})$/;
  RESOURCE_EXHAUSTION_CODES = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EMFILE"]);
});
//@ chunk-63094ahz.js:7221-7282 placement
function isDiskFullErrno(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOSPC" || errnoCode === "EDQUOT";
}
//@ chunk-63094ahz.js:7282-7326 placement
var PERMISSION_DENIED_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-63094ahz.js:7282", () => {
  PERMISSION_DENIED_CODES = new Set(["EACCES", "EPERM", "EROFS"]);
});
//@ chunk-63094ahz.js:7326-7418 placement
function isSyscallError(error) {
  return error !== null && typeof error === "object" && "errno" in error && typeof error.errno === "number";
}
//@ chunk-63094ahz.js:7418-7534 placement
function findInCauseChain(error, matches, maxDepth = 5) {
  let current = error;
  for (let i = 0; i < maxDepth; i++) {
    if (!(current instanceof Error)) return;
    if (matches(current)) return current;
    current = current.cause;
  }
  return;
}
//@ chunk-63094ahz.js:7534-7571 placement (2.1.88 match: getErrnoCode, 0)
/**
 * 取错误的 errno code（如 ENOENT）。
 */
function isENOENT(e) {
  return getErrnoCode(e) === "ENOENT";
}
//@ chunk-63094ahz.js:7571-7632 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isPathAbsent(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-63094ahz.js:7632-7670 placement
function isEISDIR(error) {
  return getErrnoCode(error) === "EISDIR";
}
//@ chunk-63094ahz.js:7670-7708 placement
function isE2BIG(error) {
  return getErrnoCode(error) === "E2BIG";
}
//@ chunk-63094ahz.js:7708-7956 placement
function isHttpServerConnReset(error) {
  try {
    if (getErrnoCode(error) !== "ECONNRESET") return false;
    let stack = error instanceof Error ? error.stack : undefined;
    if (typeof stack !== "string") return false;
    let found = stack
      .split(
        `
`,
      )
      .find((line) => line.trim().startsWith("at "));
    return found !== undefined && found.includes("node:_http_server");
  } catch {
    return false;
  }
}
//@ chunk-63094ahz.js:7956-8057 placement (2.1.88 match: getErrnoPath, 1)
function getErrnoPath(e) {
  if (e && typeof e === "object" && "path" in e && typeof e.path === "string") return e.path;
  return;
}
//@ chunk-63094ahz.js:8057-8284 placement
/**
 * 格式化 `name: message` 加调用栈。
 */
function errorStackOrMessage(error) {
  let header = error.message ? `${error.name}: ${error.message}` : error.name;
  let stack = error.stack;
  if (!stack) return header;
  if (stack.startsWith(header)) return stack;
  let lines = stack.split(`
`);
  let firstLine = lines[0] ?? "";
  let bodyLines = firstLine === error.name || firstLine.startsWith(`${error.name}:`) ? lines.slice(1) : lines;
  return [header, ...bodyLines].join(`
`);
}
//@ chunk-63094ahz.js:8284-8368 placement
var FS_ACCESS_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-63094ahz.js:8284", () => {
  FS_ACCESS_ERRNOS = new Set(["ENOENT", "EACCES", "EPERM", "ENOTDIR", "ELOOP", "ENAMETOOLONG", "EROFS"]);
});
//@ chunk-63094ahz.js:8368-8399 placement
function isFsInaccessible(error) {
  return isFsInaccessibleCode(getErrnoCode(error));
}
//@ chunk-63094ahz.js:8399-8442 placement
/**
 * errno 是否属于文件访问类错误（ENOENT/EACCES/EPERM/ENOTDIR/ELOOP/ENAMETOOLONG/EROFS）。
 */
function isFsInaccessibleCode(code) {
  return code !== undefined && FS_ACCESS_ERRNOS.has(code);
}
//@ chunk-63094ahz.js:8442-8625 placement
/**
 * 读取 error.cause.telemetryCode（存储层错误的遥测码）。
 */
function storageCauseErrnoCode(error) {
  let cause = error instanceof Error ? error.cause : undefined;
  if (typeof cause !== "object" || cause === null || !("telemetryCode" in cause)) return;
  return typeof cause.telemetryCode === "string" ? cause.telemetryCode : undefined;
}
//@ chunk-63094ahz.js:8625-8675 placement
var FS_RESOURCE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-63094ahz.js:8625", () => {
  FS_RESOURCE_ERRNOS = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EIO"]);
});
//@ chunk-63094ahz.js:8675-8707 placement
function isEnvFsErrno(error) {
  return isEnvFsErrnoCode(getErrnoCode(error));
}
//@ chunk-63094ahz.js:8707-8880 placement
function isEnvFsErrnoCode(code) {
  return (
    code === "EDEADLK" ||
    code === "EINTR" ||
    code === "ENXIO" ||
    code === "ENODEV" ||
    code === "ECANCELED" ||
    code === "ENEEDAUTH" ||
    code === "ESTALE" ||
    code === "EUNKNOWN" ||
    code === "ENOMEM" ||
    (code !== undefined && isUnknownSystemError(code))
  );
}
//@ chunk-63094ahz.js:8880-8953 placement
function isUnknownSystemError(error) {
  return error === "UNKNOWN" || error.startsWith("Unknown system error");
}
//@ chunk-63094ahz.js:8953-9074 placement
function isWin32ReadEbadf(error, platform = "linux") {
  if (platform !== "win32") return false;
  try {
    return isSyscallError(error) && error.code === "EBADF" && error.syscall === "read";
  } catch {
    return false;
  }
}
//@ chunk-63094ahz.js:9074-9163 placement
function errnoShapedCode(telemetryCode) {
  if (typeof telemetryCode !== "string") return;
  return /^E[A-Z0-9]+$/.test(telemetryCode) || isUnknownSystemError(telemetryCode)
    ? telemetryCode
    : undefined;
}
//@ chunk-63094ahz.js:9163-9218 placement
function isSadResourceErrno(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && FS_RESOURCE_ERRNOS.has(errnoCode);
}
//@ chunk-63094ahz.js:9218-9250 placement
function isSadFsErrno(error) {
  return isSadFsErrnoCode(getErrnoCode(error));
}
//@ chunk-63094ahz.js:9250-9320 placement
function isSadFsErrnoCode(code) {
  return (
    code !== undefined && (FS_ACCESS_ERRNOS.has(code) || code === "EISDIR" || FS_RESOURCE_ERRNOS.has(code))
  );
}
//@ chunk-63094ahz.js:9320-9502 placement
/**
 * axios 错误是否为认证/限流类（无状态码、401、403、429），可由调用方追加判断。
 */
function isExpectedApiError(error, apiError) {
  if (apiError?.(error)) return true;
  if (!error || typeof error !== "object" || !("isAxiosError" in error) || !error.isAxiosError) return false;
  let status = error.response?.status;
  return status === undefined || status === 401 || status === 403 || status === 429;
}
//@ chunk-63094ahz.js:9502-9599 placement
function isMaxContentLengthError(error) {
  return error instanceof Error && /maxContentLength size of .* exceeded/.test(error.message);
}
//@ chunk-63094ahz.js:9599-10010 placement (2.1.88 match: classifyAxiosError, 1)
/**
 * 把 axios 错误分类为 auth/timeout/network/http/other 并给出状态码。
 */
function classifyAxiosError(e_2) {
  let message = errorMessage(e_2);
  if (!e_2 || typeof e_2 !== "object" || !("isAxiosError" in e_2) || !e_2.isAxiosError)
    return {
      kind: "other",
      message,
    };
  let err = e_2;
  let status = err.response?.status;
  if (status === 401 || status === 403)
    return {
      kind: "auth",
      status,
      message,
    };
  if (err.code === "ECONNABORTED")
    return {
      kind: "timeout",
      status,
      message,
    };
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND")
    return {
      kind: "network",
      status,
      message,
    };
  return {
    kind: "http",
    status,
    message,
  };
}
//@ chunk-63094ahz.js:10010-10086 placement
function isNonRetryableClientError(status) {
  return (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 409 &&
    status !== 429
  );
}
//@ chunk-hb44av3w.js:3875-4141 fingerprint (2.1.88 match: shortErrorStack, 0.88)
function shortErrorStack(error, maxFrames) {
  try {
    let stack = typeof error.stack === "string" ? error.stack : "";
    let stripped = stripStackHeader(error);
    let frames =
      stripped.length < stack.length && stack.endsWith(stripped)
        ? stripped.replace(/\n$/, "").split(`
`)
        : [];
    let stackLines = frames.every((line) => line.trimStart().startsWith("at ")) ? frames : [];
    error.stack = [`${error.name}: ${maxFrames}`, ...stackLines].join(`
`);
    error.message = maxFrames;
  } catch {}
  return error;
}
//@ chunk-51jy8ztq.js:179130-179261 fingerprint (2.1.88 match: getErrnoPath, 1)
function getErrnoPath_2(error) {
  if (error === null || typeof error !== "object" || !("path" in error)) return;
  let path = error.path;
  return typeof path === "string" && ARTIFACT_DOC_PATH_RE.test(path) ? path : undefined;
}
//@ chunk-5xgkngpb.js:1385664-1385922 callgraph-witnessed (2.1.88 match: isENOENT, 0)
async function isENOENT_2(filePath) {
  let parentDir = dirname(filePath);
  try {
    return await realpath(parentDir);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let currentDir = parentDir;
  for (;;) {
    let grandparentDir = dirname(currentDir);
    if (grandparentDir === currentDir) return;
    currentDir = grandparentDir;
    try {
      await lstat(currentDir);
    } catch (error) {
      if (!isENOENT(error)) throw error;
      continue;
    }
    return realpath(currentDir)
      .then((realGrandparent) => join(realGrandparent, relative(currentDir, parentDir)))
      .catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      });
  }
}
//@ chunk-xd1cb3xs.js:4838-4916 placement (2.1.88 match: isConnectionError, 1)
function getErrorCodeString(err) {
  return err && typeof err === "object" && "code" in err ? String(err.code) : undefined;
}
//@ chunk-asf5gh8x.js:33574-33645 fingerprint (2.1.88 match: isFsInaccessible, 0.878)
var isFsInaccessible_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-asf5gh8x.js:33574", () => {
  isFsInaccessible_2 = new Set(["ENOENT", "ELOOP", "ENOTDIR", "EISDIR", "EACCES", "EPERM"]);
});
export {
  sanitizeErrnoForTelemetry,
  sanitizeClassName,
  sanitizeTopFrame,
  toError,
  errorMessage,
  isAbortError,
  AbortError,
  sanitizeErrorName,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  withTelemetryMessage,
  getErrnoCode,
  findInCauseChain,
  isENOENT,
  sanitizedErrorNameForTelemetry,
  sanitizedConnectionCodeForTelemetry,
  sanitizedClassNameForTelemetry,
  languageErrorNameOf,
  isExpectedApiError,
  isFsInaccessible,
  isPathAbsent,
  isSyscallError,
  sanitizedErrnoLowerForTelemetry,
  isSadFsErrno,
  isEnvFsErrno,
  isWin32ReadEbadf,
  errnoShapedCode,
  TeleportOperationError,
  WireSafeControlError,
  storageCauseErrnoCode,
  isMaxContentLengthError,
  sanitizedFeatureErrorCodeForTelemetry,
  sanitizedErrorClassNameForTelemetry,
  isEISDIR,
  StreamClosedAbortError,
  isNonRetryableClientError,
  ShellError,
  LANGUAGE_ERROR_NAMES,
  isFsInaccessibleCode,
  getErrnoPath,
  sanitizedMachineReasonForTelemetry,
  sanitizeErrnoTokenForTelemetry,
  classifyAxiosError,
  sanitizedOAuthErrorTypeForTelemetry,
  getTelemetryMessage,
  isSadFsErrnoCode,
  isEnvFsErrnoCode,
  RESOURCE_EXHAUSTION_CODES,
  hasExactErrorMessage,
  errorStackOrMessage,
  getErrnoPath_2,
  sanitizedErrCodeForTelemetry,
  isE2BIG,
  isDiskFullErrno,
  ConfigParseError,
  isSadResourceErrno,
  isHttpServerConnReset,
  ClaudeError,
  MalformedCommandError,
  isENOENT_2,
  withTelemetryFacts,
  BUN_CONNECTION_CLOSED_MESSAGE_PREFIX,
  shortErrorStack,
  CliUserError,
  isFsInaccessible_2,
  sanitizedConnectionCodeLowerForTelemetry,
  DAEMON_UNREACHABLE_TIMEOUT_PHRASE,
  extractErrnoTokens,
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE,
  getTelemetryChildExitStatus,
  PERMISSION_DENIED_CODES,
  getErrorCodeString,
  withTelemetryChildExitStatus,
  sanitizedBgExitCauseForTelemetry,
};
