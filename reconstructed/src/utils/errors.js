/**
 * utils/errors.ts
 *
 * 错误类型与工具：AbortError、TelemetrySafeError、errno 分类、axios 错误分类、错误消息/栈格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/errors.ts
 * pieces: chunk-06y4szbn.js (1), chunk-24t3dkzb.js (1), chunk-2g090z7k.js (68), chunk-e6aww6q8.js (1), chunk-hm0ce8vc.js (1), chunk-sycgf9xs.js (1)
 * attribution: fingerprint 3, placement 69, callgraph-witnessed 1
 */
import { dirname, join, relative } from "path";
import { realpath, lstat } from "fs/promises";
import { APIUserAbortError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { ARTIFACT_DOC_PATH_RE } from "../services/artifacts/artifactToolGates.js";
import { stripStackHeader } from "./errorStackSanitize.js";

//@ chunk-2g090z7k.js:2325-2406 placement
class ClaudeError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
//@ chunk-2g090z7k.js:2406-2430 placement
class MalformedCommandError extends Error {}
//@ chunk-2g090z7k.js:2430-2473 placement
class CliUserError extends Error {
  name = "CliUserError";
}
//@ chunk-2g090z7k.js:2473-2544 placement = AbortError (1)
class AbortError extends Error {
  constructor(message) {
    super(message);
    this.name = "AbortError";
  }
}
//@ chunk-2g090z7k.js:2544-2565 placement
class StreamClosedAbortError extends AbortError {}
//@ chunk-2g090z7k.js:2565-2728 placement = isAbortError (0.47)
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
//@ chunk-2g090z7k.js:2728-2869 placement = ConfigParseError (1)
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
//@ chunk-2g090z7k.js:2869-3251 placement = ShellError (0.698)
class ShellError extends Error {
  stdout;
  stderr;
  code;
  interrupted;
  hadSandboxViolation;
  sandboxViolations;
  sandboxed;
  constructor(n) {
    super("Shell command failed");
    this.name = "ShellError";
    this.stdout = n.stdout;
    this.stderr = n.stderr;
    this.code = n.code;
    this.interrupted = n.interrupted;
    this.hadSandboxViolation = n.hadSandboxViolation ?? false;
    this.sandboxViolations = n.sandboxViolations;
    this.sandboxed = n.sandboxed;
  }
}
//@ chunk-2g090z7k.js:3251-3377 placement = TeleportOperationError (0.815)
class TeleportOperationError extends Error {
  formattedMessage;
  constructor(message, formattedMessage) {
    super(message);
    this.formattedMessage = formattedMessage;
    this.name = "TeleportOperationError";
  }
}
//@ chunk-2g090z7k.js:3377-3532 placement = TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (0.878)
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
//@ chunk-2g090z7k.js:3532-3552 placement
class WireSafeControlError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-2g090z7k.js:3552-3851 placement
var withTelemetryMessage = (error, telemetryMessage) => {
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
var BUILTIN_ERROR_NAMES = [
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
var LANGUAGE_ERROR_NAMES = new Set(BUILTIN_ERROR_NAMES);
//@ chunk-2g090z7k.js:3851-4006 placement
function languageErrorNameOf(error) {
  try {
    let e = error instanceof Error ? error.name : undefined;
    let found = BUILTIN_ERROR_NAMES.find((r) => r === e);
    if (found !== undefined) return found;
  } catch {}
  return "a value that is not a built-in error";
}
//@ chunk-2g090z7k.js:4006-4446 placement
/**
 * 把非空的附加字段并入一个可扩展对象（只补缺失键，失败时原样返回），用于给错误对象附加退出状态等元信息。
 */
var withTelemetryFacts = (n, e) => {
  try {
    if (n !== null && typeof n === "object" && Object.isExtensible(n)) {
      let t = n;
      let filtered = Object.entries(e).filter(([key, value]) => value !== undefined && !(key in t));
      Object.assign(t, Object.fromEntries(filtered));
    }
  } catch {}
  return n;
};
var CHILD_EXIT_STATUS_SYMBOL = Symbol("telemetryChildExitStatus");
var withTelemetryChildExitStatus = (n, e) => {
  try {
    if (
      e !== undefined &&
      n !== null &&
      typeof n === "object" &&
      !Object.hasOwn(n, CHILD_EXIT_STATUS_SYMBOL) &&
      Object.isExtensible(n)
    )
      Object.defineProperty(n, CHILD_EXIT_STATUS_SYMBOL, {
        value: e,
        enumerable: false,
        writable: false,
        configurable: false,
      });
  } catch {}
  return n;
};
//@ chunk-2g090z7k.js:4446-4600 placement
/**
 * 读取错误对象上附加的 telemetryMessage（可安全上报的描述）。
 */
function getTelemetryMessage(n) {
  try {
    if (
      n !== null &&
      typeof n === "object" &&
      "telemetryMessage" in n &&
      typeof n.telemetryMessage === "string"
    )
      return n.telemetryMessage;
  } catch {}
  return;
}
//@ chunk-2g090z7k.js:4600-4658 placement
function hasExactErrorMessage(error, message) {
  return error instanceof Error && error.message === message;
}
//@ chunk-2g090z7k.js:4658-4717 placement
/**
 * 非 Error 值包装成 Error。
 */
function toError(e) {
  return e instanceof Error ? e : Error(String(e));
}
//@ chunk-2g090z7k.js:4717-4777 placement = errorMessage (0)
/**
 * 把任意值转成错误消息字符串。
 */
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
//@ chunk-2g090z7k.js:4777-4876 placement = isConnectionError (1)
/**
 * 取错误对象的字符串 code（如 ENOENT），没有返回 undefined。全项目大量使用。
 */
function getErrnoCode(err) {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") return err.code;
  return;
}
//@ chunk-2g090z7k.js:4876-4907 placement
function sanitizeErrnoForTelemetry(error) {
  return sanitizeErrnoTokenForTelemetry(getErrnoCode(error));
}
//@ chunk-2g090z7k.js:4907-4978 placement
function sanitizeErrnoTokenForTelemetry(n) {
  return n && /^[A-Z][A-Z0-9_]{0,63}$/.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : undefined;
}
//@ chunk-2g090z7k.js:4978-5009 placement
var MIN_INT32 = -2147483648;
var MAX_UINT32 = 4294967295;
//@ chunk-2g090z7k.js:5009-5249 placement
function getTelemetryChildExitStatus(n) {
  try {
    if (n === null || typeof n !== "object") return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, CHILD_EXIT_STATUS_SYMBOL);
    let t =
      ownPropertyDescriptor !== undefined && Object.hasOwn(ownPropertyDescriptor, "value")
        ? ownPropertyDescriptor.value
        : undefined;
    return typeof t === "number" && Number.isInteger(t) && t >= MIN_INT32 && t <= MAX_UINT32 ? t : undefined;
  } catch {
    return;
  }
}
//@ chunk-2g090z7k.js:5249-5383 placement
var DAEMON_UNREACHABLE_TIMEOUT_PHRASE = "did not become reachable within";
var DAEMON_EXITED_BEFORE_REACHABLE_PHRASE = "exited before it became reachable";
var BUN_CONNECTION_CLOSED_MESSAGE_PREFIX = "The socket connection was closed unexpectedly";
//@ chunk-2g090z7k.js:5383-5508 placement
function extractErrnoTokens(n) {
  return [...n.matchAll(/\bE\d?[A-Z]{2,14}\b/g)]
    .filter((e) => !"/\\".includes(n[e.index - 1] ?? "."))
    .map((e) => e[0]);
}
//@ chunk-2g090z7k.js:5508-5610 placement
function sanitizeErrorName(error) {
  let e = error?.name;
  return typeof e === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : undefined;
}
//@ chunk-2g090z7k.js:5610-5645 placement
function sanitizedErrCodeForTelemetry(error) {
  return sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error);
}
//@ chunk-2g090z7k.js:5645-5701 placement
function sanitizedErrnoLowerForTelemetry(error) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(sanitizeErrnoForTelemetry(error)?.toLowerCase() ?? "other");
}
//@ chunk-2g090z7k.js:5701-5729 placement
function sanitizedErrorNameForTelemetry(error) {
  return sanitizeErrorName(error);
}
//@ chunk-2g090z7k.js:5729-5813 placement
function sanitizedConnectionCodeForTelemetry(code) {
  return code !== undefined && /^[A-Z][A-Za-z0-9_]{0,63}$/.test(code)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(code)
    : undefined;
}
//@ chunk-2g090z7k.js:5813-5887 placement
function sanitizedConnectionCodeLowerForTelemetry(errnoCode) {
  let e = sanitizedConnectionCodeForTelemetry(errnoCode);
  return e === undefined ? undefined : fromSanitizer_SANITIZER_OUTPUT_ONLY(e.toLowerCase());
}
//@ chunk-2g090z7k.js:5887-5975 placement
function sanitizeClassName(n) {
  return typeof n === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : undefined;
}
//@ chunk-2g090z7k.js:5975-6072 placement
function sanitizedOAuthErrorTypeForTelemetry(n) {
  return typeof n === "string" && /^[a-z][a-z_]{0,39}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : lit("unparseable");
}
//@ chunk-2g090z7k.js:6072-6149 placement
function sanitizedMachineReasonForTelemetry(n) {
  return /^[a-z][a-z0-9_]{0,39}$/.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : lit("unparseable");
}
//@ chunk-2g090z7k.js:6149-6265 placement
function sanitizedFeatureErrorCodeForTelemetry(n) {
  if (typeof n !== "string") return;
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : lit("nonconforming");
}
//@ chunk-2g090z7k.js:6265-6531 placement
function sanitizedBgExitCauseForTelemetry(n) {
  if (n === undefined) return;
  let index = n.indexOf(":");
  let t = index === -1 ? n : n.slice(0, index);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(t)) return lit("unparseable");
  if (index === -1) return fromSanitizer_SANITIZER_OUTPUT_ONLY(t);
  let sliced = n.slice(index + 1);
  let o =
    sanitizeErrnoTokenForTelemetry(sliced) ??
    sanitizeClassName(sliced) ??
    (sliced === "string" || sliced === "non-error" ? sliced : "Error");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${t}:${o}`);
}
//@ chunk-2g090z7k.js:6531-6560 placement
function sanitizedClassNameForTelemetry(name) {
  return sanitizeClassName(name);
}
//@ chunk-2g090z7k.js:6560-6693 placement
function sanitizedErrorClassNameForTelemetry(error) {
  let e = error?.constructor?.name;
  return typeof e === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("unparseable");
}
//@ chunk-2g090z7k.js:6693-6739 placement
function sanitizeTopFrame(n) {
  return STACK_FRAME_FILE_RE.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : undefined;
}
//@ chunk-2g090z7k.js:6739-7221 placement
/**
 * 匹配堆栈帧文件名的正则（用户代码、常见脚本扩展名、node 内部模块等），以及表示资源耗尽的 errno 集合。
 */
var STACK_FRAME_FILE_RE =
  /^(?:<user-code>|(?:[\w$.\-<>[\]]{1,72}\.(?:[cm]?[jt]sx?|json|node|wasm|exe)|node:internal(?:\/[a-z0-9_-]{1,40}){1,4}|node:[a-z0-9_]{1,30}(?:\/(?:promises|web|consumers|posix|win32|types|strict|reporters))?|bun:[a-z0-9_]{1,20}|internal:[a-z0-9_-]{1,30}(?:\/[a-z0-9_-]{1,40}){0,3}|<anonymous>|\[eval\](?:-wrapper)?|native|unknown|cli|claude|ws|undici|node-fetch|isomorphic-fetch|vercel_fetch|utf-8-validate)(?::\d{1,8}){2})$/;
var RESOURCE_EXHAUSTION_CODES = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EMFILE"]);
//@ chunk-2g090z7k.js:7221-7282 placement
function isDiskFullErrno(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOSPC" || errnoCode === "EDQUOT";
}
//@ chunk-2g090z7k.js:7282-7326 placement
var PERMISSION_DENIED_CODES = new Set(["EACCES", "EPERM", "EROFS"]);
//@ chunk-2g090z7k.js:7326-7418 placement
function isSyscallError(error) {
  return error !== null && typeof error === "object" && "errno" in error && typeof error.errno === "number";
}
//@ chunk-2g090z7k.js:7418-7534 placement
function findInCauseChain(n, e, t = 5) {
  let r = n;
  for (let i = 0; i < t; i++) {
    if (!(r instanceof Error)) return;
    if (e(r)) return r;
    r = r.cause;
  }
  return;
}
//@ chunk-2g090z7k.js:7534-7571 placement = getErrnoCode (0)
/**
 * 取错误的 errno code（如 ENOENT）。
 */
function isENOENT(e) {
  return getErrnoCode(e) === "ENOENT";
}
//@ chunk-2g090z7k.js:7571-7632 placement = isRealPathWithinTeamDir (1)
function isPathAbsent(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-2g090z7k.js:7632-7670 placement
function isEISDIR(error) {
  return getErrnoCode(error) === "EISDIR";
}
//@ chunk-2g090z7k.js:7670-7708 placement
function isE2BIG(error) {
  return getErrnoCode(error) === "E2BIG";
}
//@ chunk-2g090z7k.js:7708-7956 placement
function isHttpServerConnReset(n) {
  try {
    if (getErrnoCode(n) !== "ECONNRESET") return false;
    let stack = n instanceof Error ? n.stack : undefined;
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
//@ chunk-2g090z7k.js:7956-8057 placement = getErrnoPath (1)
function getErrnoPath(e) {
  if (e && typeof e === "object" && "path" in e && typeof e.path === "string") return e.path;
  return;
}
//@ chunk-2g090z7k.js:8057-8284 placement
/**
 * 格式化 `name: message` 加调用栈。
 */
function errorStackOrMessage(n) {
  let e = n.message ? `${n.name}: ${n.message}` : n.name;
  let stack = n.stack;
  if (!stack) return e;
  if (stack.startsWith(e)) return stack;
  let lines = stack.split(`
`);
  let o = lines[0] ?? "";
  let i = o === n.name || o.startsWith(`${n.name}:`) ? lines.slice(1) : lines;
  return [e, ...i].join(`
`);
}
//@ chunk-2g090z7k.js:8284-8368 placement
var FS_ACCESS_ERRNOS = new Set(["ENOENT", "EACCES", "EPERM", "ENOTDIR", "ELOOP", "ENAMETOOLONG", "EROFS"]);
//@ chunk-2g090z7k.js:8368-8399 placement
function isFsInaccessible(error) {
  return isFsInaccessibleCode(getErrnoCode(error));
}
//@ chunk-2g090z7k.js:8399-8442 placement
/**
 * errno 是否属于文件访问类错误（ENOENT/EACCES/EPERM/ENOTDIR/ELOOP/ENAMETOOLONG/EROFS）。
 */
function isFsInaccessibleCode(n) {
  return n !== undefined && FS_ACCESS_ERRNOS.has(n);
}
//@ chunk-2g090z7k.js:8442-8625 placement
/**
 * 读取 error.cause.telemetryCode（存储层错误的遥测码）。
 */
function storageCauseErrnoCode(n) {
  let cause = n instanceof Error ? n.cause : undefined;
  if (typeof cause !== "object" || cause === null || !("telemetryCode" in cause)) return;
  return typeof cause.telemetryCode === "string" ? cause.telemetryCode : undefined;
}
//@ chunk-2g090z7k.js:8625-8675 placement
var FS_RESOURCE_ERRNOS = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EIO"]);
//@ chunk-2g090z7k.js:8675-8707 placement
function isEnvFsErrno(error) {
  return isEnvFsErrnoCode(getErrnoCode(error));
}
//@ chunk-2g090z7k.js:8707-8880 placement
function isEnvFsErrnoCode(n) {
  return (
    n === "EDEADLK" ||
    n === "EINTR" ||
    n === "ENXIO" ||
    n === "ENODEV" ||
    n === "ECANCELED" ||
    n === "ENEEDAUTH" ||
    n === "ESTALE" ||
    n === "EUNKNOWN" ||
    n === "ENOMEM" ||
    (n !== undefined && isUnknownSystemError(n))
  );
}
//@ chunk-2g090z7k.js:8880-8953 placement
function isUnknownSystemError(n) {
  return n === "UNKNOWN" || n.startsWith("Unknown system error");
}
//@ chunk-2g090z7k.js:8953-9074 placement
function isWin32ReadEbadf(n, e = "linux") {
  if (e !== "win32") return false;
  try {
    return isSyscallError(n) && n.code === "EBADF" && n.syscall === "read";
  } catch {
    return false;
  }
}
//@ chunk-2g090z7k.js:9074-9163 placement
function errnoShapedCode(telemetryCode) {
  if (typeof telemetryCode !== "string") return;
  return /^E[A-Z0-9]+$/.test(telemetryCode) || isUnknownSystemError(telemetryCode)
    ? telemetryCode
    : undefined;
}
//@ chunk-2g090z7k.js:9163-9218 placement
function isSadResourceErrno(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && FS_RESOURCE_ERRNOS.has(errnoCode);
}
//@ chunk-2g090z7k.js:9218-9250 placement
function isSadFsErrno(error) {
  return isSadFsErrnoCode(getErrnoCode(error));
}
//@ chunk-2g090z7k.js:9250-9320 placement
function isSadFsErrnoCode(n) {
  return n !== undefined && (FS_ACCESS_ERRNOS.has(n) || n === "EISDIR" || FS_RESOURCE_ERRNOS.has(n));
}
//@ chunk-2g090z7k.js:9320-9502 placement
/**
 * axios 错误是否为认证/限流类（无状态码、401、403、429），可由调用方追加判断。
 */
function isExpectedApiError(error, e) {
  if (e?.(error)) return true;
  if (!error || typeof error !== "object" || !("isAxiosError" in error) || !error.isAxiosError) return false;
  let status = error.response?.status;
  return status === undefined || status === 401 || status === 403 || status === 429;
}
//@ chunk-2g090z7k.js:9502-9599 placement
function isMaxContentLengthError(error) {
  return error instanceof Error && /maxContentLength size of .* exceeded/.test(error.message);
}
//@ chunk-2g090z7k.js:9599-10010 placement = classifyAxiosError (1)
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
//@ chunk-2g090z7k.js:10010-10086 placement
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
//@ chunk-06y4szbn.js:173375-173506 fingerprint = getErrnoPath (1)
function getErrnoPath_2(e) {
  if (e === null || typeof e !== "object" || !("path" in e)) return;
  let path = e.path;
  return typeof path === "string" && ARTIFACT_DOC_PATH_RE.test(path) ? path : undefined;
}
//@ chunk-24t3dkzb.js:4838-4916 placement = isConnectionError (1)
function getErrorCodeString(err) {
  return err && typeof err === "object" && "code" in err ? String(err.code) : undefined;
}
//@ chunk-e6aww6q8.js:1386147-1386405 callgraph-witnessed = isENOENT (0)
async function isENOENT_2(e) {
  let n = dirname(e);
  try {
    return await realpath(n);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let r = n;
  for (;;) {
    let s = dirname(r);
    if (s === r) return;
    r = s;
    try {
      await lstat(r);
    } catch (error) {
      if (!isENOENT(error)) throw error;
      continue;
    }
    return realpath(r)
      .then((h) => join(h, relative(r, n)))
      .catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      });
  }
}
//@ chunk-hm0ce8vc.js:32169-32240 fingerprint = isFsInaccessible (0.878)
var isFsInaccessible_2 = new Set(["ENOENT", "ELOOP", "ENOTDIR", "EISDIR", "EACCES", "EPERM"]);
//@ chunk-sycgf9xs.js:3842-4108 fingerprint = shortErrorStack (0.88)
function shortErrorStack(e, maxFrames) {
  try {
    let stack = typeof e.stack === "string" ? e.stack : "";
    let o = stripStackHeader(e);
    let u =
      o.length < stack.length && stack.endsWith(o)
        ? o.replace(/\n$/, "").split(`
`)
        : [];
    let c = u.every((d) => d.trimStart().startsWith("at ")) ? u : [];
    e.stack = [`${e.name}: ${maxFrames}`, ...c].join(`
`);
    e.message = maxFrames;
  } catch {}
  return e;
}
export {
  errorMessage,
  withTelemetryMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
  isENOENT,
  getErrnoPath_2,
  isAbortError,
  languageErrorNameOf,
  AbortError,
  getErrnoCode,
  TeleportOperationError,
  sanitizeErrorName,
  sanitizedMachineReasonForTelemetry,
  errnoShapedCode,
  storageCauseErrnoCode,
  isSadFsErrnoCode,
  isEnvFsErrnoCode,
  classifyAxiosError,
  isSyscallError,
  isFsInaccessibleCode,
  StreamClosedAbortError,
  ConfigParseError,
  isPathAbsent,
  sanitizedErrnoLowerForTelemetry,
  isSadFsErrno,
  isEnvFsErrno,
  isWin32ReadEbadf,
  sanitizedOAuthErrorTypeForTelemetry,
  CliUserError,
  sanitizeErrnoTokenForTelemetry,
  sanitizeErrnoForTelemetry,
  isExpectedApiError,
  sanitizedConnectionCodeForTelemetry,
  WireSafeControlError,
  isEISDIR,
  isDiskFullErrno,
  sanitizedErrorNameForTelemetry,
  hasExactErrorMessage,
  sanitizedFeatureErrorCodeForTelemetry,
  sanitizedErrorClassNameForTelemetry,
  sanitizedConnectionCodeLowerForTelemetry,
  isNonRetryableClientError,
  sanitizedErrCodeForTelemetry,
  RESOURCE_EXHAUSTION_CODES,
  sanitizedClassNameForTelemetry,
  isENOENT_2,
  withTelemetryFacts,
  getErrorCodeString,
  MalformedCommandError,
  errorStackOrMessage,
  getErrnoPath,
  isMaxContentLengthError,
  ShellError,
  getTelemetryMessage,
  ClaudeError,
  findInCauseChain,
  BUN_CONNECTION_CLOSED_MESSAGE_PREFIX,
  sanitizedBgExitCauseForTelemetry,
  withTelemetryChildExitStatus,
  DAEMON_UNREACHABLE_TIMEOUT_PHRASE,
  extractErrnoTokens,
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE,
  sanitizeClassName,
  getTelemetryChildExitStatus,
  PERMISSION_DENIED_CODES,
  isSadResourceErrno,
  isHttpServerConnReset,
  isE2BIG,
  isFsInaccessible_2,
  shortErrorStack,
  LANGUAGE_ERROR_NAMES,
  sanitizeTopFrame,
};
