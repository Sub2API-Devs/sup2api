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
import * as pathModule_2 from "path";
import "path";
import "path";
import "path";
import "path";
import { sep } from "path";
import { constants, realpathSync, statSync } from "fs";
import { homedir } from "os";
import { spawn, execFile } from "child_process";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { isEnvDefinedFalsy } from "./envUtils.js";
import { env } from "./env.js";
import { findExecutable, pathModule } from "./findExecutable.js";
import { isStandaloneExecutable as isStandaloneExecutable_2 } from "./slowOperations.js";
import { bunWhichSync } from "./which.js";
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
import { getCwd, getCwdOrNull } from "./cwd.js";
import { SymlinkReadRefusedError } from "./fsSafety/atomicWriteStaging.js";
import { walkPermissionCheckPaths, safeResolvePath, getFsImplementation } from "./fsOperations.js";
import {
  pathInWorkingPath,
  normalizePatternsToPath,
  isSearchResultRootRespellEnabled,
} from "./permissions/filesystem.js";
import { isUncOrDevicePath } from "./pathClassification.js";
import { isWslUncPath, isNetworkMountPath } from "./networkPaths.js";
import { INHERITED_FD_PATH, execFileNoThrow } from "./execFileNoThrow.js";
import { uniq } from "./collections.js";
import { NoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { assertProgramLaunchAllowed, isDisklessSession } from "./disklessSession.js";
import { cgroupSpawnOptions } from "./toolCgroup.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { presenceStores } from "../services/artifacts/artifactPresence.js";

//@ chunk-fq0cr76a.js:877863-878480 placement
class RipgrepStatus {
  config = undefined;
  roundedFileCounts = new Map();
  #e = null;
  firstUseProbe = undefined;
  get status() {
    return this.#e;
  }
  getConfig() {
    this.config ??= getRipgrepConfig_2();
    return this.config;
  }
  clearConfig() {
    this.config = undefined;
  }
  countFilesRounded(dirPath, abortSignal, ignorePatterns) {
    let s = `${dirPath}|${ignorePatterns.join(",")}`;
    let h = this.roundedFileCounts.get(s);
    if (h === undefined) {
      h = countFilesRoundedRg(dirPath, abortSignal, ignorePatterns);
      this.roundedFileCounts.set(s, h);
    }
    return h;
  }
  setStatus(e) {
    this.#e = e;
  }
  testOnFirstUse() {
    this.firstUseProbe ??= testRipgrepOnFirstUse();
    return this.firstUseProbe;
  }
  invalidate() {
    this.clearConfig();
    if (this.#e?.working !== false) {
      this.firstUseProbe = undefined;
      this.#e = null;
    }
  }
  reset() {
    this.config = undefined;
    this.roundedFileCounts.clear();
    this.firstUseProbe = undefined;
  }
}
//@ chunk-fq0cr76a.js:878480-878506 placement
var ripgrepStatusSlot = new HostScoped(() => new RipgrepStatus());
//@ chunk-fq0cr76a.js:878506-878544 placement
/**
 * ripgrepStatus：当前宿主的 ripgrep 状态。
 */
function ripgrepStatus() {
  return ripgrepStatusSlot.of(getRootSession().host);
}
//@ chunk-fq0cr76a.js:878582-878972 fingerprint = getRipgrepConfig (0.659)
/**
 * 决定 ripgrep 来源：USE_BUILTIN_RIPGREP 设为假值时优先系统 rg；Bun 单文件可执行时用自身（argv0=rg，内嵌）；否则系统 rg。
 */
function getRipgrepConfig_2() {
  if (isEnvDefinedFalsy(env.USE_BUILTIN_RIPGREP)) {
    let { cmd: systemPath } = findExecutable("rg", []);
    if (systemPath !== "rg")
      return {
        mode: "system",
        command: systemPath,
        args: [],
      };
  }
  if (isStandaloneExecutable_2()) {
    let r = {
      mode: "embedded",
      command: process.execPath,
      args: ["--no-config"],
      argv0: "rg",
    };
    if (bunWhichSync(process.execPath)) return r;
    let { cmd } = findExecutable("rg", []);
    if (cmd !== "rg")
      return {
        mode: "system",
        command: cmd,
        args: [],
      };
    return r;
  }
  let { cmd: systemPath } = findExecutable("rg", []);
  return {
    mode: "system",
    command: systemPath,
    args: [],
  };
}
//@ chunk-fq0cr76a.js:878972-879215 layout
var RIPGREP_NOT_FOUND_MESSAGE =
  "ripgrep not found on PATH. Install it (brew install ripgrep / apt install ripgrep / winget install BurntSushi.ripgrep.MSVC) or use the native claude binary which embeds it.";
var SPAWN_SYSCALLS = new Set(["spawn", "spawnSync", "posix_spawn", "uv_spawn"]);
//@ chunk-fq0cr76a.js:879215-879735 layout
/**
 * 净化 spawn 错误：去掉可能含路径的 cmd/spawnargs 等字段，只保留 name/message/code/errno 与白名单 syscall。
 */
function sanitizeSpawnError(e) {
  if ("stdinSourceFailed" in e && e.stdinSourceFailed === true) {
    Reflect.deleteProperty(e, "cmd");
    Reflect.deleteProperty(e, "spawnargs");
    return e;
  }
  let { name: n, message, stack, code, errno, path, syscall } = e;
  let w = typeof syscall === "string" ? /^[A-Za-z_]+/.exec(syscall)?.[0] : undefined;
  let merged = Object.assign(Error(message), {
    name: n,
    stack,
    ...(code !== undefined && {
      code,
    }),
    ...(typeof errno === "number" && {
      errno,
    }),
    ...(w !== undefined &&
      SPAWN_SYSCALLS.has(w) && {
        syscall: w,
      }),
  });
  return typeof path === "string"
    ? Object.defineProperty(merged, "path", {
        value: path,
        enumerable: false,
        writable: true,
        configurable: true,
      })
    : merged;
}
//@ chunk-fq0cr76a.js:879735-879855 layout
function explainRipgrepNotFound(e) {
  if (e.code === "ENOENT" && ideDiffSupport().mode === "system") {
    let n = Error(RIPGREP_NOT_FOUND_MESSAGE, {
      cause: e,
    });
    n.code = "ENOENT";
    return n;
  }
  return e;
}
//@ chunk-fq0cr76a.js:879855-879933 fingerprint = ripgrepCommand (1)
/**
 * 当前 ripgrep 命令（路径、前置参数、argv0）。
 */
function ripgrepCommand() {
  let config = ideDiffSupport();
  return {
    rgPath: config.command,
    rgArgs: config.args,
    argv0: config.argv0,
  };
}
//@ chunk-fq0cr76a.js:879933-879960 layout
/**
 * ripgrep 输出收集上限 20MB 与流式块上限常量。
 */
var MAX_RIPGREP_OUTPUT_BYTES = 20000000;
var RIPGREP_HEAD_BYTES = 1048576;
//@ chunk-fq0cr76a.js:879960-880437 layout
class BoundedOutputCollector {
  maxBytes;
  truncated = false;
  decoder = new StringDecoder("utf8");
  pieces = [];
  byteLength = 0;
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
  }
  append(e) {
    if (this.truncated) return false;
    let n = this.maxBytes - this.byteLength;
    let r = e.length <= n;
    let s = r ? e : e.subarray(0, n);
    this.byteLength += s.length;
    for (let h = 0; h < s.length; h += RIPGREP_HEAD_BYTES)
      this.pieces.push(this.decoder.write(s.subarray(h, h + RIPGREP_HEAD_BYTES)));
    if (!r) this.truncated = true;
    return !r;
  }
  takeText() {
    let pieces = this.pieces;
    this.pieces = [];
    pieces.push(this.decoder.end());
    return pieces.join("");
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
function toRipgrepOutputError(error) {
  return withTelemetryMessage(
    new RipgrepOutputError(
      `Failed to collect ripgrep output: ${error.message}. If the search matches a very large amount of text, try a more specific path or pattern.`,
      {
        cause: error,
      },
    ),
    "ripgrep output collection failed",
  );
}
//@ chunk-fq0cr76a.js:880703-880858 layout
function dropIncompleteLastLine(lines, stdout) {
  let last = lines.at(-1);
  if (
    last === undefined ||
    stdout.endsWith(`
`)
  )
    return lines;
  let index = last.lastIndexOf("\x00");
  return index === -1 ? lines.slice(0, -1) : lines.with(-1, last.slice(0, index + 1));
}
//@ chunk-fq0cr76a.js:880858-880905 layout
var BENIGN_KILL_SIGNALS = new Set(["SIGHUP", "SIGINT", "SIGPIPE"]);
//@ chunk-fq0cr76a.js:880905-881001 fingerprint = isEagainError (1)
function isEagainError(stderr) {
  return stderr.includes("os error 11") || stderr.includes("Resource temporarily unavailable");
}
//@ chunk-fq0cr76a.js:881001-881055 layout
/**
 * 资源耗尽类错误码（EAGAIN/ENOMEM/EMFILE/ENFILE），遇到时以 -j 1 单线程重试。
 */
var RESOURCE_EXHAUSTION_CODES = new Set(["EAGAIN", "ENOMEM", "EMFILE", "ENFILE"]);
//@ chunk-fq0cr76a.js:881055-881175 fingerprint = RipgrepTimeoutError (0.773)
/**
 * ripgrep 超时错误，带部分结果。
 */
class RipgrepTimeoutError extends Error {
  partialResults;
  constructor(message, partialResults) {
    super(message);
    this.partialResults = partialResults;
    this.name = "RipgrepTimeoutError";
  }
}
//@ chunk-fq0cr76a.js:881175-881443 layout
/**
 * ripgrep 中断时的错误：非超时中断给 AbortError，超时给 RipgrepTimeoutError（WSL 60 秒，其它 20 秒），并建议缩小路径或模式。
 */
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
  constructor(stderr) {
    super(
      `Search failed \u2014 ripgrep rejected the pattern, glob, or file type without searching:
${truncateToLength(stderr.trim(), 2000)}`,
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
    let n = getPlatform() === "windows";
    let r = n ? e === WIN_ERROR_ACCESS_DENIED : e === EACCES_CODE || e === EPERM_CODE;
    let s = r
      ? "permission denied"
      : !n && e === EIO_CODE
        ? "input/output error"
        : !n && e === ENOENT_CODE
          ? "the file Claude Code opened was not passed to ripgrep"
          : "an operating system error";
    let h = r
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
var EPERM_CODE = 1;
var ENOENT_CODE = 2;
var EIO_CODE = 5;
var EACCES_CODE = 13;
var ENOTDIR_CODE = 20;
var WIN_ERROR_FILE_NOT_FOUND = 2;
var WIN_ERROR_PATH_NOT_FOUND = 3;
var WIN_ERROR_ACCESS_DENIED = 5;
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
//@ chunk-fq0cr76a.js:883720-884378 layout
/**
 * ripgrep 启动失败的 errno → {reason, advice} 文案表（EAGAIN、ENOMEM、EMFILE、ENFILE…）。
 */
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
    {
      reason: "this Claude Code process has too many files open",
      advice: "Claude Code needs a restart",
    },
  ],
  [
    "ENFILE",
    {
      reason: "the system has too many files open",
      advice: "this machine has too many files open; closing other programs can help",
    },
  ],
]);
var DEFAULT_SPAWN_FAILURE_REASON = {
  reason: "the system ran out of a resource",
  advice: "this machine is short of a resource needed to start programs",
};
//@ chunk-fq0cr76a.js:884378-885017 layout
class RipgrepSpawnResourceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(errnoCode) {
    let { reason, advice } = SPAWN_FAILURE_REASONS.get(errnoCode) ?? DEFAULT_SPAWN_FAILURE_REASON;
    super(
      `ripgrep could not start, so nothing was searched and matches may still exist: the operating system could not start it because ${reason} (${errnoCode}). Retry in a moment. If it keeps failing, tell the user that ${advice}.`,
      "ripgrep not started: the OS could not create another process",
      `rg_spawn_${errnoCode.toLowerCase()}`,
    );
    this.name = "RipgrepSpawnResourceError";
  }
  static from(e, n, r) {
    if (!n) return;
    let errnoCode = getErrnoCode(e);
    let h =
      e instanceof Error && "syscall" in e && typeof e.syscall === "string" && e.syscall.startsWith("spawn");
    let y = r === "emitted" || isSadFsErrno(e) || isEnvFsErrno(e);
    return errnoCode !== undefined && RESOURCE_EXHAUSTION_CODES.has(errnoCode) && h && y
      ? new RipgrepSpawnResourceError(errnoCode)
      : undefined;
  }
}
//@ chunk-fq0cr76a.js:885017-885068 layout
class RipgrepNullByteError extends Error {
  name = "RipgrepNullByteError";
}
//@ chunk-fq0cr76a.js:885068-885549 layout
/**
 * ripgrep 启动前检查 cwd、目标路径与参数里没有 \0，否则抛 RipgrepNullByteError（附遥测说明）。
 */
function assertNoNullBytesForRipgrep(e, target, r) {
  let index = e.findIndex((y) => y.includes("\x00"));
  let h = r.includes("\x00")
    ? {
        local: "the session working directory",
        telemetry: "ripgrep spawn blocked: null byte in session cwd",
      }
    : target.includes("\x00")
      ? {
          local: "the target path",
          telemetry: "ripgrep spawn blocked: null byte in target path",
        }
      : index !== -1
        ? {
            local: `caller argument ${index}`,
            telemetry: "ripgrep spawn blocked: null byte in argv",
          }
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
    await stat(realCandidate);
    return true;
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw e;
  }
}
//@ chunk-fq0cr76a.js:885666-888681 layout
/**
 * 规范化 ripgrep 搜索目标：确认软链解析与权限检查时一致、PATH 上按名找到的 rg 不能搜索工作目录外（无法套用 Read 拒绝规则），返回 {lexical, canonical, spawnCwd, relativeOutput, isDirectory, recheckBeforeSpawn…}。
 */
async function resolveRipgrepTarget(realCandidate, n) {
  assertNoNullBytesForRipgrep([], realCandidate, getCwd());
  let platform = getPlatform();
  let s = new Set(n);
  let h = () =>
    new SymlinkReadRefusedError(
      `Refusing to search ${realCandidate}: its symlink resolution changed after permission was checked. If a link in the working directory is being rewritten concurrently, stop that and retry.`,
    );
  let y = () => {
    let O = walkPermissionCheckPaths(realCandidate);
    if (O.unresolved || O.spellings.some((spelling) => !s.has(spelling))) throw h();
  };
  y();
  let b = () => {
    let O = safeResolvePath(getFsImplementation(), realCandidate);
    if (!O.isCanonical) throw h();
    return O.resolvedPath;
  };
  let S = !pathModule_2.isAbsolute(ripgrepCommand().rgPath);
  let w = () => {
    throw new SymlinkReadRefusedError(
      `Refusing to search ${realCandidate}: ripgrep was found only by name on PATH, and a search outside the working directory cannot apply your Read deny rules in that configuration. Install ripgrep at an absolute path or search under the working directory.`,
    );
  };
  let R = async (canonical = realCandidate) => {
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(realCandidate, ripgrepCommand().rgPath);
    if (S && !pathInWorkingPath(realCandidate, ripgrepSpawnCwd)) w();
    let isDirectory;
    try {
      isDirectory = (await stat(realCandidate)).isDirectory();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      throw error;
    }
    return {
      lexical: realCandidate,
      canonical,
      spawnCwd: ripgrepSpawnCwd,
      target: realCandidate,
      relativeOutput: false,
      isDirectory,
      judgeEveryResult: true,
      recheckBeforeSpawn: y,
      recheckByPath: y,
      close: async () => {},
    };
  };
  if ((isUncOrDevicePath(realCandidate) && !isWslUncPath(realCandidate)) || isNetworkMountPath(realCandidate))
    return R();
  if (platform === "windows") {
    let O = safeResolvePath(getFsImplementation(), realCandidate);
    if (!O.isCanonical) {
      if (O.isSymlink) {
        if (s.has(O.resolvedPath) && isUncOrDevicePath(O.resolvedPath) && !isWslUncPath(O.resolvedPath))
          return R(O.resolvedPath);
        throw h();
      }
      if (!(await pathExistsStat(realCandidate))) return null;
      throw h();
    }
    let resolvedPath = O.resolvedPath;
    if (!s.has(resolvedPath)) throw h();
    let V = () => {
      y();
      if (b() !== resolvedPath) throw h();
    };
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(resolvedPath, ripgrepCommand().rgPath);
    let q;
    try {
      q = (await stat(resolvedPath)).isDirectory();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      if (errnoCode === "EACCES" || errnoCode === "EPERM") throw h();
      throw error;
    }
    if (q && S && !pathInWorkingPath(resolvedPath, ripgrepSpawnCwd)) w();
    return {
      lexical: realCandidate,
      canonical: resolvedPath,
      spawnCwd: ripgrepSpawnCwd,
      target: resolvedPath,
      relativeOutput: false,
      isDirectory: q,
      recheckBeforeSpawn: V,
      recheckByPath: V,
      close: async () => {},
    };
  }
  let D;
  try {
    D = await open(realCandidate, constants.O_RDONLY | constants.O_NONBLOCK);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
    if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "ELOOP")
      throw new SymlinkReadRefusedError(
        `Refusing to search ${realCandidate}: it could not be opened (${errnoCode}) \u2014 it is unreadable, or is being replaced concurrently.`,
      );
    throw error;
  }
  try {
    let stats = await D.stat();
    let L = null;
    if (platform === "linux" || platform === "wsl")
      try {
        L = await readlink(`/proc/self/fd/${D.fd}`);
      } catch {}
    let V = L !== null;
    let K = L ?? b();
    if (!s.has(K)) throw h();
    let q = D;
    let Z = () => {
      y();
      if (b() !== K) throw h();
    };
    let recheckBeforeSpawn = V ? () => {} : Z;
    if (stats.isDirectory())
      try {
        await access(V ? `/proc/self/fd/${q.fd}` : K, constants.X_OK);
      } catch {
        throw new SymlinkReadRefusedError(
          `Cannot search ${realCandidate}: the directory is not traversable (no execute permission).`,
        );
      }
    if (stats.isDirectory() && pathModule_2.isAbsolute(ripgrepCommand().rgPath))
      return {
        lexical: realCandidate,
        canonical: K,
        spawnCwd: V ? `/proc/self/fd/${q.fd}` : K,
        target: ".",
        relativeOutput: true,
        isDirectory: true,
        recheckBeforeSpawn,
        recheckByPath: Z,
        close: () => q.close(),
      };
    if (stats.isDirectory()) {
      let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(K, ripgrepCommand().rgPath);
      if (!pathInWorkingPath(K, ripgrepSpawnCwd)) w();
      return {
        lexical: realCandidate,
        canonical: K,
        spawnCwd: ripgrepSpawnCwd,
        target: K,
        relativeOutput: false,
        isDirectory: true,
        recheckBeforeSpawn: Z,
        recheckByPath: Z,
        close: () => q.close(),
      };
    }
    return {
      lexical: realCandidate,
      canonical: K,
      spawnCwd: resolveRipgrepSpawnCwd(K, ripgrepCommand().rgPath),
      target: V ? INHERITED_FD_PATH : K,
      inheritFd: V ? q.fd : undefined,
      relativeOutput: false,
      isDirectory: false,
      recheckBeforeSpawn,
      recheckByPath: Z,
      close: () => q.close(),
    };
  } catch (error) {
    await D.close().catch(() => {});
    throw error;
  }
}
//@ chunk-fq0cr76a.js:888681-889078 layout
/**
 * 把 ripgrep 输出的路径映射回用户给出的词法路径（处理规范化目录、相对输出）。
 */
function mapRipgrepOutputPath(e, n) {
  if (!n.isDirectory && e === n.target) return n.lexical;
  if (pathModule_2.isAbsolute(e)) {
    for (let r of [n.target, n.canonical]) {
      let s = r.endsWith(pathModule_2.sep) ? r : r + pathModule_2.sep;
      if (e.startsWith(s) && r !== n.lexical) return pathModule_2.join(n.lexical, e.slice(s.length));
    }
    return e;
  }
  if (n.relativeOutput) {
    let r = e.startsWith("./") ? e.slice(2) : e;
    return r === "." || r === ""
      ? n.lexical + (e.endsWith("/") ? pathModule_2.sep : "")
      : pathModule_2.join(n.lexical, r);
  }
  return e;
}
//@ chunk-fq0cr76a.js:889078-889319 layout
/**
 * 搜索准备期间 Read 拒绝规则对应路径发生变化时拒绝搜索（防竞态）。
 */
function assertDenyGlobsUnchanged(e, n, r, s) {
  let denyRuleGlobs = buildDenyRuleGlobs(e, n, s);
  if (denyRuleGlobs.length !== r.length || denyRuleGlobs.some((denyRuleGlob, b) => denyRuleGlob !== r[b]))
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
    return realpathSync(e);
  } catch {
    return e;
  }
}
//@ chunk-fq0cr76a.js:889581-890288 layout
/**
 * 把 Read 拒绝规则转成 ripgrep 的 !glob 排除参数；规则覆盖整个搜索目标时返回 ["!**"]。
 */
function buildDenyRuleGlobs(patternsByRoot, n, r) {
  let ripgrepRootSpellings = getRipgrepRootSpellings(n);
  let h = new Set();
  let y = [];
  if (n.isDirectory)
    for (let b of new Set([...ripgrepRootSpellings, n.canonical, n.lexical]))
      for (let [S, w] of patternsByRoot) {
        let relativePath = pathModule_2.relative(S ?? getCwd(), b);
        if (
          relativePath === "" ||
          relativePath === ".." ||
          relativePath.startsWith(`..${pathModule_2.sep}`) ||
          pathModule_2.isAbsolute(relativePath)
        )
          continue;
        let replaced = relativePath.replaceAll("\\", "/");
        let O = pathModule.default().add(w);
        if (O.ignores(replaced) || O.ignores(replaced + "/")) return ["!**"];
      }
  for (let b of new Set(ripgrepRootSpellings))
    for (let S of normalizePatternsToPath(patternsByRoot, b)) {
      if (S.includes("[")) continue;
      let w = escapeBracesInGlob(S);
      if (w === "/" || w === "") {
        if (!h.has("!**")) {
          h.add("!**");
          y.push("!**");
        }
        continue;
      }
      let R = w.startsWith("/") ? (r?.depthAgnostic ? `!**${w}` : `!${w}`) : `!**/${w}`;
      if (!h.has(R)) {
        h.add(R);
        y.push(R);
      }
      if (R.endsWith("/**") && R.length > 4) {
        let sliced = R.slice(0, -3);
        if (sliced !== "!**" && !h.has(sliced)) {
          h.add(sliced);
          y.push(sliced);
        }
      }
    }
  return y;
}
//@ chunk-fq0cr76a.js:890288-890463 layout
function hasUnsafeDenyGlob(patternsByRoot, n) {
  if (n !== undefined) {
    let ripgrepRootSpellings = getRipgrepRootSpellings(n);
    for (let s of new Set(ripgrepRootSpellings))
      for (let h of normalizePatternsToPath(patternsByRoot, s)) if (isGlobUnsafeForRipgrep(h)) return true;
  }
  for (let r of patternsByRoot.values()) for (let s of r) if (isGlobUnsafeForRipgrep(s)) return true;
  return false;
}
//@ chunk-fq0cr76a.js:890463-890534 layout
function isGlobUnsafeForRipgrep(e) {
  return e.includes("[") || e.includes("\\") || /\s$/.test(e);
}
//@ chunk-fq0cr76a.js:890534-890768 layout
function escapeBracesInGlob(e) {
  let n = "";
  let r = false;
  for (let j = 0; j < e.length; j++) {
    let h = e[j];
    if (h === "\\" && j + 1 < e.length) {
      n += h + e[j + 1];
      j++;
      continue;
    }
    if (r) {
      if (h === "]") r = false;
      n += h;
      continue;
    }
    if (h === "[") {
      r = true;
      n += h;
    } else if (h === "{" || h === "}") n += `[${h}]`;
    else n += h;
  }
  return n;
}
//@ chunk-fq0cr76a.js:890768-891205 layout
function resolveRipgrepSpawnCwd(e, rgPath) {
  let cwdOrNull = getCwdOrNull();
  if (cwdOrNull === null) {
    if (!pathModule_2.isAbsolute(e) || !pathModule_2.isAbsolute(rgPath)) throw new NoProjectDirectoryError();
    return pathModule_2.parse(pathModule_2.resolve(e)).root;
  }
  if (!pathModule_2.isAbsolute(e) || !pathModule_2.isAbsolute(rgPath)) return cwdOrNull;
  try {
    if (pathInWorkingPath(e, cwdOrNull)) {
      let sliced = e.slice(0, cwdOrNull.length);
      if (
        sliced !== cwdOrNull &&
        sliced.toLowerCase() === cwdOrNull.toLowerCase() &&
        (e.length === cwdOrNull.length ||
          e[cwdOrNull.length] === pathModule_2.sep ||
          e[cwdOrNull.length] === "/")
      )
        return sliced;
      return cwdOrNull;
    }
  } catch {
    return cwdOrNull;
  }
  let resolved = pathModule_2.resolve(e);
  try {
    if (statSync(resolved).isDirectory()) return resolved;
  } catch {}
  return cwdOrNull;
}
//@ chunk-fq0cr76a.js:891205-891264 layout
/**
 * ripgrepStorageOverride：存储模式下 ripgrep 覆盖值。
 */
function ripgrepStorageOverride(e) {
  return isStorageV5Enabled() && e !== undefined ? (getCwdOrNull() ?? undefined) : undefined;
}
//@ chunk-fq0cr76a.js:891264-891325 layout
var MACOS_PROTECTED_LIBRARY_DIRS = ["Containers", "Group Containers", "Mobile Documents"];
//@ chunk-fq0cr76a.js:891325-891906 layout
/**
 * macOS 下搜索根包含 ~/Library/Containers 等受保护目录时追加排除，避免触发系统授权弹窗。
 */
function addMacosProtectedDirExcludes(e, target, ripgrepSpawnCwd) {
  if (getPlatform() !== "macos") return e;
  try {
    let s = safeRealpath(ripgrepSpawnCwd);
    let h = pathModule_2.isAbsolute(target);
    let y = h ? pathModule_2.resolve(target) : pathModule_2.join(s, target);
    let b = y === s ? s : safeRealpath(y);
    let joined = pathModule_2.join(safeRealpath(homedir()), "Library");
    let flattened = MACOS_PROTECTED_LIBRARY_DIRS.flatMap((R) => {
      let relativePath = pathModule_2.relative(b, pathModule_2.join(joined, R));
      if (!isStrictSubpath(relativePath)) return [];
      let joined_2 = pathModule_2.join(y, relativePath);
      let relativePath_2 = pathModule_2.relative(s, joined_2);
      if (!isStrictSubpath(relativePath_2) && !h) return [];
      return [
        "--glob",
        `!/${(isStrictSubpath(relativePath_2) ? relativePath_2 : joined_2).replace(/[\\*?[\]{}]/g, "\\$&")}`,
      ];
    });
    if (flattened.length === 0) return e;
    logForDebugging(`ripgrep: leaving other apps' data out of the walk of ${b}`);
    return e.includes("--") ? [...flattened, ...e] : [...e, ...flattened];
  } catch (error) {
    logForDebugging(`ripgrep: other apps' data not excluded: ${error}`, {
      level: "error",
    });
    return e;
  }
}
//@ chunk-fq0cr76a.js:891906-891994 layout
function isStrictSubpath(e) {
  return e !== "" && e !== ".." && !e.startsWith(`..${pathModule_2.sep}`) && !pathModule_2.isAbsolute(e);
}
//@ chunk-fq0cr76a.js:891994-894506 fingerprint = ripGrepRaw (0.57)
/**
 * ripGrepRaw：spawn ripgrep，按字节上限收集 stdout/stderr，支持 stdin 管道与继承 fd，macOS 自动排除 ~/Library 受保护目录。
 */
function ripGrepRaw(e, n, signal, s, h = false, cwd, stdin, inheritFd, searchOtherAppsData = false) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  let L = cwd ?? resolveRipgrepSpawnCwd(n, rgPath);
  assertNoNullBytesForRipgrep(e, n, L);
  let V = h ? ["-j", "1"] : [];
  let fullArgs = [...rgArgs, ...V, ...(searchOtherAppsData ? e : addMacosProtectedDirExcludes(e, n, L)), n];
  let q = getPlatform() === "wsl" ? 60000 : 20000;
  let CLAUDE_CODE_GLOB_TIMEOUT_SECONDS = env.CLAUDE_CODE_GLOB_TIMEOUT_SECONDS || 0;
  let J = CLAUDE_CODE_GLOB_TIMEOUT_SECONDS > 0 ? CLAUDE_CODE_GLOB_TIMEOUT_SECONDS * 1000 : q;
  if (argv0 || inheritFd !== undefined) {
    let child = spawn(rgPath, fullArgs, {
      ...(argv0 && {
        argv0,
      }),
      ...(inheritFd !== undefined && {
        stdio: ["pipe", "pipe", "pipe", inheritFd],
      }),
      cwd: L,
      signal,
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    if (stdin && child.stdin) {
      child.stdin.on("error", () => {});
      let Nt = stdin();
      Nt.on("error", (data) => {
        child.kill();
        child.emit(
          "error",
          Object.assign(data, {
            stdinSourceFailed: true,
          }),
        );
      }).pipe(child.stdin);
      child.once("close", () => Nt.destroy());
    }
    let Ne = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES);
    let Ce = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES);
    let Ie;
    let he;
    let ft = false;
    let timeoutId = setTimeout(() => {
      ft = true;
      child.kill("SIGTERM");
      Ie = setTimeout(
        (Nt, Wt) => {
          Wt();
          Nt.kill("SIGKILL");
        },
        5000,
        child,
        mn,
      );
    }, J);
    let ut = false;
    let we = (Nt, Wt, gt) => {
      if (ut) return;
      ut = true;
      clearTimeout(timeoutId);
      clearTimeout(Ie);
      clearTimeout(he);
      s(Nt, Wt, gt);
    };
    let Ae = () => {
      try {
        child.kill(RIPGREP_KILL_SIGNAL);
      } catch {}
    };
    let dt = (error) => {
      if (ut) return;
      Ne.release();
      Ce.release();
      we(toRipgrepOutputError(toError(error)), "", "");
      Ae();
    };
    let Me = () => {
      let Nt = Error("stdout maxBuffer length exceeded");
      Nt.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
      return Nt;
    };
    let Ft = (Nt) => {
      try {
        if (!ut && Ne.append(Nt)) Ae();
      } catch (error) {
        dt(error);
      }
    };
    let xn = (Nt) => {
      try {
        if (!ut) Ce.append(Nt);
      } catch (error) {
        dt(error);
      }
    };
    let mt = (code, Wt) => {
      try {
        if (ut) return;
        let gt = Ne.takeText();
        let jt = Ce.takeText();
        if (code === 0 || code === 1) {
          we(Ne.truncated ? Me() : null, gt, jt);
          return;
        }
        let error = Error(`ripgrep exited with code ${code}${Wt ? ` (signal ${Wt})` : ""}`);
        error.code = code ?? undefined;
        error.signal = Wt ?? (ft ? "SIGTERM" : undefined);
        we(Ne.truncated ? Me() : error, gt, jt);
      } catch (error) {
        dt(error);
      }
    };
    let Mt = (Nt) => {
      try {
        if (ut) return;
        if (Nt.code === "ENOENT") ripgrepStatus().invalidate();
        we(Ne.truncated ? Me() : Nt, Ne.takeText(), Ce.takeText());
      } catch (error) {
        dt(error);
      }
    };
    let mn = () => {
      he = setTimeout(
        (Nt) => {
          logForDebugging("rg did not report close after the timeout kill; the search ends without it", {
            level: "error",
          });
          Nt(null, null);
        },
        RIPGREP_KILL_GRACE_MS,
        mt,
      );
    };
    child.stdout?.on("data", Ft);
    child.stderr?.on("data", xn);
    child.on("close", mt);
    child.on("error", Mt);
    return child;
  }
  let ie = {};
  let ae = false;
  let Se = (me, Ne, Ce) => {
    if (ae) return;
    ae = true;
    clearTimeout(ie.id);
    s(me, Ne, Ce);
  };
  let ue = execFile(
    rgPath,
    fullArgs,
    {
      cwd: L,
      maxBuffer: MAX_RIPGREP_OUTPUT_BYTES,
      signal,
      timeout: J,
      killSignal: RIPGREP_KILL_SIGNAL,
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
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
            Ie.signal = "SIGTERM";
            Ce(Ie, "", "");
          },
          RIPGREP_KILL_GRACE_MS,
          signal,
        );
      },
      J,
      ie,
      Se,
    );
  if (stdin && ue.stdin) {
    ue.stdin.on("error", () => {});
    let me = stdin();
    me.on("error", (err) => {
      ue.kill();
      ue.emit(
        "error",
        Object.assign(err, {
          stdinSourceFailed: true,
        }),
      );
    }).pipe(ue.stdin);
    ue.once("close", () => me.destroy());
  }
  return ue;
}
//@ chunk-fq0cr76a.js:894506-895018 fingerprint = ripGrepFileCount (0.912)
async function ripGrepFileCount(args, target, abortSignal) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, ripgrepSpawnCwd);
    let child = addMacosProtectedDirExcludes(args, target, ripgrepSpawnCwd);
    let D = spawn(rgPath, [...rgArgs, ...child, target], {
      argv0,
      cwd: ripgrepSpawnCwd,
      signal: abortSignal,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      ...cgroupSpawnOptions("helper"),
    });
    let lines = 0;
    D.stdout?.on("data", (chunk) => {
      lines += countCharInString(
        chunk,
        `
`,
      );
    });
    let settled = false;
    D.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0 || code === 1 || code === null) resolve(lines);
      else reject(Error(`rg --files exited ${code}`));
    });
    D.on("error", (err) => {
      if (settled) return;
      settled = true;
      let K = explainRipgrepNotFound(sanitizeSpawnError(err));
      if (err.code === "ENOENT" && argv0) ripgrepStatus().invalidate();
      reject(K);
    });
  });
}
//@ chunk-fq0cr76a.js:895018-895043 layout = killCaffeinate (0.805)
var RIPGREP_KILL_SIGNAL = "SIGKILL";
var RIPGREP_KILL_GRACE_MS = 5000;
//@ chunk-fq0cr76a.js:895043-896024 fingerprint = ripGrepStream (0.631)
/**
 * 流式运行 ripgrep，逐批回调输出行（SIGKILL 结束）。
 */
async function ripGrepStream(args, target, abortSignal, onLines) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, ripgrepSpawnCwd);
    let child = addMacosProtectedDirExcludes(args, target, ripgrepSpawnCwd);
    let O = spawn(rgPath, [...rgArgs, ...child, target], {
      argv0,
      cwd: ripgrepSpawnCwd,
      signal: abortSignal,
      killSignal: RIPGREP_KILL_SIGNAL,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      ...cgroupSpawnOptions("helper"),
    });
    let stripCR = (remainder) => (remainder.endsWith("\r") ? remainder.slice(0, -1) : remainder);
    let V = new StringDecoder("utf8");
    let remainder = "";
    O.stdout?.on("data", (chunk) => {
      let lines = (remainder + V.write(chunk)).split(`
`);
      remainder = lines.pop() ?? "";
      if (lines.length) onLines(lines.map(stripCR));
    });
    let q = false;
    let Z;
    O.on("close", (code) => {
      clearTimeout(Z);
      if (q) return;
      if (abortSignal.aborted) {
        q = true;
        resolve("aborted");
        return;
      }
      q = true;
      remainder += V.end();
      if (code === 0 || code === 1) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("complete");
      } else if (code === 2) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("error-exit-2");
      } else if (code === null) resolve("external-kill");
      else reject(Error(`ripgrep exited with code ${code}`));
    });
    O.on("error", (err) => {
      if (q) return;
      if (err.code === "ABORT_ERR" || err.name === "AbortError") {
        if (O.pid === undefined) {
          q = true;
          resolve("aborted");
          return;
        }
        Z = setTimeout(() => {
          if (!q) {
            q = true;
            resolve("aborted");
          }
        }, RIPGREP_KILL_GRACE_MS);
        Z.unref?.();
        return;
      }
      q = true;
      let ie = explainRipgrepNotFound(sanitizeSpawnError(err));
      if (err.code === "ENOENT" && argv0) ripgrepStatus().invalidate();
      reject(ie);
    });
  });
}
//@ chunk-fq0cr76a.js:896024-896386 layout
/**
 * 在 lexical 与 canonical 路径前缀间互换，得到同一路径的另一种拼写（deny 规则匹配用）。
 */
function getAlternateRootSpellings(e, n) {
  if (n.lexical === n.canonical) return [];
  let r = n.canonical.endsWith(sep) ? n.canonical : n.canonical + sep;
  let s = n.lexical.endsWith(sep) ? n.lexical : n.lexical + sep;
  let h = [];
  if (isSearchResultRootRespellEnabled()) {
    if (e === n.lexical) h.push(n.canonical);
    else if (e.startsWith(s)) h.push(r + e.slice(s.length));
  }
  if (e === n.canonical) h.push(n.lexical);
  else if (e.startsWith(r)) h.push(s + e.slice(r.length));
  return h;
}
//@ chunk-fq0cr76a.js:896386-899328 fingerprint = ripGrep (0.505)
/**
 * 运行 ripgrep 并返回行数组：首次使用时自检；处理超时（WSL 60s、其他 20s，可由 CLAUDE_CODE_GLOB_TIMEOUT_SECONDS 覆盖）、资源耗尽重试、输出超限。
 */
async function ripGrep_2(args, n, signal, s) {
  ripgrepStatus()
    .testOnFirstUse()
    .catch((error) => {
      logError(error);
    });
  return new Promise((resolve, reject) => {
    let handleResult = (error, stdout, stderr, isRetry) => {
      if (!error) {
        if (s?.rejectOnPartial && stdout.length >= MAX_RIPGREP_OUTPUT_BYTES) {
          reject(new RipgrepTimeoutError("Ripgrep output exceeded the output buffer and was truncated.", []));
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
        logForDebugging("rg EAGAIN error detected, retrying with single-threaded mode (-j 1)");
        logEvent("tengu_ripgrep_eagain_retry", {});
        try {
          s?.beforeSpawn?.();
          ripGrepRaw(
            args,
            n,
            signal,
            (retryError, retryStdout, retryStderr) => {
              S(retryError, retryStdout, retryStderr, true);
            },
            true,
            s?.cwd,
            s?.stdin,
            s?.inheritFd,
            s?.searchOtherAppsData,
          );
        } catch (error) {
          reject(RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "thrown") ?? toError(error));
        }
        return;
      }
      let hasOutput = stdout && stdout.trim().length > 0;
      let q = error.signal === "SIGTERM" || error.signal === "SIGKILL" || error.code === "ABORT_ERR";
      let Z =
        error.code === undefined && (error.signal === undefined || BENIGN_KILL_SIGNALS.has(error.signal));
      let lines = [];
      if (hasOutput) {
        lines = s?.rawLines
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
              .filter(Boolean);
        if (lines.length > 0 && (q || V || Z))
          lines = s?.rawLines ? dropIncompleteLastLine(lines, stdout) : lines.slice(0, -1);
      }
      logForDebugging(
        `rg error (signal=${error.signal}, code=${error.code}, stderr: ${stderr}), ${lines.length} results`,
      );
      if (s?.rejectOnPartial && (q || V || Z)) {
        reject(
          signal.aborted && signal.reason?.name !== "TimeoutError"
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
        lines.every((line) => line.endsWith('"type":"summary"}')) &&
        stderr.startsWith(`rg: ${n}: `) &&
        !stderr.trimEnd().includes(`
`)
      ) {
        let ae = Number(/\(os error (\d+)\)\s*$/.exec(stderr)?.[1]);
        let Se =
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
      if (s?.rejectOnInputError && "stdinSourceFailed" in error && error.stdinSourceFailed === true) {
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
              ? signal.aborted
                ? createRipgrepAbortError(signal)
                : new RipgrepAbnormalExitError()
              : undefined;
          logError(
            withTelemetryChildExitStatus(
              withTelemetryMessage(toError(error), "ripgrep unexpected exit (signal or unmodeled code)"),
              typeof error.code === "number" &&
                !signal.aborted &&
                !("stdinSourceFailed" in error) &&
                !(error instanceof DOMException)
                ? error.code
                : undefined,
            ),
          );
          if (Se !== undefined) {
            reject(Se);
            return;
          }
        }
      }
      let ie =
        lines.length === 0
          ? RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "emitted")
          : undefined;
      if (ie) {
        reject(ie);
        return;
      }
      if (V && lines.length === 0 && s?.rejectOnInputError) {
        reject(new RipgrepOutputTooLargeError(error.message.startsWith("stderr") ? "stderr" : "stdout"));
        return;
      }
      if (q && lines.length === 0) {
        reject(createRipgrepAbortError(signal));
        return;
      }
      resolve(lines);
    };
    let S = (error, stdout, stderr, isRetry) => {
      try {
        handleResult(error, stdout, stderr, isRetry);
      } catch (error) {
        reject(error instanceof RangeError ? toRipgrepOutputError(error) : toError(error));
      }
    };
    try {
      s?.beforeSpawn?.();
      ripGrepRaw(
        args,
        n,
        signal,
        (error, stdout, stderr) => {
          S(error, stdout, stderr, false);
        },
        false,
        s?.cwd,
        s?.stdin,
        s?.inheritFd,
        s?.searchOtherAppsData,
      );
    } catch (error) {
      reject(RipgrepSpawnResourceError.from(error, s?.rejectOnInputError, "thrown") ?? error);
    }
  });
}
//@ chunk-fq0cr76a.js:899328-899388 layout
/**
 * 统计目录文件数（四舍五入），委托给 ripgrep 状态对象。
 */
function countFilesRounded(e, n, r = []) {
  return ripgrepStatus().countFilesRounded(e, n, r);
}
//@ chunk-fq0cr76a.js:899388-899763 fingerprint = countFilesRoundedRg (0.852)
/**
 * 用 rg --files --hidden 统计目录文件数（家目录本身或其祖先时跳过）。
 */
async function countFilesRoundedRg(dirPath, abortSignal, ignorePatterns) {
  let relativePath = pathModule_2.relative(safeRealpath(dirPath), safeRealpath(homedir()));
  if (relativePath === "" || isStrictSubpath(relativePath)) return;
  try {
    let h;
    let y = null;
    {
      let args = ["--files", "--hidden"];
      ignorePatterns.forEach((pattern) => {
        args.push("--glob", `!${pattern}`);
      });
      h = await ripGrepFileCount(args, dirPath, abortSignal);
    }
    if (h === 0) return 0;
    let magnitude = Math.floor(Math.log10(h));
    let power = Math.pow(10, magnitude);
    return Math.round(h / power) * power;
  } catch (error) {
    if (error?.name !== "AbortError")
      logForDebugging(`countFilesRoundedRg failed: ${error}`, {
        level: "error",
      });
  }
}
//@ chunk-fq0cr76a.js:899763-899859 layout = getRipgrepStatus (1)
/**
 * ripgrep 状态：模式、路径、是否可用。
 */
function getRipgrepStatus_2() {
  let config = ideDiffSupport();
  return {
    mode: config.mode,
    path: config.command,
    working: ripgrepStatus().status?.working ?? null,
  };
}
//@ chunk-fq0cr76a.js:899859-900715 fingerprint = testRipgrepOnFirstUse (0.902)
/**
 * 首次使用时运行 rg --version 自检并记录可用性。
 */
async function testRipgrepOnFirstUse() {
  let config = ripgrepStatus();
  if (config.status !== null) return;
  if (isDisklessSession()) return;
  let config_2 = ideDiffSupport();
  try {
    let test;
    if (config_2.argv0) {
      let proc = Bun.spawn([config_2.command, "--version"], {
        argv0: config_2.argv0,
        cwd: getCwd(),
        stderr: "ignore",
        stdout: "pipe",
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
      });
      let [stdout, code] = await Promise.all([proc.stdout.text(), proc.exited]);
      test = {
        code,
        stdout,
      };
    } else
      test = await execFileNoThrow(config_2.command, [...config_2.args, "--version"], {
        timeout: 5000,
      });
    let working = test.code === 0 && !!test.stdout && test.stdout.startsWith("ripgrep ");
    config.setStatus({
      working,
      lastTested: Date.now(),
      config: config_2,
    });
    logForDebugging(
      `Ripgrep first use test: ${working ? "PASSED" : "FAILED"} (mode=${config_2.mode}, path=${config_2.command})`,
    );
    logEvent("tengu_ripgrep_availability", {
      working: working ? 1 : 0,
      using_system: config_2.mode === "system" ? 1 : 0,
    });
  } catch (error) {
    config.setStatus({
      working: false,
      lastTested: Date.now(),
      config: config_2,
    });
    logForDebugging(
      `Ripgrep first use test threw (mode=${config_2.mode}, path=${config_2.command}): ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
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
  for (let j = 0; j < parts.length; j++) {
    let S = j === 0 || r === "nul" ? parts[j] : parts[j].replace(/^\n/, "");
    if (S !== "") h.push(S);
  }
  return h;
}
//@ chunk-aqdf5t3e.js:8562-8617 fingerprint = getRipgrepStatus (1)
/**
 * 订阅 ripgrep 可用状态变化。
 */
function getRipgrepStatus(e, n) {
  return presenceStores.of(e).working.subscribe(n);
}
export {
  getRipgrepStatus,
  ripGrep_2,
  resolveRipgrepSpawnCwd,
  ripgrepCommand,
  countFilesRounded,
  ripGrepStream,
  ripgrepStorageOverride,
  RipgrepTimeoutError,
  resolveRipgrepTarget,
  buildDenyRuleGlobs,
  getRipgrepDisplayRoot,
  assertDenyGlobsUnchanged,
  splitNulDelimitedOutput,
  hasUnsafeDenyGlob,
  mapRipgrepOutputPath,
  getAlternateRootSpellings,
  ripgrepStatus,
  getRipgrepStatus_2,
};
