/**
 * utils/ripgrep.ts
 *
 * ripgrep 调用层：内嵌/系统 rg 选择、超时与重试、输出上限、macOS 受保护目录排除、文件计数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ripgrep.ts
 * pieces: chunk-aqdf5t3e.js (1), chunk-fq0cr76a.js (56)
 * attribution: fingerprint 11, placement 4, layout 42
 */
import { StringDecoder } from "string_decoder";
import { stat, open, readlink, access } from "fs/promises";
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import * as pathModule_4 from "path";
import * as pathModule_5 from "path";
import { sep, sep as sep_2 } from "path";
import {
  constants,
  constants as constants_2,
  realpathSync,
  realpathSync as realpathSync_2,
  statSync,
  statSync as statSync_2,
} from "fs";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
} from "os";
import {
  spawn,
  spawn as spawn_2,
  spawn as spawn_3,
  spawn as spawn_4,
  spawn as spawn_5,
  execFile,
} from "child_process";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { isEnvDefinedFalsy } from "./envUtils.js";
import { env } from "./env.js";
import { findExecutable, o4 } from "./findExecutable.js";
import { isStandaloneExecutable } from "./slowOperations.js";
import { w0 } from "./which.js";
import { ideDiffSupport } from "../components/permissions/FileWritePermissionRequest/FileWritePermissionRequest.js";
import {
  withTelemetryMessage,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isSadFsErrno,
  isEnvFsErrno,
  toError,
  withTelemetryChildExitStatus,
} from "./errors.js";
import { getPlatform } from "./platform.js";
import { truncateToLength, countCharInString } from "./stringUtils.js";
import { getCwd, gl } from "./cwd.js";
import { SymlinkReadRefusedError } from "./fsSafety/atomicWriteStaging.js";
import { walkPermissionCheckPaths, safeResolvePath, getFsImplementation } from "./fsOperations.js";
import {
  pathInWorkingPath,
  normalizePatternsToPath,
  isSearchResultRootRespellEnabled,
} from "./permissions/filesystem.js";
import { Qn } from "./pathClassification.js";
import { isWslUncPath, Ya } from "./networkPaths.js";
import { INHERITED_FD_PATH, execFileNoThrow } from "./execFileNoThrow.js";
import { uniq } from "./collections.js";
import { NoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { CR, Tv } from "./disklessSession.js";
import { Nd } from "./toolCgroup.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { ve } from "../services/artifacts/artifactPresence.js";

//@ chunk-fq0cr76a.js:877863-878480 placement
class RipgrepStatus {
  config = void 0;
  roundedFileCounts = new Map();
  #e = null;
  firstUseProbe = void 0;
  get status() {
    return this.#e;
  }
  getConfig() {
    return ((this.config ??= getRipgrepConfig()), this.config);
  }
  clearConfig() {
    this.config = void 0;
  }
  countFilesRounded(e, n, r) {
    let s = `${e}|${r.join(",")}`,
      h = this.roundedFileCounts.get(s);
    if (h === void 0) ((h = countFilesRoundedRg(e, n, r)), this.roundedFileCounts.set(s, h));
    return h;
  }
  setStatus(e) {
    this.#e = e;
  }
  testOnFirstUse() {
    return ((this.firstUseProbe ??= testRipgrepOnFirstUse()), this.firstUseProbe);
  }
  invalidate() {
    if ((this.clearConfig(), this.#e?.working !== !1)) ((this.firstUseProbe = void 0), (this.#e = null));
  }
  reset() {
    ((this.config = void 0), this.roundedFileCounts.clear(), (this.firstUseProbe = void 0));
  }
}
//@ chunk-fq0cr76a.js:878480-878506 placement
var Nle = new HostScoped(() => new RipgrepStatus());
//@ chunk-fq0cr76a.js:878506-878544 placement
function Kl() {
  return Nle.of(getRootSession().host);
}
/**
 * 决定 ripgrep 来源：USE_BUILTIN_RIPGREP 设为假值时优先系统 rg；Bun 单文件可执行时用自身（argv0=rg，内嵌）；否则系统 rg。
 */
//@ chunk-fq0cr76a.js:878582-878972 fingerprint = getRipgrepConfig (0.659)
function getRipgrepConfig() {
  if (isEnvDefinedFalsy(env.USE_BUILTIN_RIPGREP)) {
    let { cmd: cmd } = findExecutable("rg", []);
    if (cmd !== "rg") return { mode: "system", command: cmd, args: [] };
  }
  if (isStandaloneExecutable()) {
    let r = { mode: "embedded", command: process.execPath, args: ["--no-config"], argv0: "rg" };
    if (w0(process.execPath)) return r;
    let { cmd: cmd } = findExecutable("rg", []);
    if (cmd !== "rg") return { mode: "system", command: cmd, args: [] };
    return r;
  }
  let { cmd: systemPath } = findExecutable("rg", []);
  return { mode: "system", command: systemPath, args: [] };
}
//@ chunk-fq0cr76a.js:878972-879215 layout
var RIPGREP_NOT_FOUND_MESSAGE =
    "ripgrep not found on PATH. Install it (brew install ripgrep / apt install ripgrep / winget install BurntSushi.ripgrep.MSVC) or use the native claude binary which embeds it.",
  SPAWN_SYSCALLS = new Set(["spawn", "spawnSync", "posix_spawn", "uv_spawn"]);
/**
 * 净化 spawn 错误：去掉可能含路径的 cmd/spawnargs 等字段，只保留 name/message/code/errno 与白名单 syscall。
 */
//@ chunk-fq0cr76a.js:879215-879735 layout
function sanitizeSpawnError(e) {
  if ("stdinSourceFailed" in e && e.stdinSourceFailed === !0)
    return (Reflect.deleteProperty(e, "cmd"), Reflect.deleteProperty(e, "spawnargs"), e);
  let { name: n, message: message, stack: stack, code: code, errno: errno, path: path, syscall: syscall } = e,
    w = typeof syscall === "string" ? /^[A-Za-z_]+/.exec(syscall)?.[0] : void 0,
    merged = Object.assign(Error(message), {
      name: n,
      stack: stack,
      ...(code !== void 0 && { code: code }),
      ...(typeof errno === "number" && { errno: errno }),
      ...(w !== void 0 && SPAWN_SYSCALLS.has(w) && { syscall: w }),
    });
  return typeof path === "string"
    ? Object.defineProperty(merged, "path", { value: path, enumerable: !1, writable: !0, configurable: !0 })
    : merged;
}
//@ chunk-fq0cr76a.js:879735-879855 layout
function explainRipgrepNotFound(e) {
  if (e.code === "ENOENT" && ideDiffSupport().mode === "system") {
    let n = Error(RIPGREP_NOT_FOUND_MESSAGE, { cause: e });
    return ((n.code = "ENOENT"), n);
  }
  return e;
}
/**
 * 当前 ripgrep 命令（路径、前置参数、argv0）。
 */
//@ chunk-fq0cr76a.js:879855-879933 fingerprint = ripgrepCommand (1)
function ripgrepCommand() {
  let config = ideDiffSupport();
  return { rgPath: config.command, rgArgs: config.args, argv0: config.argv0 };
}
/**
 * ripgrep 输出收集上限 20MB 与流式块上限常量。
 */
//@ chunk-fq0cr76a.js:879933-879960 layout
var MAX_RIPGREP_OUTPUT_BYTES = 20000000,
  e4 = 1048576;
//@ chunk-fq0cr76a.js:879960-880437 layout
class BoundedOutputCollector {
  maxBytes;
  truncated = !1;
  decoder = new StringDecoder("utf8");
  pieces = [];
  byteLength = 0;
  constructor(e) {
    this.maxBytes = e;
  }
  append(e) {
    if (this.truncated) return !1;
    let n = this.maxBytes - this.byteLength,
      r = e.length <= n,
      s = r ? e : e.subarray(0, n);
    this.byteLength += s.length;
    for (let h = 0; h < s.length; h += e4) this.pieces.push(this.decoder.write(s.subarray(h, h + e4)));
    if (!r) this.truncated = !0;
    return !r;
  }
  takeText() {
    let pieces = this.pieces;
    return ((this.pieces = []), pieces.push(this.decoder.end()), pieces.join(""));
  }
  release() {
    this.pieces = [];
  }
}
//@ chunk-fq0cr76a.js:880437-880486 layout
class RipgrepOutputError extends Error {
  name = "RipgrepOutputError";
}
//@ chunk-fq0cr76a.js:880486-880703 layout
function toRipgrepOutputError(e) {
  return withTelemetryMessage(
    new RipgrepOutputError(
      `Failed to collect ripgrep output: ${e.message}. If the search matches a very large amount of text, try a more specific path or pattern.`,
      { cause: e },
    ),
    "ripgrep output collection failed",
  );
}
//@ chunk-fq0cr76a.js:880703-880858 layout
function dropIncompleteLastLine(e, n) {
  let at = e.at(-1);
  if (
    at === void 0 ||
    n.endsWith(`
`)
  )
    return e;
  let index = at.lastIndexOf("\x00");
  return index === -1 ? e.slice(0, -1) : e.with(-1, at.slice(0, index + 1));
}
//@ chunk-fq0cr76a.js:880858-880905 layout
var BENIGN_KILL_SIGNALS = new Set(["SIGHUP", "SIGINT", "SIGPIPE"]);
//@ chunk-fq0cr76a.js:880905-881001 fingerprint = isEagainError (1)
function isEagainError(stderr) {
  return stderr.includes("os error 11") || stderr.includes("Resource temporarily unavailable");
}
/**
 * 资源耗尽类错误码（EAGAIN/ENOMEM/EMFILE/ENFILE），遇到时以 -j 1 单线程重试。
 */
//@ chunk-fq0cr76a.js:881001-881055 layout
var RESOURCE_EXHAUSTION_CODES = new Set(["EAGAIN", "ENOMEM", "EMFILE", "ENFILE"]);
/**
 * ripgrep 超时错误，带部分结果。
 */
//@ chunk-fq0cr76a.js:881055-881175 fingerprint = RipgrepTimeoutError (0.773)
class RipgrepTimeoutError extends Error {
  partialResults;
  constructor(e, n) {
    super(e);
    this.partialResults = n;
    this.name = "RipgrepTimeoutError";
  }
}
/**
 * ripgrep 中断时的错误：非超时中断给 AbortError，超时给 RipgrepTimeoutError（WSL 60 秒，其它 20 秒），并建议缩小路径或模式。
 */
//@ chunk-fq0cr76a.js:881175-881443 layout
function createRipgrepAbortError(e) {
  if (e.aborted && e.reason?.name !== "TimeoutError") return new AbortError();
  return new RipgrepTimeoutError(
    `Ripgrep search timed out after ${getPlatform() === "wsl" ? 60 : 20} seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.`,
    [],
  );
}
//@ chunk-fq0cr76a.js:881443-881948 layout
class RipgrepAbnormalExitError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      'The search failed, so this is not a "no matches" result: matches may exist. What happened to the search program (ripgrep) is not known, and no results were read. Run the search once more. If it fails again, tell the user that searches are failing. Do not run a recursive search in the shell instead (for example grep -r, find or rg): it can reach what this tool is set to leave out.',
      "ripgrep unexpected exit with no results",
    );
    this.name = "RipgrepAbnormalExitError";
  }
}
//@ chunk-fq0cr76a.js:881948-882081 layout
var RIPGREP_USAGE_ERROR_RE =
  /^rg: (?:regex parse error|error parsing glob|unrecognized file type|error parsing flag|compiled regex exceeds size limit)/m;
//@ chunk-fq0cr76a.js:882081-882321 layout
class RipgrepUsageError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      `Search failed \u2014 ripgrep rejected the pattern, glob, or file type without searching:
${truncateToLength(e.trim(), 2000)}`,
      "ripgrep usage error (input rejected, stderr redacted)",
    );
    this.name = "RipgrepUsageError";
  }
}
//@ chunk-fq0cr76a.js:882321-882415 layout
var NO_SHELL_SEARCH_FALLBACK =
  "Do not run a recursive search in the shell instead (for example grep -r, find or rg)";
//@ chunk-fq0cr76a.js:882415-883111 layout
class RipgrepTargetUnreadableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    let n = getPlatform() === "windows",
      r = n ? e === WIN_ERROR_ACCESS_DENIED : e === EACCES_CODE || e === EPERM_CODE,
      s = r
        ? "permission denied"
        : !n && e === EIO_CODE
          ? "input/output error"
          : !n && e === ENOENT_CODE
            ? "the file Claude Code opened was not passed to ripgrep"
            : "an operating system error",
      h = r
        ? `Tell the user that the path could not be read. ${NO_SHELL_SEARCH_FALLBACK}.`
        : `Run the search once more. If it fails again, tell the user that the search is failing. ${NO_SHELL_SEARCH_FALLBACK}: it can also reach other files, which this tool is set to leave out.`;
    super(
      `Search failed: ripgrep could not read the path it was given (${s}, os error ${e}), so nothing was searched. This is not a "no matches" result. ${h}`,
      "ripgrep could not read its target",
    );
    this.name = "RipgrepTargetUnreadableError";
  }
}
//@ chunk-fq0cr76a.js:883111-883164 layout
var EPERM_CODE = 1,
  ENOENT_CODE = 2,
  EIO_CODE = 5,
  EACCES_CODE = 13,
  ENOTDIR_CODE = 20,
  WIN_ERROR_FILE_NOT_FOUND = 2,
  WIN_ERROR_PATH_NOT_FOUND = 3,
  WIN_ERROR_ACCESS_DENIED = 5;
//@ chunk-fq0cr76a.js:883164-883720 layout
class RipgrepOutputTooLargeError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      e === "stdout"
        ? `Ripgrep output passed the ${MAX_RIPGREP_OUTPUT_BYTES / 1e6}MB limit before a single complete line was read, so there are no usable results: at least one matching line is extremely long. Try a more specific pattern or path, or exclude very large files.`
        : `Ripgrep produced more than ${MAX_RIPGREP_OUTPUT_BYTES / 1e6}MB of error output (for example per-file permission warnings) before any result line, so the search is incomplete. Try a more specific path.`,
      "ripgrep output over cap before first complete line",
    );
    this.name = "RipgrepOutputTooLargeError";
  }
}
/**
 * ripgrep 启动失败的 errno → {reason, advice} 文案表（EAGAIN、ENOMEM、EMFILE、ENFILE…）。
 */
//@ chunk-fq0cr76a.js:883720-884378 layout
var SPAWN_FAILURE_REASONS = new Map([
    [
      "EAGAIN",
      {
        reason: "a limit on processes or threads was reached",
        advice: "this machine has reached a limit on processes; closing other programs can help",
      },
    ],
    [
      "ENOMEM",
      {
        reason: "there is not enough memory",
        advice: "this machine is short of memory; closing other programs can help",
      },
    ],
    [
      "EMFILE",
      { reason: "this Claude Code process has too many files open", advice: "Claude Code needs a restart" },
    ],
    [
      "ENFILE",
      {
        reason: "the system has too many files open",
        advice: "this machine has too many files open; closing other programs can help",
      },
    ],
  ]),
  DEFAULT_SPAWN_FAILURE_REASON = {
    reason: "the system ran out of a resource",
    advice: "this machine is short of a resource needed to start programs",
  };
//@ chunk-fq0cr76a.js:884378-885017 layout
class RipgrepSpawnResourceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    let { reason: reason, advice: advice } = SPAWN_FAILURE_REASONS.get(e) ?? DEFAULT_SPAWN_FAILURE_REASON;
    super(
      `ripgrep could not start, so nothing was searched and matches may still exist: the operating system could not start it because ${reason} (${e}). Retry in a moment. If it keeps failing, tell the user that ${advice}.`,
      "ripgrep not started: the OS could not create another process",
      `rg_spawn_${e.toLowerCase()}`,
    );
    this.name = "RipgrepSpawnResourceError";
  }
  static from(e, n, r) {
    if (!n) return;
    let s = getErrnoCode(e),
      h =
        e instanceof Error &&
        "syscall" in e &&
        typeof e.syscall === "string" &&
        e.syscall.startsWith("spawn"),
      y = r === "emitted" || isSadFsErrno(e) || isEnvFsErrno(e);
    return s !== void 0 && RESOURCE_EXHAUSTION_CODES.has(s) && h && y
      ? new RipgrepSpawnResourceError(s)
      : void 0;
  }
}
//@ chunk-fq0cr76a.js:885017-885068 layout
class RipgrepNullByteError extends Error {
  name = "RipgrepNullByteError";
}
/**
 * ripgrep 启动前检查 cwd、目标路径与参数里没有 \0，否则抛 RipgrepNullByteError（附遥测说明）。
 */
//@ chunk-fq0cr76a.js:885068-885549 layout
function assertNoNullBytesForRipgrep(e, n, r) {
  let index = e.findIndex((y) => y.includes("\x00")),
    h = r.includes("\x00")
      ? {
          local: "the session working directory",
          telemetry: "ripgrep spawn blocked: null byte in session cwd",
        }
      : n.includes("\x00")
        ? { local: "the target path", telemetry: "ripgrep spawn blocked: null byte in target path" }
        : index !== -1
          ? { local: `caller argument ${index}`, telemetry: "ripgrep spawn blocked: null byte in argv" }
          : null;
  if (h)
    throw withTelemetryMessage(
      new RipgrepNullByteError(`Cannot spawn ripgrep: ${h.local} contains a null byte (\\0)`),
      h.telemetry,
    );
}
//@ chunk-fq0cr76a.js:885549-885666 layout = isRealPathWithinTeamDir (1)
async function pathExistsStat(realCandidate) {
  try {
    return (await stat(realCandidate), !0);
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return !1;
    throw error;
  }
}
/**
 * 规范化 ripgrep 搜索目标：确认软链解析与权限检查时一致、PATH 上按名找到的 rg 不能搜索工作目录外（无法套用 Read 拒绝规则），返回 {lexical, canonical, spawnCwd, relativeOutput, isDirectory, recheckBeforeSpawn…}。
 */
//@ chunk-fq0cr76a.js:885666-888681 layout
async function resolveRipgrepTarget(e, n) {
  assertNoNullBytesForRipgrep([], e, getCwd());
  let r = getPlatform(),
    s = new Set(n),
    h = () =>
      new SymlinkReadRefusedError(
        `Refusing to search ${e}: its symlink resolution changed after permission was checked. If a link in the working directory is being rewritten concurrently, stop that and retry.`,
      ),
    y = () => {
      let O = walkPermissionCheckPaths(e);
      if (O.unresolved || O.spellings.some((spelling) => !s.has(spelling))) throw h();
    };
  y();
  let b = () => {
      let O = safeResolvePath(getFsImplementation(), e);
      if (!O.isCanonical) throw h();
      return O.resolvedPath;
    },
    S = !pathModule_5.isAbsolute(ripgrepCommand().rgPath),
    w = () => {
      throw new SymlinkReadRefusedError(
        `Refusing to search ${e}: ripgrep was found only by name on PATH, and a search outside the working directory cannot apply your Read deny rules in that configuration. Install ripgrep at an absolute path or search under the working directory.`,
      );
    },
    R = async (O = e) => {
      let L = resolveRipgrepSpawnCwd(e, ripgrepCommand().rgPath);
      if (S && !pathInWorkingPath(e, L)) w();
      let V;
      try {
        V = (await stat(e)).isDirectory();
      } catch (error) {
        let q = getErrnoCode(error);
        if (q === "ENOENT" || q === "ENOTDIR") return null;
        throw error;
      }
      return {
        lexical: e,
        canonical: O,
        spawnCwd: L,
        target: e,
        relativeOutput: !1,
        isDirectory: V,
        judgeEveryResult: !0,
        recheckBeforeSpawn: y,
        recheckByPath: y,
        close: async () => {},
      };
    };
  if ((Qn(e) && !isWslUncPath(e)) || Ya(e)) return R();
  if (r === "windows") {
    let O = safeResolvePath(getFsImplementation(), e);
    if (!O.isCanonical) {
      if (O.isSymlink) {
        if (s.has(O.resolvedPath) && Qn(O.resolvedPath) && !isWslUncPath(O.resolvedPath))
          return R(O.resolvedPath);
        throw h();
      }
      if (!(await pathExistsStat(e))) return null;
      throw h();
    }
    let resolvedPath = O.resolvedPath;
    if (!s.has(resolvedPath)) throw h();
    let V = () => {
        if ((y(), b() !== resolvedPath)) throw h();
      },
      K = resolveRipgrepSpawnCwd(resolvedPath, ripgrepCommand().rgPath),
      q;
    try {
      q = (await stat(resolvedPath)).isDirectory();
    } catch (error) {
      let J = getErrnoCode(error);
      if (J === "ENOENT" || J === "ENOTDIR") return null;
      if (J === "EACCES" || J === "EPERM") throw h();
      throw error;
    }
    if (q && S && !pathInWorkingPath(resolvedPath, K)) w();
    return {
      lexical: e,
      canonical: resolvedPath,
      spawnCwd: K,
      target: resolvedPath,
      relativeOutput: !1,
      isDirectory: q,
      recheckBeforeSpawn: V,
      recheckByPath: V,
      close: async () => {},
    };
  }
  let D;
  try {
    D = await open(e, constants_2.O_RDONLY | constants_2.O_NONBLOCK);
  } catch (error) {
    let L = getErrnoCode(error);
    if (L === "ENOENT" || L === "ENOTDIR") return null;
    if (L === "EACCES" || L === "EPERM" || L === "ELOOP")
      throw new SymlinkReadRefusedError(
        `Refusing to search ${e}: it could not be opened (${L}) \u2014 it is unreadable, or is being replaced concurrently.`,
      );
    throw error;
  }
  try {
    let stats = await D.stat(),
      L = null;
    if (r === "linux" || r === "wsl")
      try {
        L = await readlink(`/proc/self/fd/${D.fd}`);
      } catch {}
    let V = L !== null,
      K = L ?? b();
    if (!s.has(K)) throw h();
    let q = D,
      Z = () => {
        if ((y(), b() !== K)) throw h();
      },
      J = V ? () => {} : Z;
    if (stats.isDirectory())
      try {
        await access(V ? `/proc/self/fd/${q.fd}` : K, constants_2.X_OK);
      } catch {
        throw new SymlinkReadRefusedError(
          `Cannot search ${e}: the directory is not traversable (no execute permission).`,
        );
      }
    if (stats.isDirectory() && pathModule_5.isAbsolute(ripgrepCommand().rgPath))
      return {
        lexical: e,
        canonical: K,
        spawnCwd: V ? `/proc/self/fd/${q.fd}` : K,
        target: ".",
        relativeOutput: !0,
        isDirectory: !0,
        recheckBeforeSpawn: J,
        recheckByPath: Z,
        close: () => q.close(),
      };
    if (stats.isDirectory()) {
      let ie = resolveRipgrepSpawnCwd(K, ripgrepCommand().rgPath);
      if (!pathInWorkingPath(K, ie)) w();
      return {
        lexical: e,
        canonical: K,
        spawnCwd: ie,
        target: K,
        relativeOutput: !1,
        isDirectory: !0,
        recheckBeforeSpawn: Z,
        recheckByPath: Z,
        close: () => q.close(),
      };
    }
    return {
      lexical: e,
      canonical: K,
      spawnCwd: resolveRipgrepSpawnCwd(K, ripgrepCommand().rgPath),
      target: V ? INHERITED_FD_PATH : K,
      inheritFd: V ? q.fd : void 0,
      relativeOutput: !1,
      isDirectory: !1,
      recheckBeforeSpawn: J,
      recheckByPath: Z,
      close: () => q.close(),
    };
  } catch (error) {
    throw (await D.close().catch(() => {}), error);
  }
}
/**
 * 把 ripgrep 输出的路径映射回用户给出的词法路径（处理规范化目录、相对输出）。
 */
//@ chunk-fq0cr76a.js:888681-889078 layout
function mapRipgrepOutputPath(e, n) {
  if (!n.isDirectory && e === n.target) return n.lexical;
  if (pathModule_5.isAbsolute(e)) {
    for (let r of [n.target, n.canonical]) {
      let s = r.endsWith(pathModule_5.sep) ? r : r + pathModule_5.sep;
      if (e.startsWith(s) && r !== n.lexical) return pathModule_5.join(n.lexical, e.slice(s.length));
    }
    return e;
  }
  if (n.relativeOutput) {
    let r = e.startsWith("./") ? e.slice(2) : e;
    return r === "." || r === ""
      ? n.lexical + (e.endsWith("/") ? pathModule_5.sep : "")
      : pathModule_5.join(n.lexical, r);
  }
  return e;
}
/**
 * 搜索准备期间 Read 拒绝规则对应路径发生变化时拒绝搜索（防竞态）。
 */
//@ chunk-fq0cr76a.js:889078-889319 layout
function assertDenyGlobsUnchanged(e, n, r, s) {
  let h = buildDenyRuleGlobs(e, n, s);
  if (h.length !== r.length || h.some((y, b) => y !== r[b]))
    throw new SymlinkReadRefusedError(
      `Refusing to search ${n.lexical}: a path one of its Read deny rules is written through changed while the search was being prepared. Retry.`,
    );
}
//@ chunk-fq0cr76a.js:889319-889439 layout
function getRipgrepRootSpellings(e) {
  return uniq(
    e.relativeOutput || e.spawnCwd === e.canonical
      ? [e.canonical, e.lexical]
      : [e.spawnCwd, safeRealpath(e.spawnCwd)],
  );
}
//@ chunk-fq0cr76a.js:889439-889532 layout
function getRipgrepDisplayRoot(e) {
  return e.relativeOutput || e.spawnCwd === e.canonical ? e.canonical : safeRealpath(e.spawnCwd);
}
//@ chunk-fq0cr76a.js:889532-889581 layout
function safeRealpath(e) {
  try {
    return realpathSync_2(e);
  } catch {
    return e;
  }
}
/**
 * 把 Read 拒绝规则转成 ripgrep 的 !glob 排除参数；规则覆盖整个搜索目标时返回 ["!**"]。
 */
//@ chunk-fq0cr76a.js:889581-890288 layout
function buildDenyRuleGlobs(e, n, r) {
  let s = getRipgrepRootSpellings(n),
    h = new Set(),
    y = [];
  if (n.isDirectory)
    for (let b of new Set([...s, n.canonical, n.lexical]))
      for (let [S, w] of e) {
        let relativePath = pathModule_5.relative(S ?? getCwd(), b);
        if (
          relativePath === "" ||
          relativePath === ".." ||
          relativePath.startsWith(`..${pathModule_5.sep}`) ||
          pathModule_5.isAbsolute(relativePath)
        )
          continue;
        let replaced = relativePath.replaceAll("\\", "/"),
          O = o4.default().add(w);
        if (O.ignores(replaced) || O.ignores(replaced + "/")) return ["!**"];
      }
  for (let b of new Set(s))
    for (let S of normalizePatternsToPath(e, b)) {
      if (S.includes("[")) continue;
      let w = escapeBracesInGlob(S);
      if (w === "/" || w === "") {
        if (!h.has("!**")) (h.add("!**"), y.push("!**"));
        continue;
      }
      let R = w.startsWith("/") ? (r?.depthAgnostic ? `!**${w}` : `!${w}`) : `!**/${w}`;
      if (!h.has(R)) (h.add(R), y.push(R));
      if (R.endsWith("/**") && R.length > 4) {
        let sliced = R.slice(0, -3);
        if (sliced !== "!**" && !h.has(sliced)) (h.add(sliced), y.push(sliced));
      }
    }
  return y;
}
//@ chunk-fq0cr76a.js:890288-890463 layout
function hasUnsafeDenyGlob(e, n) {
  if (n !== void 0) {
    let r = getRipgrepRootSpellings(n);
    for (let s of new Set(r))
      for (let h of normalizePatternsToPath(e, s)) if (isGlobUnsafeForRipgrep(h)) return !0;
  }
  for (let r of e.values()) for (let s of r) if (isGlobUnsafeForRipgrep(s)) return !0;
  return !1;
}
//@ chunk-fq0cr76a.js:890463-890534 layout
function isGlobUnsafeForRipgrep(e) {
  return e.includes("[") || e.includes("\\") || /\s$/.test(e);
}
//@ chunk-fq0cr76a.js:890534-890768 layout
function escapeBracesInGlob(e) {
  let n = "",
    r = !1;
  for (let s = 0; s < e.length; s++) {
    let h = e[s];
    if (h === "\\" && s + 1 < e.length) {
      ((n += h + e[s + 1]), s++);
      continue;
    }
    if (r) {
      if (h === "]") r = !1;
      n += h;
      continue;
    }
    if (h === "[") ((r = !0), (n += h));
    else if (h === "{" || h === "}") n += `[${h}]`;
    else n += h;
  }
  return n;
}
//@ chunk-fq0cr76a.js:890768-891205 layout
function resolveRipgrepSpawnCwd(e, n) {
  let r = gl();
  if (r === null) {
    if (!pathModule_5.isAbsolute(e) || !pathModule_5.isAbsolute(n)) throw new NoProjectDirectoryError();
    return pathModule_5.parse(pathModule_5.resolve(e)).root;
  }
  if (!pathModule_5.isAbsolute(e) || !pathModule_5.isAbsolute(n)) return r;
  try {
    if (pathInWorkingPath(e, r)) {
      let sliced = e.slice(0, r.length);
      if (
        sliced !== r &&
        sliced.toLowerCase() === r.toLowerCase() &&
        (e.length === r.length || e[r.length] === pathModule_5.sep || e[r.length] === "/")
      )
        return sliced;
      return r;
    }
  } catch {
    return r;
  }
  let resolved = pathModule_5.resolve(e);
  try {
    if (statSync_2(resolved).isDirectory()) return resolved;
  } catch {}
  return r;
}
//@ chunk-fq0cr76a.js:891205-891264 layout
function N6r(e) {
  return isStorageV5Enabled() && e !== void 0 ? (gl() ?? void 0) : void 0;
}
//@ chunk-fq0cr76a.js:891264-891325 layout
var MACOS_PROTECTED_LIBRARY_DIRS = ["Containers", "Group Containers", "Mobile Documents"];
/**
 * macOS 下搜索根包含 ~/Library/Containers 等受保护目录时追加排除，避免触发系统授权弹窗。
 */
//@ chunk-fq0cr76a.js:891325-891906 layout
function addMacosProtectedDirExcludes(e, n, r) {
  if (getPlatform() !== "macos") return e;
  try {
    let s = safeRealpath(r),
      isAbsolute = pathModule_5.isAbsolute(n),
      y = isAbsolute ? pathModule_5.resolve(n) : pathModule_5.join(s, n),
      b = y === s ? s : safeRealpath(y),
      joined = pathModule_5.join(safeRealpath(homedir_5()), "Library"),
      flattened = MACOS_PROTECTED_LIBRARY_DIRS.flatMap((R) => {
        let relativePath = pathModule_5.relative(b, pathModule_5.join(joined, R));
        if (!isStrictSubpath(relativePath)) return [];
        let joined_2 = pathModule_5.join(y, relativePath),
          relativePath_2 = pathModule_5.relative(s, joined_2);
        if (!isStrictSubpath(relativePath_2) && !isAbsolute) return [];
        return [
          "--glob",
          `!/${(isStrictSubpath(relativePath_2) ? relativePath_2 : joined_2).replace(/[\\*?[\]{}]/g, "\\$&")}`,
        ];
      });
    if (flattened.length === 0) return e;
    return (
      logForDebugging(`ripgrep: leaving other apps' data out of the walk of ${b}`),
      e.includes("--") ? [...flattened, ...e] : [...e, ...flattened]
    );
  } catch (error) {
    return (logForDebugging(`ripgrep: other apps' data not excluded: ${error}`, { level: "error" }), e);
  }
}
//@ chunk-fq0cr76a.js:891906-891994 layout
function isStrictSubpath(e) {
  return e !== "" && e !== ".." && !e.startsWith(`..${pathModule_5.sep}`) && !pathModule_5.isAbsolute(e);
}
/**
 * ripGrepRaw：spawn ripgrep，按字节上限收集 stdout/stderr，支持 stdin 管道与继承 fd，macOS 自动排除 ~/Library 受保护目录。
 */
//@ chunk-fq0cr76a.js:891994-894506 fingerprint = ripGrepRaw (0.57)
function ripGrepRaw(e, n, r, s, h = !1, y, b, S, w = !1) {
  CR();
  let { rgPath: rgPath, rgArgs: rgArgs, argv0: argv0 } = ripgrepCommand(),
    L = y ?? resolveRipgrepSpawnCwd(n, rgPath);
  assertNoNullBytesForRipgrep(e, n, L);
  let V = h ? ["-j", "1"] : [],
    fullArgs = [...rgArgs, ...V, ...(w ? e : addMacosProtectedDirExcludes(e, n, L)), n],
    q = getPlatform() === "wsl" ? 60000 : 20000,
    Z = env.CLAUDE_CODE_GLOB_TIMEOUT_SECONDS || 0,
    J = Z > 0 ? Z * 1000 : q;
  if (argv0 || S !== void 0) {
    let child = spawn_5(rgPath, fullArgs, {
      ...(argv0 && { argv0: argv0 }),
      ...(S !== void 0 && { stdio: ["pipe", "pipe", "pipe", S] }),
      cwd: L,
      signal: r,
      windowsHide: !0,
      ...Nd("helper"),
    });
    if (b && child.stdin) {
      child.stdin.on("error", () => {});
      let Nt = b();
      (Nt.on("error", (data) => {
        (child.kill(), child.emit("error", Object.assign(data, { stdinSourceFailed: !0 })));
      }).pipe(child.stdin),
        child.once("close", () => Nt.destroy()));
    }
    let Ne = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES),
      Ce = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES),
      Ie,
      he,
      ft = !1,
      timeoutId = setTimeout(() => {
        ((ft = !0),
          child.kill("SIGTERM"),
          (Ie = setTimeout(
            (Nt, Wt) => {
              (Wt(), Nt.kill("SIGKILL"));
            },
            5000,
            child,
            mn,
          )));
      }, J),
      ut = !1,
      we = (Nt, Wt, gt) => {
        if (ut) return;
        ((ut = !0), clearTimeout(timeoutId), clearTimeout(Ie), clearTimeout(he), s(Nt, Wt, gt));
      },
      Ae = () => {
        try {
          child.kill(RIPGREP_KILL_SIGNAL);
        } catch {}
      },
      dt = (Nt) => {
        if (ut) return;
        (Ne.release(), Ce.release(), we(toRipgrepOutputError(toError(Nt)), "", ""), Ae());
      },
      Me = () => {
        let Nt = Error("stdout maxBuffer length exceeded");
        return ((Nt.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"), Nt);
      },
      Ft = (Nt) => {
        try {
          if (!ut && Ne.append(Nt)) Ae();
        } catch (error) {
          dt(error);
        }
      },
      xn = (Nt) => {
        try {
          if (!ut) Ce.append(Nt);
        } catch (error) {
          dt(error);
        }
      },
      mt = (Nt, Wt) => {
        try {
          if (ut) return;
          let takeText = Ne.takeText(),
            takeText_2 = Ce.takeText();
          if (Nt === 0 || Nt === 1) {
            we(Ne.truncated ? Me() : null, takeText, takeText_2);
            return;
          }
          let Rn = Error(`ripgrep exited with code ${Nt}${Wt ? ` (signal ${Wt})` : ""}`);
          ((Rn.code = Nt ?? void 0),
            (Rn.signal = Wt ?? (ft ? "SIGTERM" : void 0)),
            we(Ne.truncated ? Me() : Rn, takeText, takeText_2));
        } catch (error) {
          dt(error);
        }
      },
      Mt = (Nt) => {
        try {
          if (ut) return;
          if (Nt.code === "ENOENT") Kl().invalidate();
          we(Ne.truncated ? Me() : Nt, Ne.takeText(), Ce.takeText());
        } catch (error) {
          dt(error);
        }
      },
      mn = () => {
        he = setTimeout(
          (Nt) => {
            (logForDebugging("rg did not report close after the timeout kill; the search ends without it", {
              level: "error",
            }),
              Nt(null, null));
          },
          RIPGREP_KILL_GRACE_MS,
          mt,
        );
      };
    return (
      child.stdout?.on("data", Ft),
      child.stderr?.on("data", xn),
      child.on("close", mt),
      child.on("error", Mt),
      child
    );
  }
  let ie = {},
    ae = !1,
    Se = (me, Ne, Ce) => {
      if (ae) return;
      ((ae = !0), clearTimeout(ie.id), s(me, Ne, Ce));
    },
    ue = execFile(
      rgPath,
      fullArgs,
      {
        cwd: L,
        maxBuffer: MAX_RIPGREP_OUTPUT_BYTES,
        signal: r,
        timeout: J,
        killSignal: RIPGREP_KILL_SIGNAL,
        windowsHide: !0,
        ...Nd("helper"),
      },
      Se,
    );
  if (!ae)
    ie.id = setTimeout(
      (code, signal) => {
        code.id = setTimeout(
          (Ce) => {
            logForDebugging("rg did not report close after the timeout kill; the search ends without it", {
              level: "error",
            });
            let Ie = Error("ripgrep did not exit after the timeout kill");
            ((Ie.signal = "SIGTERM"), Ce(Ie, "", ""));
          },
          RIPGREP_KILL_GRACE_MS,
          signal,
        );
      },
      J,
      ie,
      Se,
    );
  if (b && ue.stdin) {
    ue.stdin.on("error", () => {});
    let me = b();
    (me
      .on("error", (err) => {
        (ue.kill(), ue.emit("error", Object.assign(err, { stdinSourceFailed: !0 })));
      })
      .pipe(ue.stdin),
      ue.once("close", () => me.destroy()));
  }
  return ue;
}
//@ chunk-fq0cr76a.js:894506-895018 fingerprint = ripGrepFileCount (0.912)
async function ripGrepFileCount(args, target, abortSignal) {
  CR();
  let { rgPath: rgPath, rgArgs: rgArgs, argv0: argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let w = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, w);
    let child = addMacosProtectedDirExcludes(args, target, w),
      D = spawn_5(rgPath, [...rgArgs, ...child, target], {
        argv0: argv0,
        cwd: w,
        signal: abortSignal,
        windowsHide: !0,
        stdio: ["ignore", "pipe", "ignore"],
        ...Nd("helper"),
      }),
      lines = 0;
    D.stdout?.on("data", (chunk) => {
      lines += countCharInString(
        chunk,
        `
`,
      );
    });
    let L = !1;
    (D.on("close", (code) => {
      if (L) return;
      if (((L = !0), code === 0 || code === 1 || code === null)) resolve(lines);
      else reject(Error(`rg --files exited ${code}`));
    }),
      D.on("error", (err) => {
        if (L) return;
        L = !0;
        let K = explainRipgrepNotFound(sanitizeSpawnError(err));
        if (err.code === "ENOENT" && argv0) Kl().invalidate();
        reject(K);
      }));
  });
}
//@ chunk-fq0cr76a.js:895018-895043 layout = killCaffeinate (0.805)
var RIPGREP_KILL_SIGNAL = "SIGKILL",
  RIPGREP_KILL_GRACE_MS = 5000;
/**
 * 流式运行 ripgrep，逐批回调输出行（SIGKILL 结束）。
 */
//@ chunk-fq0cr76a.js:895043-896024 fingerprint = ripGrepStream (0.631)
async function ripGrepStream(args, target, abortSignal, onLines) {
  CR();
  let { rgPath: rgPath, rgArgs: rgArgs, argv0: argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let R = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, R);
    let child = addMacosProtectedDirExcludes(args, target, R),
      O = spawn_5(rgPath, [...rgArgs, ...child, target], {
        argv0: argv0,
        cwd: R,
        signal: abortSignal,
        killSignal: RIPGREP_KILL_SIGNAL,
        windowsHide: !0,
        stdio: ["ignore", "pipe", "ignore"],
        ...Nd("helper"),
      }),
      stripCR = (J) => (J.endsWith("\r") ? J.slice(0, -1) : J),
      V = new StringDecoder("utf8"),
      remainder = "";
    O.stdout?.on("data", (chunk) => {
      let parts = (remainder + V.write(chunk)).split(`
`);
      if (((remainder = parts.pop() ?? ""), parts.length)) onLines(parts.map(stripCR));
    });
    let q = !1,
      Z;
    (O.on("close", (code) => {
      if ((clearTimeout(Z), q)) return;
      if (abortSignal.aborted) {
        ((q = !0), resolve("aborted"));
        return;
      }
      if (((q = !0), (remainder += V.end()), code === 0 || code === 1)) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("complete");
      } else if (code === 2) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("error-exit-2");
      } else if (code === null) resolve("external-kill");
      else reject(Error(`ripgrep exited with code ${code}`));
    }),
      O.on("error", (err) => {
        if (q) return;
        if (err.code === "ABORT_ERR" || err.name === "AbortError") {
          if (O.pid === void 0) {
            ((q = !0), resolve("aborted"));
            return;
          }
          ((Z = setTimeout(() => {
            if (!q) ((q = !0), resolve("aborted"));
          }, RIPGREP_KILL_GRACE_MS)),
            Z.unref?.());
          return;
        }
        q = !0;
        let ie = explainRipgrepNotFound(sanitizeSpawnError(err));
        if (err.code === "ENOENT" && argv0) Kl().invalidate();
        reject(ie);
      }));
  });
}
/**
 * 在 lexical 与 canonical 路径前缀间互换，得到同一路径的另一种拼写（deny 规则匹配用）。
 */
//@ chunk-fq0cr76a.js:896024-896386 layout
function getAlternateRootSpellings(e, n) {
  if (n.lexical === n.canonical) return [];
  let r = n.canonical.endsWith(sep_2) ? n.canonical : n.canonical + sep_2,
    s = n.lexical.endsWith(sep_2) ? n.lexical : n.lexical + sep_2,
    h = [];
  if (isSearchResultRootRespellEnabled()) {
    if (e === n.lexical) h.push(n.canonical);
    else if (e.startsWith(s)) h.push(r + e.slice(s.length));
  }
  if (e === n.canonical) h.push(n.lexical);
  else if (e.startsWith(r)) h.push(s + e.slice(r.length));
  return h;
}
/**
 * 运行 ripgrep 并返回行数组：首次使用时自检；处理超时（WSL 60s、其他 20s，可由 CLAUDE_CODE_GLOB_TIMEOUT_SECONDS 覆盖）、资源耗尽重试、输出超限。
 */
//@ chunk-fq0cr76a.js:896386-899328 fingerprint = ripGrep (0.505)
async function ripGrep(e, n, r, s) {
  return (
    Kl()
      .testOnFirstUse()
      .catch((error) => {
        logError(error);
      }),
    new Promise((resolve, reject) => {
      let handleResult = (error, stdout, stderr, isRetry) => {
          if (!error) {
            if (s?.rejectOnPartial && stdout.length >= MAX_RIPGREP_OUTPUT_BYTES) {
              reject(
                new RipgrepTimeoutError("Ripgrep output exceeded the output buffer and was truncated.", []),
              );
              return;
            }
            resolve(
              s?.rawLines
                ? stdout === ""
                  ? []
                  : stdout.replace(/\n$/, "").split(`
`)
                : stdout
                    .trim()
                    .split(
                      `
`,
                    )
                    .map((line) => line.replace(/\r$/, ""))
                    .filter(Boolean),
            );
            return;
          }
          if (error.code === 1) {
            resolve([]);
            return;
          }
          if (error instanceof RipgrepOutputError) {
            reject(error);
            return;
          }
          if (["ENOENT", "EACCES", "EPERM"].includes(error.code)) {
            reject(explainRipgrepNotFound(sanitizeSpawnError(error)));
            return;
          }
          let V = error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
          if (!isRetry && !V && isEagainError(stderr)) {
            (logForDebugging("rg EAGAIN error detected, retrying with single-threaded mode (-j 1)"),
              logEvent("tengu_ripgrep_eagain_retry", {}));
            try {
              (s?.beforeSpawn?.(),
                ripGrepRaw(
                  e,
                  n,
                  r,
                  (retryError, retryStdout, retryStderr) => {
                    S(retryError, retryStdout, retryStderr, !0);
                  },
                  !0,
                  s?.cwd,
                  s?.stdin,
                  s?.inheritFd,
                  s?.searchOtherAppsData,
                ));
            } catch (error) {
              reject(
                RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "thrown") ?? toError(error),
              );
            }
            return;
          }
          let K = stdout && stdout.trim().length > 0,
            q = error.signal === "SIGTERM" || error.signal === "SIGKILL" || error.code === "ABORT_ERR",
            Z = error.code === void 0 && (error.signal === void 0 || BENIGN_KILL_SIGNALS.has(error.signal)),
            lines = [];
          if (K) {
            if (
              ((lines = s?.rawLines
                ? stdout === ""
                  ? []
                  : stdout.replace(/\n$/, "").split(`
`)
                : stdout
                    .trim()
                    .split(
                      `
`,
                    )
                    .map((line) => line.replace(/\r$/, ""))
                    .filter(Boolean)),
              lines.length > 0 && (q || V || Z))
            )
              lines = s?.rawLines ? dropIncompleteLastLine(lines, stdout) : lines.slice(0, -1);
          }
          if (
            (logForDebugging(
              `rg error (signal=${error.signal}, code=${error.code}, stderr: ${stderr}), ${lines.length} results`,
            ),
            s?.rejectOnPartial && (q || V || Z))
          ) {
            reject(
              r.aborted && r.reason?.name !== "TimeoutError"
                ? new AbortError()
                : new RipgrepTimeoutError(
                    "Ripgrep listing is incomplete: it timed out, was killed or exceeded the output buffer.",
                    lines,
                  ),
            );
            return;
          }
          if (
            s?.rejectOnInputError &&
            error.code === 2 &&
            lines.length === 0 &&
            RIPGREP_USAGE_ERROR_RE.test(stderr)
          ) {
            reject(new RipgrepUsageError(stderr));
            return;
          }
          if (
            s?.rejectOnInputError &&
            error.code === 2 &&
            lines.every((ae) => ae.endsWith('"type":"summary"}')) &&
            stderr.startsWith(`rg: ${n}: `) &&
            !stderr.trimEnd().includes(`
`)
          ) {
            let ae = Number(/\(os error (\d+)\)\s*$/.exec(stderr)?.[1]),
              Se =
                n !== INHERITED_FD_PATH &&
                (getPlatform() === "windows"
                  ? [WIN_ERROR_FILE_NOT_FOUND, WIN_ERROR_PATH_NOT_FOUND]
                  : [ENOENT_CODE, ENOTDIR_CODE]
                ).includes(ae);
            if (!Number.isNaN(ae) && !Se) {
              reject(new RipgrepTargetUnreadableError(ae));
              return;
            }
          }
          if (s?.rejectOnInputError && "stdinSourceFailed" in error && error.stdinSourceFailed === !0) {
            reject(sanitizeSpawnError(error));
            return;
          }
          if (error.code !== 2 && error.code !== "ABORT_ERR") {
            let ae = RESOURCE_EXHAUSTION_CODES.has(getErrnoCode(error) ?? "");
            if (q || V || Z || ae || isEagainError(stderr))
              logForDebugging(`rg failed (signal=${error.signal}, code=${error.code}): ${error.message}`, {
                level: "error",
              });
            else {
              let Se =
                lines.length === 0 && s?.rejectOnInputError && error.code !== "ECHILD"
                  ? r.aborted
                    ? createRipgrepAbortError(r)
                    : new RipgrepAbnormalExitError()
                  : void 0;
              if (
                (logError(
                  withTelemetryChildExitStatus(
                    withTelemetryMessage(
                      toError(error),
                      "ripgrep unexpected exit (signal or unmodeled code)",
                    ),
                    typeof error.code === "number" &&
                      !r.aborted &&
                      !("stdinSourceFailed" in error) &&
                      !(error instanceof DOMException)
                      ? error.code
                      : void 0,
                  ),
                ),
                Se !== void 0)
              ) {
                reject(Se);
                return;
              }
            }
          }
          let ie =
            lines.length === 0
              ? RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "emitted")
              : void 0;
          if (ie) {
            reject(ie);
            return;
          }
          if (V && lines.length === 0 && s?.rejectOnInputError) {
            reject(new RipgrepOutputTooLargeError(error.message.startsWith("stderr") ? "stderr" : "stdout"));
            return;
          }
          if (q && lines.length === 0) {
            reject(createRipgrepAbortError(r));
            return;
          }
          resolve(lines);
        },
        S = (w, R, D, O) => {
          try {
            handleResult(w, R, D, O);
          } catch (error) {
            reject(error instanceof RangeError ? toRipgrepOutputError(error) : toError(error));
          }
        };
      try {
        (s?.beforeSpawn?.(),
          ripGrepRaw(
            e,
            n,
            r,
            (error, stdout, stderr) => {
              S(error, stdout, stderr, !1);
            },
            !1,
            s?.cwd,
            s?.stdin,
            s?.inheritFd,
            s?.searchOtherAppsData,
          ));
      } catch (error) {
        reject(RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "thrown") ?? error);
      }
    })
  );
}
/**
 * 统计目录文件数（四舍五入），委托给 ripgrep 状态对象。
 */
//@ chunk-fq0cr76a.js:899328-899388 layout
function countFilesRounded(e, n, r = []) {
  return Kl().countFilesRounded(e, n, r);
}
/**
 * 用 rg --files --hidden 统计目录文件数（家目录本身或其祖先时跳过）。
 */
//@ chunk-fq0cr76a.js:899388-899763 fingerprint = countFilesRoundedRg (0.852)
async function countFilesRoundedRg(dirPath, abortSignal, ignorePatterns) {
  let relativePath = pathModule_5.relative(safeRealpath(dirPath), safeRealpath(homedir_5()));
  if (relativePath === "" || isStrictSubpath(relativePath)) return;
  try {
    let h,
      y = null;
    {
      let args = ["--files", "--hidden"];
      (ignorePatterns.forEach((pattern) => {
        args.push("--glob", `!${pattern}`);
      }),
        (h = await ripGrepFileCount(args, dirPath, abortSignal)));
    }
    if (h === 0) return 0;
    let magnitude = Math.floor(Math.log10(h)),
      power = Math.pow(10, magnitude);
    return Math.round(h / power) * power;
  } catch (error) {
    if (error?.name !== "AbortError")
      logForDebugging(`countFilesRoundedRg failed: ${error}`, { level: "error" });
  }
}
/**
 * ripgrep 状态：模式、路径、是否可用。
 */
//@ chunk-fq0cr76a.js:899763-899859 layout = getRipgrepStatus (1)
function getRipgrepStatus_2() {
  let config = ideDiffSupport();
  return { mode: config.mode, path: config.command, working: Kl().status?.working ?? null };
}
/**
 * 首次使用时运行 rg --version 自检并记录可用性。
 */
//@ chunk-fq0cr76a.js:899859-900715 fingerprint = testRipgrepOnFirstUse (0.902)
async function testRipgrepOnFirstUse() {
  let config = Kl();
  if (config.status !== null) return;
  if (Tv()) return;
  let n = ideDiffSupport();
  try {
    let test;
    if (n.argv0) {
      let proc = Bun.spawn([n.command, "--version"], {
          argv0: n.argv0,
          cwd: getCwd(),
          stderr: "ignore",
          stdout: "pipe",
          windowsHide: !0,
          ...Nd("helper"),
        }),
        [y, b] = await Promise.all([proc.stdout.text(), proc.exited]);
      test = { code: b, stdout: y };
    } else test = await execFileNoThrow(n.command, [...n.args, "--version"], { timeout: 5000 });
    let working = test.code === 0 && !!test.stdout && test.stdout.startsWith("ripgrep ");
    (config.setStatus({ working: working, lastTested: Date.now(), config: n }),
      logForDebugging(
        `Ripgrep first use test: ${working ? "PASSED" : "FAILED"} (mode=${n.mode}, path=${n.command})`,
      ),
      logEvent("tengu_ripgrep_availability", {
        working: working ? 1 : 0,
        using_system: n.mode === "system" ? 1 : 0,
      }));
  } catch (error) {
    (config.setStatus({ working: !1, lastTested: Date.now(), config: n }),
      logForDebugging(
        `Ripgrep first use test threw (mode=${n.mode}, path=${n.command}): ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ));
  }
}
//@ chunk-fq0cr76a.js:900715-901080 placement
function splitNulDelimitedOutput(e, n, r = "nul") {
  let joined = e.join(`
`);
  if (!joined.includes("\x00")) return e;
  let h = [];
  if (n === "count") {
    let b = /([^\0]*)\0:?(\d+)(?:\n|$)/gy;
    for (let match = b.exec(joined); match !== null; match = b.exec(joined))
      if (match[2] !== "0") h.push(`${match[1]}:${match[2]}`);
    return h;
  }
  let parts = joined.split("\x00");
  parts.pop();
  for (let b = 0; b < parts.length; b++) {
    let S = b === 0 || r === "nul" ? parts[b] : parts[b].replace(/^\n/, "");
    if (S !== "") h.push(S);
  }
  return h;
}
/**
 * 订阅 ripgrep 可用状态变化。
 */
//@ chunk-aqdf5t3e.js:8562-8617 fingerprint = getRipgrepStatus (1)
function getRipgrepStatus(e, n) {
  return ve.of(e).working.subscribe(n);
}

export {
  getRipgrepStatus,
  ripGrep,
  resolveRipgrepSpawnCwd,
  ripgrepCommand,
  countFilesRounded,
  ripGrepStream,
  N6r,
  RipgrepTimeoutError,
  resolveRipgrepTarget,
  buildDenyRuleGlobs,
  getRipgrepDisplayRoot,
  assertDenyGlobsUnchanged,
  splitNulDelimitedOutput,
  hasUnsafeDenyGlob,
  mapRipgrepOutputPath,
  getAlternateRootSpellings,
  Kl,
  getRipgrepStatus_2,
};
