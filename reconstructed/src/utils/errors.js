/**
 * utils/errors.ts
 *
 * 错误类型与工具：AbortError、TelemetrySafeError、errno 分类、axios 错误分类、错误消息/栈格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/errors.ts
 * pieces: chunk-06y4szbn.js (1), chunk-2g090z7k.js (68), chunk-e6aww6q8.js (1), chunk-hm0ce8vc.js (1), chunk-sycgf9xs.js (1)
 * attribution: fingerprint 3, placement 68, callgraph-witnessed 1
 */
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { Lf } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { ln } from "../services/artifacts/artifactToolGates.js";
import { stripStackHeader } from "./errorStackSanitize.js";

//@ chunk-2g090z7k.js:2325-2406 placement
class ClaudeError extends Error {
  constructor(n) {
    super(n);
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
  constructor(n) {
    super(n);
    this.name = "AbortError";
  }
}
//@ chunk-2g090z7k.js:2544-2565 placement
class StreamClosedAbortError extends AbortError {}
/**
 * 判断是否为中断错误（AbortError、内部取消、name=AbortError 或 axios __CANCEL__）。
 */
//@ chunk-2g090z7k.js:2565-2728 placement = isAbortError (0.47)
function isAbortError(e) {
  try {
    return (
      e instanceof AbortError ||
      e instanceof Lf ||
      (e instanceof Error && (e.name === "AbortError" || ("__CANCEL__" in e && Boolean(e.__CANCEL__))))
    );
  } catch {
    return !1;
  }
}
//@ chunk-2g090z7k.js:2728-2869 placement = ConfigParseError (1)
class ConfigParseError extends Error {
  filePath;
  defaultConfig;
  constructor(n, e, t) {
    super(n);
    ((this.name = "ConfigParseError"), (this.filePath = e), (this.defaultConfig = t));
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
    ((this.name = "ShellError"),
      (this.stdout = n.stdout),
      (this.stderr = n.stderr),
      (this.code = n.code),
      (this.interrupted = n.interrupted),
      (this.hadSandboxViolation = n.hadSandboxViolation ?? !1),
      (this.sandboxViolations = n.sandboxViolations),
      (this.sandboxed = n.sandboxed));
  }
}
//@ chunk-2g090z7k.js:3251-3377 placement = TeleportOperationError (0.815)
class TeleportOperationError extends Error {
  formattedMessage;
  constructor(n, e) {
    super(n);
    this.formattedMessage = e;
    this.name = "TeleportOperationError";
  }
}
/**
 * 可上报遥测的错误类型：构造时显式给出不含代码和路径的遥测消息。
 */
//@ chunk-2g090z7k.js:3377-3532 placement = TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (0.878)
class TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends Error {
  telemetryMessage;
  errorClass;
  constructor(n, e, t) {
    super(n);
    ((this.name = "TelemetrySafeError"), (this.telemetryMessage = e ?? n), (this.errorClass = t));
  }
}
//@ chunk-2g090z7k.js:3532-3552 placement
class WireSafeControlError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-2g090z7k.js:3552-3851 placement
var withTelemetryMessage = (n, e) => {
    try {
      if (n !== null && typeof n === "object" && !("telemetryMessage" in n) && Object.isExtensible(n))
        Object.assign(n, { telemetryMessage: e });
    } catch {}
    return n;
  },
  a = [
    "AggregateError",
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SuppressedError",
    "SyntaxError",
    "TypeError",
    "URIError",
  ],
  LANGUAGE_ERROR_NAMES = new Set(a);
//@ chunk-2g090z7k.js:3851-4006 placement
function languageErrorNameOf(n) {
  try {
    let e = n instanceof Error ? n.name : void 0,
      found = a.find((r) => r === e);
    if (found !== void 0) return found;
  } catch {}
  return "a value that is not a built-in error";
}
//@ chunk-2g090z7k.js:4006-4446 placement
var withTelemetryFacts = (n, e) => {
    try {
      if (n !== null && typeof n === "object" && Object.isExtensible(n)) {
        let t = n,
          filtered = Object.entries(e).filter(([o, i]) => i !== void 0 && !(o in t));
        Object.assign(t, Object.fromEntries(filtered));
      }
    } catch {}
    return n;
  },
  s = Symbol("telemetryChildExitStatus"),
  withTelemetryChildExitStatus = (n, e) => {
    try {
      if (
        e !== void 0 &&
        n !== null &&
        typeof n === "object" &&
        !Object.hasOwn(n, s) &&
        Object.isExtensible(n)
      )
        Object.defineProperty(n, s, { value: e, enumerable: !1, writable: !1, configurable: !1 });
    } catch {}
    return n;
  };
/**
 * 读取错误对象上附加的 telemetryMessage（可安全上报的描述）。
 */
//@ chunk-2g090z7k.js:4446-4600 placement
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
/**
 * 非 Error 值包装成 Error。
 */
//@ chunk-2g090z7k.js:4658-4717 placement
function toError(n) {
  return n instanceof Error ? n : Error(String(n));
}
/**
 * 把任意值转成错误消息字符串。
 */
//@ chunk-2g090z7k.js:4717-4777 placement = errorMessage (0)
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
/**
 * 取错误对象的字符串 code（如 ENOENT），没有返回 undefined。全项目大量使用。
 */
//@ chunk-2g090z7k.js:4777-4876 placement = isConnectionError (1)
function getErrnoCode(err) {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") return err.code;
  return;
}
//@ chunk-2g090z7k.js:4876-4907 placement
function sanitizeErrnoForTelemetry(n) {
  return sanitizeErrnoTokenForTelemetry(getErrnoCode(n));
}
//@ chunk-2g090z7k.js:4907-4978 placement
function sanitizeErrnoTokenForTelemetry(n) {
  return n && /^[A-Z][A-Z0-9_]{0,63}$/.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : void 0;
}
//@ chunk-2g090z7k.js:4978-5009 placement
var l = -2147483648,
  E = 4294967295;
//@ chunk-2g090z7k.js:5009-5249 placement
function getTelemetryChildExitStatus(n) {
  try {
    if (n === null || typeof n !== "object") return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, s),
      t =
        ownPropertyDescriptor !== void 0 && Object.hasOwn(ownPropertyDescriptor, "value")
          ? ownPropertyDescriptor.value
          : void 0;
    return typeof t === "number" && Number.isInteger(t) && t >= l && t <= E ? t : void 0;
  } catch {
    return;
  }
}
//@ chunk-2g090z7k.js:5249-5383 placement
var DAEMON_UNREACHABLE_TIMEOUT_PHRASE = "did not become reachable within",
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE = "exited before it became reachable",
  BUN_CONNECTION_CLOSED_MESSAGE_PREFIX = "The socket connection was closed unexpectedly";
//@ chunk-2g090z7k.js:5383-5508 placement
function extractErrnoTokens(n) {
  return [...n.matchAll(/\bE\d?[A-Z]{2,14}\b/g)]
    .filter((e) => !"/\\".includes(n[e.index - 1] ?? "."))
    .map((e) => e[0]);
}
//@ chunk-2g090z7k.js:5508-5610 placement
function sanitizeErrorName(n) {
  let e = n?.name;
  return typeof e === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : void 0;
}
//@ chunk-2g090z7k.js:5610-5645 placement
function sanitizedErrCodeForTelemetry(n) {
  return sanitizeErrnoForTelemetry(n) ?? sanitizeErrorName(n);
}
//@ chunk-2g090z7k.js:5645-5701 placement
function sanitizedErrnoLowerForTelemetry(n) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(sanitizeErrnoForTelemetry(n)?.toLowerCase() ?? "other");
}
//@ chunk-2g090z7k.js:5701-5729 placement
function sanitizedErrorNameForTelemetry(n) {
  return sanitizeErrorName(n);
}
//@ chunk-2g090z7k.js:5729-5813 placement
function sanitizedConnectionCodeForTelemetry(n) {
  return n !== void 0 && /^[A-Z][A-Za-z0-9_]{0,63}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : void 0;
}
//@ chunk-2g090z7k.js:5813-5887 placement
function sanitizedConnectionCodeLowerForTelemetry(n) {
  let e = sanitizedConnectionCodeForTelemetry(n);
  return e === void 0 ? void 0 : fromSanitizer_SANITIZER_OUTPUT_ONLY(e.toLowerCase());
}
//@ chunk-2g090z7k.js:5887-5975 placement
function sanitizeClassName(n) {
  return typeof n === "string" && /^[A-Z][a-zA-Z]{0,63}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : void 0;
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
  if (n === void 0) return;
  let index = n.indexOf(":"),
    t = index === -1 ? n : n.slice(0, index);
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(t)) return lit("unparseable");
  if (index === -1) return fromSanitizer_SANITIZER_OUTPUT_ONLY(t);
  let sliced = n.slice(index + 1),
    o =
      sanitizeErrnoTokenForTelemetry(sliced) ??
      sanitizeClassName(sliced) ??
      (sliced === "string" || sliced === "non-error" ? sliced : "Error");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${t}:${o}`);
}
//@ chunk-2g090z7k.js:6531-6560 placement
function sanitizedClassNameForTelemetry(n) {
  return sanitizeClassName(n);
}
//@ chunk-2g090z7k.js:6560-6693 placement
function sanitizedErrorClassNameForTelemetry(n) {
  let e = n?.constructor?.name;
  return typeof e === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("unparseable");
}
//@ chunk-2g090z7k.js:6693-6739 placement
function sanitizeTopFrame(n) {
  return STACK_FRAME_FILE_RE.test(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : void 0;
}
/**
 * 匹配堆栈帧文件名的正则（用户代码、常见脚本扩展名、node 内部模块等），以及表示资源耗尽的 errno 集合。
 */
//@ chunk-2g090z7k.js:6739-7221 placement
var STACK_FRAME_FILE_RE =
    /^(?:<user-code>|(?:[\w$.\-<>[\]]{1,72}\.(?:[cm]?[jt]sx?|json|node|wasm|exe)|node:internal(?:\/[a-z0-9_-]{1,40}){1,4}|node:[a-z0-9_]{1,30}(?:\/(?:promises|web|consumers|posix|win32|types|strict|reporters))?|bun:[a-z0-9_]{1,20}|internal:[a-z0-9_-]{1,30}(?:\/[a-z0-9_-]{1,40}){0,3}|<anonymous>|\[eval\](?:-wrapper)?|native|unknown|cli|claude|ws|undici|node-fetch|isomorphic-fetch|vercel_fetch|utf-8-validate)(?::\d{1,8}){2})$/,
  RESOURCE_EXHAUSTION_CODES = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EMFILE"]);
//@ chunk-2g090z7k.js:7221-7282 placement
function isDiskFullErrno(n) {
  let e = getErrnoCode(n);
  return e === "ENOSPC" || e === "EDQUOT";
}
//@ chunk-2g090z7k.js:7282-7326 placement
var PERMISSION_DENIED_CODES = new Set(["EACCES", "EPERM", "EROFS"]);
//@ chunk-2g090z7k.js:7326-7418 placement
function isSyscallError(n) {
  return n !== null && typeof n === "object" && "errno" in n && typeof n.errno === "number";
}
//@ chunk-2g090z7k.js:7418-7534 placement
function findInCauseChain(n, e, t = 5) {
  let r = n;
  for (let o = 0; o < t; o++) {
    if (!(r instanceof Error)) return;
    if (e(r)) return r;
    r = r.cause;
  }
  return;
}
/**
 * 取错误的 errno code（如 ENOENT）。
 */
//@ chunk-2g090z7k.js:7534-7571 placement = getErrnoCode (0)
function isENOENT(e) {
  return getErrnoCode(e) === "ENOENT";
}
//@ chunk-2g090z7k.js:7571-7632 placement = isRealPathWithinTeamDir (1)
function isPathAbsent(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-2g090z7k.js:7632-7670 placement
function isEISDIR(n) {
  return getErrnoCode(n) === "EISDIR";
}
//@ chunk-2g090z7k.js:7670-7708 placement
function isE2BIG(n) {
  return getErrnoCode(n) === "E2BIG";
}
//@ chunk-2g090z7k.js:7708-7956 placement
function isHttpServerConnReset(n) {
  try {
    if (getErrnoCode(n) !== "ECONNRESET") return !1;
    let e = n instanceof Error ? n.stack : void 0;
    if (typeof e !== "string") return !1;
    let found = e
      .split(
        `
`,
      )
      .find((r) => r.trim().startsWith("at "));
    return found !== void 0 && found.includes("node:_http_server");
  } catch {
    return !1;
  }
}
//@ chunk-2g090z7k.js:7956-8057 placement = getErrnoPath (1)
function getErrnoPath(e) {
  if (e && typeof e === "object" && "path" in e && typeof e.path === "string") return e.path;
  return;
}
/**
 * 格式化 `name: message` 加调用栈。
 */
//@ chunk-2g090z7k.js:8057-8284 placement
function errorStackOrMessage(n) {
  let e = n.message ? `${n.name}: ${n.message}` : n.name,
    stack = n.stack;
  if (!stack) return e;
  if (stack.startsWith(e)) return stack;
  let parts = stack.split(`
`),
    o = parts[0] ?? "",
    i = o === n.name || o.startsWith(`${n.name}:`) ? parts.slice(1) : parts;
  return [e, ...i].join(`
`);
}
//@ chunk-2g090z7k.js:8284-8368 placement
var FS_ACCESS_ERRNOS = new Set(["ENOENT", "EACCES", "EPERM", "ENOTDIR", "ELOOP", "ENAMETOOLONG", "EROFS"]);
//@ chunk-2g090z7k.js:8368-8399 placement
function isFsInaccessible(n) {
  return isFsInaccessibleCode(getErrnoCode(n));
}
/**
 * errno 是否属于文件访问类错误（ENOENT/EACCES/EPERM/ENOTDIR/ELOOP/ENAMETOOLONG/EROFS）。
 */
//@ chunk-2g090z7k.js:8399-8442 placement
function isFsInaccessibleCode(n) {
  return n !== void 0 && FS_ACCESS_ERRNOS.has(n);
}
/**
 * 读取 error.cause.telemetryCode（存储层错误的遥测码）。
 */
//@ chunk-2g090z7k.js:8442-8625 placement
function storageCauseErrnoCode(n) {
  let e = n instanceof Error ? n.cause : void 0;
  if (typeof e !== "object" || e === null || !("telemetryCode" in e)) return;
  return typeof e.telemetryCode === "string" ? e.telemetryCode : void 0;
}
//@ chunk-2g090z7k.js:8625-8675 placement
var FS_RESOURCE_ERRNOS = new Set(["ENOSPC", "EDQUOT", "ENFILE", "EIO"]);
//@ chunk-2g090z7k.js:8675-8707 placement
function isEnvFsErrno(n) {
  return isEnvFsErrnoCode(getErrnoCode(n));
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
    (n !== void 0 && isUnknownSystemError(n))
  );
}
//@ chunk-2g090z7k.js:8880-8953 placement
function isUnknownSystemError(n) {
  return n === "UNKNOWN" || n.startsWith("Unknown system error");
}
//@ chunk-2g090z7k.js:8953-9074 placement
function isWin32ReadEbadf(n, e = "linux") {
  if (e !== "win32") return !1;
  try {
    return isSyscallError(n) && n.code === "EBADF" && n.syscall === "read";
  } catch {
    return !1;
  }
}
//@ chunk-2g090z7k.js:9074-9163 placement
function errnoShapedCode(n) {
  if (typeof n !== "string") return;
  return /^E[A-Z0-9]+$/.test(n) || isUnknownSystemError(n) ? n : void 0;
}
//@ chunk-2g090z7k.js:9163-9218 placement
function isSadResourceErrno(n) {
  let e = getErrnoCode(n);
  return e !== void 0 && FS_RESOURCE_ERRNOS.has(e);
}
//@ chunk-2g090z7k.js:9218-9250 placement
function isSadFsErrno(n) {
  return isSadFsErrnoCode(getErrnoCode(n));
}
//@ chunk-2g090z7k.js:9250-9320 placement
function isSadFsErrnoCode(n) {
  return n !== void 0 && (FS_ACCESS_ERRNOS.has(n) || n === "EISDIR" || FS_RESOURCE_ERRNOS.has(n));
}
/**
 * axios 错误是否为认证/限流类（无状态码、401、403、429），可由调用方追加判断。
 */
//@ chunk-2g090z7k.js:9320-9502 placement
function isExpectedApiError(n, e) {
  if (e?.(n)) return !0;
  if (!n || typeof n !== "object" || !("isAxiosError" in n) || !n.isAxiosError) return !1;
  let t = n.response?.status;
  return t === void 0 || t === 401 || t === 403 || t === 429;
}
//@ chunk-2g090z7k.js:9502-9599 placement
function isMaxContentLengthError(n) {
  return n instanceof Error && /maxContentLength size of .* exceeded/.test(n.message);
}
/**
 * 把 axios 错误分类为 auth/timeout/network/http/other 并给出状态码。
 */
//@ chunk-2g090z7k.js:9599-10010 placement = classifyAxiosError (1)
function classifyAxiosError(e_2) {
  let message = errorMessage(e_2);
  if (!e_2 || typeof e_2 !== "object" || !("isAxiosError" in e_2) || !e_2.isAxiosError)
    return { kind: "other", message: message };
  let err = e_2,
    status = err.response?.status;
  if (status === 401 || status === 403) return { kind: "auth", status: status, message: message };
  if (err.code === "ECONNABORTED") return { kind: "timeout", status: status, message: message };
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND")
    return { kind: "network", status: status, message: message };
  return { kind: "http", status: status, message: message };
}
//@ chunk-2g090z7k.js:10010-10086 placement
function isNonRetryableClientError(n) {
  return n !== void 0 && n >= 400 && n < 500 && n !== 408 && n !== 409 && n !== 429;
}
//@ chunk-06y4szbn.js:173375-173506 fingerprint = getErrnoPath (1)
function getErrnoPath_2(e) {
  if (e === null || typeof e !== "object" || !("path" in e)) return;
  let path = e.path;
  return typeof path === "string" && ln.test(path) ? path : void 0;
}
//@ chunk-e6aww6q8.js:1386147-1386405 callgraph-witnessed = isENOENT (0)
async function isENOENT_2(e) {
  let n = dirname_34(e);
  try {
    return await realpath_18(n);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let r = n;
  for (;;) {
    let s = dirname_34(r);
    if (s === r) return;
    r = s;
    try {
      await lstat_24(r);
    } catch (error) {
      if (!isENOENT(error)) throw error;
      continue;
    }
    return realpath_18(r)
      .then((h) => join_60(h, relative_20(r, n)))
      .catch((h) => {
        if (isENOENT(h)) return;
        throw h;
      });
  }
}
//@ chunk-hm0ce8vc.js:32169-32240 fingerprint = isFsInaccessible (0.878)
var isFsInaccessible_2 = new Set(["ENOENT", "ELOOP", "ENOTDIR", "EISDIR", "EACCES", "EPERM"]);
//@ chunk-sycgf9xs.js:3842-4108 fingerprint = shortErrorStack (0.88)
function shortErrorStack(e, maxFrames) {
  try {
    let r = typeof e.stack === "string" ? e.stack : "",
      o = stripStackHeader(e),
      u =
        o.length < r.length && r.endsWith(o)
          ? o.replace(/\n$/, "").split(`
`)
          : [],
      c = u.every((d) => d.trimStart().startsWith("at ")) ? u : [];
    ((e.stack = [`${e.name}: ${maxFrames}`, ...c].join(`
`)),
      (e.message = maxFrames));
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
