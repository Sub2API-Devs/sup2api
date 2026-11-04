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
import { deferInit } from "../../runtime/deferred-init.js";

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
    let cacheKey = `${dirPath}|${ignorePatterns.join(",")}`;
    let count = this.roundedFileCounts.get(cacheKey);
    if (count === undefined) {
      count = countFilesRoundedRg(dirPath, abortSignal, ignorePatterns);
      this.roundedFileCounts.set(cacheKey, count);
    }
    return count;
  }
  setStatus(status) {
    this.#e = status;
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
var ripgrepStatusSlot; // deferred: uses RipgrepStatus of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:878480", () => {
  ripgrepStatusSlot = new HostScoped(() => new RipgrepStatus());
});
//@ chunk-fq0cr76a.js:878506-878544 placement
/**
 * ripgrepStatus：当前宿主的 ripgrep 状态。
 */
function ripgrepStatus() {
  return ripgrepStatusSlot.of(getRootSession().host);
}
//@ chunk-fq0cr76a.js:878582-878972 fingerprint (2.1.88 match: getRipgrepConfig, 0.659)
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
    let embeddedConfig = {
      mode: "embedded",
      command: process.execPath,
      args: ["--no-config"],
      argv0: "rg",
    };
    if (bunWhichSync(process.execPath)) return embeddedConfig;
    let { cmd } = findExecutable("rg", []);
    if (cmd !== "rg")
      return {
        mode: "system",
        command: cmd,
        args: [],
      };
    return embeddedConfig;
  }
  let { cmd: systemPath } = findExecutable("rg", []);
  return {
    mode: "system",
    command: systemPath,
    args: [],
  };
}
//@ chunk-fq0cr76a.js:878972-879215 layout
var RIPGREP_NOT_FOUND_MESSAGE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SPAWN_SYSCALLS;
deferInit("chunk-fq0cr76a.js:878972", () => {
  RIPGREP_NOT_FOUND_MESSAGE =
    "ripgrep not found on PATH. Install it (brew install ripgrep / apt install ripgrep / winget install BurntSushi.ripgrep.MSVC) or use the native claude binary which embeds it.";
  SPAWN_SYSCALLS = new Set(["spawn", "spawnSync", "posix_spawn", "uv_spawn"]);
});
//@ chunk-fq0cr76a.js:879215-879735 layout
/**
 * 净化 spawn 错误：去掉可能含路径的 cmd/spawnargs 等字段，只保留 name/message/code/errno 与白名单 syscall。
 */
function sanitizeSpawnError(error) {
  if ("stdinSourceFailed" in error && error.stdinSourceFailed === true) {
    Reflect.deleteProperty(error, "cmd");
    Reflect.deleteProperty(error, "spawnargs");
    return error;
  }
  let { name, message, stack, code, errno, path, syscall } = error;
  let syscallName = typeof syscall === "string" ? /^[A-Za-z_]+/.exec(syscall)?.[0] : undefined;
  let merged = Object.assign(Error(message), {
    name,
    stack,
    ...(code !== undefined && {
      code,
    }),
    ...(typeof errno === "number" && {
      errno,
    }),
    ...(syscallName !== undefined &&
      SPAWN_SYSCALLS.has(syscallName) && {
        syscall: syscallName,
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
function explainRipgrepNotFound(error) {
  if (error.code === "ENOENT" && ideDiffSupport().mode === "system") {
    let wrapped = Error(RIPGREP_NOT_FOUND_MESSAGE, {
      cause: error,
    });
    wrapped.code = "ENOENT";
    return wrapped;
  }
  return error;
}
//@ chunk-fq0cr76a.js:879855-879933 fingerprint (2.1.88 match: ripgrepCommand, 1)
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
  append(buffer) {
    if (this.truncated) return false;
    let remaining = this.maxBytes - this.byteLength;
    let fits = buffer.length <= remaining;
    let slice = fits ? buffer : buffer.subarray(0, remaining);
    this.byteLength += slice.length;
    for (let offset = 0; offset < slice.length; offset += RIPGREP_HEAD_BYTES)
      this.pieces.push(this.decoder.write(slice.subarray(offset, offset + RIPGREP_HEAD_BYTES)));
    if (!fits) this.truncated = true;
    return !fits;
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
var BENIGN_KILL_SIGNALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:880858", () => {
  BENIGN_KILL_SIGNALS = new Set(["SIGHUP", "SIGINT", "SIGPIPE"]);
});
//@ chunk-fq0cr76a.js:880905-881001 fingerprint (2.1.88 match: isEagainError, 1)
function isEagainError(stderr) {
  return stderr.includes("os error 11") || stderr.includes("Resource temporarily unavailable");
}
//@ chunk-fq0cr76a.js:881001-881055 layout
/**
 * 资源耗尽类错误码（EAGAIN/ENOMEM/EMFILE/ENFILE），遇到时以 -j 1 单线程重试。
 */
var RESOURCE_EXHAUSTION_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:881001", () => {
  RESOURCE_EXHAUSTION_CODES = new Set(["EAGAIN", "ENOMEM", "EMFILE", "ENFILE"]);
});
//@ chunk-fq0cr76a.js:881055-881175 fingerprint (2.1.88 match: RipgrepTimeoutError, 0.773)
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
function createRipgrepAbortError(signal) {
  if (signal.aborted && signal.reason?.name !== "TimeoutError") return new AbortError();
  return new RipgrepTimeoutError(
    `Ripgrep search timed out after ${getPlatform() === "wsl" ? 60 : 20} seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.`,
    [],
  );
}
//@ chunk-fq0cr76a.js:881443-881948 layout
let RipgrepAbnormalExitError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:881443", () => {
  RipgrepAbnormalExitError = class RipgrepAbnormalExitError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(
        'The search failed, so this is not a "no matches" result: matches may exist. What happened to the search program (ripgrep) is not known, and no results were read. Run the search once more. If it fails again, tell the user that searches are failing. Do not run a recursive search in the shell instead (for example grep -r, find or rg): it can reach what this tool is set to leave out.',
        "ripgrep unexpected exit with no results",
      );
      this.name = "RipgrepAbnormalExitError";
    }
  };
});
//@ chunk-fq0cr76a.js:881948-882081 layout
var RIPGREP_USAGE_ERROR_RE =
  /^rg: (?:regex parse error|error parsing glob|unrecognized file type|error parsing flag|compiled regex exceeds size limit)/m;
//@ chunk-fq0cr76a.js:882081-882321 layout
let RipgrepUsageError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:882081", () => {
  RipgrepUsageError = class RipgrepUsageError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(stderr) {
      super(
        `Search failed \u2014 ripgrep rejected the pattern, glob, or file type without searching:
${truncateToLength(stderr.trim(), 2000)}`,
        "ripgrep usage error (input rejected, stderr redacted)",
      );
      this.name = "RipgrepUsageError";
    }
  };
});
//@ chunk-fq0cr76a.js:882321-882415 layout
var NO_SHELL_SEARCH_FALLBACK =
  "Do not run a recursive search in the shell instead (for example grep -r, find or rg)";
//@ chunk-fq0cr76a.js:882415-883111 layout
let RipgrepTargetUnreadableError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:882415", () => {
  RipgrepTargetUnreadableError = class RipgrepTargetUnreadableError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(osError) {
      let isWindows = getPlatform() === "windows";
      let permissionDenied = isWindows
        ? osError === WIN_ERROR_ACCESS_DENIED
        : osError === EACCES_CODE || osError === EPERM_CODE;
      let reason = permissionDenied
        ? "permission denied"
        : !isWindows && osError === EIO_CODE
          ? "input/output error"
          : !isWindows && osError === ENOENT_CODE
            ? "the file Claude Code opened was not passed to ripgrep"
            : "an operating system error";
      let advice = permissionDenied
        ? `Tell the user that the path could not be read. ${NO_SHELL_SEARCH_FALLBACK}.`
        : `Run the search once more. If it fails again, tell the user that the search is failing. ${NO_SHELL_SEARCH_FALLBACK}: it can also reach other files, which this tool is set to leave out.`;
      super(
        `Search failed: ripgrep could not read the path it was given (${reason}, os error ${osError}), so nothing was searched. This is not a "no matches" result. ${advice}`,
        "ripgrep could not read its target",
      );
      this.name = "RipgrepTargetUnreadableError";
    }
  };
});
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
let RipgrepOutputTooLargeError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:883164", () => {
  RipgrepOutputTooLargeError = class RipgrepOutputTooLargeError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(stream) {
      super(
        stream === "stdout"
          ? `Ripgrep output passed the ${MAX_RIPGREP_OUTPUT_BYTES / 1e6}MB limit before a single complete line was read, so there are no usable results: at least one matching line is extremely long. Try a more specific pattern or path, or exclude very large files.`
          : `Ripgrep produced more than ${MAX_RIPGREP_OUTPUT_BYTES / 1e6}MB of error output (for example per-file permission warnings) before any result line, so the search is incomplete. Try a more specific path.`,
        "ripgrep output over cap before first complete line",
      );
      this.name = "RipgrepOutputTooLargeError";
    }
  };
});
//@ chunk-fq0cr76a.js:883720-884378 layout
/**
 * ripgrep 启动失败的 errno → {reason, advice} 文案表（EAGAIN、ENOMEM、EMFILE、ENFILE…）。
 */
var SPAWN_FAILURE_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_SPAWN_FAILURE_REASON;
deferInit("chunk-fq0cr76a.js:883720", () => {
  SPAWN_FAILURE_REASONS = new Map([
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
  DEFAULT_SPAWN_FAILURE_REASON = {
    reason: "the system ran out of a resource",
    advice: "this machine is short of a resource needed to start programs",
  };
});
//@ chunk-fq0cr76a.js:884378-885017 layout
let RipgrepSpawnResourceError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:884378", () => {
  RipgrepSpawnResourceError = class RipgrepSpawnResourceError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(errnoCode) {
      let { reason, advice } = SPAWN_FAILURE_REASONS.get(errnoCode) ?? DEFAULT_SPAWN_FAILURE_REASON;
      super(
        `ripgrep could not start, so nothing was searched and matches may still exist: the operating system could not start it because ${reason} (${errnoCode}). Retry in a moment. If it keeps failing, tell the user that ${advice}.`,
        "ripgrep not started: the OS could not create another process",
        `rg_spawn_${errnoCode.toLowerCase()}`,
      );
      this.name = "RipgrepSpawnResourceError";
    }
    static from(error, rejectOnInputError, stage) {
      if (!rejectOnInputError) return;
      let errnoCode = getErrnoCode(error);
      let fromSpawn =
        error instanceof Error &&
        "syscall" in error &&
        typeof error.syscall === "string" &&
        error.syscall.startsWith("spawn");
      let resourceShaped = stage === "emitted" || isSadFsErrno(error) || isEnvFsErrno(error);
      return errnoCode !== undefined &&
        RESOURCE_EXHAUSTION_CODES.has(errnoCode) &&
        fromSpawn &&
        resourceShaped
        ? new RipgrepSpawnResourceError(errnoCode)
        : undefined;
    }
  };
});
//@ chunk-fq0cr76a.js:885017-885068 layout
class RipgrepNullByteError extends Error {
  name = "RipgrepNullByteError";
}
//@ chunk-fq0cr76a.js:885068-885549 layout
/**
 * ripgrep 启动前检查 cwd、目标路径与参数里没有 \0，否则抛 RipgrepNullByteError（附遥测说明）。
 */
function assertNoNullBytesForRipgrep(args, target, spawnCwd) {
  let index = args.findIndex((arg) => arg.includes("\x00"));
  let nullByteSource = spawnCwd.includes("\x00")
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
  if (nullByteSource)
    throw withTelemetryMessage(
      new RipgrepNullByteError(`Cannot spawn ripgrep: ${nullByteSource.local} contains a null byte (\\0)`),
      nullByteSource.telemetry,
    );
}
//@ chunk-fq0cr76a.js:885549-885666 layout (2.1.88 match: isRealPathWithinTeamDir, 1)
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
async function resolveRipgrepTarget(realCandidate, allowedSpellings) {
  assertNoNullBytesForRipgrep([], realCandidate, getCwd());
  let platform = getPlatform();
  let allowedSet = new Set(allowedSpellings);
  let refuse = () =>
    new SymlinkReadRefusedError(
      `Refusing to search ${realCandidate}: its symlink resolution changed after permission was checked. If a link in the working directory is being rewritten concurrently, stop that and retry.`,
    );
  let recheckPermissions = () => {
    let check = walkPermissionCheckPaths(realCandidate);
    if (check.unresolved || check.spellings.some((spelling) => !allowedSet.has(spelling))) throw refuse();
  };
  recheckPermissions();
  let canonicalPath = () => {
    let resolved = safeResolvePath(getFsImplementation(), realCandidate);
    if (!resolved.isCanonical) throw refuse();
    return resolved.resolvedPath;
  };
  let rgPathIsRelative = !pathModule_2.isAbsolute(ripgrepCommand().rgPath);
  let refuseRelativeRg = () => {
    throw new SymlinkReadRefusedError(
      `Refusing to search ${realCandidate}: ripgrep was found only by name on PATH, and a search outside the working directory cannot apply your Read deny rules in that configuration. Install ripgrep at an absolute path or search under the working directory.`,
    );
  };
  let buildTarget = async (canonical = realCandidate) => {
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(realCandidate, ripgrepCommand().rgPath);
    if (rgPathIsRelative && !pathInWorkingPath(realCandidate, ripgrepSpawnCwd)) refuseRelativeRg();
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
      recheckBeforeSpawn: recheckPermissions,
      recheckByPath: recheckPermissions,
      close: async () => {},
    };
  };
  if ((isUncOrDevicePath(realCandidate) && !isWslUncPath(realCandidate)) || isNetworkMountPath(realCandidate))
    return buildTarget();
  if (platform === "windows") {
    let resolvedTarget = safeResolvePath(getFsImplementation(), realCandidate);
    if (!resolvedTarget.isCanonical) {
      if (resolvedTarget.isSymlink) {
        if (
          allowedSet.has(resolvedTarget.resolvedPath) &&
          isUncOrDevicePath(resolvedTarget.resolvedPath) &&
          !isWslUncPath(resolvedTarget.resolvedPath)
        )
          return buildTarget(resolvedTarget.resolvedPath);
        throw refuse();
      }
      if (!(await pathExistsStat(realCandidate))) return null;
      throw refuse();
    }
    let resolvedPath = resolvedTarget.resolvedPath;
    if (!allowedSet.has(resolvedPath)) throw refuse();
    let recheck = () => {
      recheckPermissions();
      if (canonicalPath() !== resolvedPath) throw refuse();
    };
    let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(resolvedPath, ripgrepCommand().rgPath);
    let isDirectory;
    try {
      isDirectory = (await stat(resolvedPath)).isDirectory();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
      if (errnoCode === "EACCES" || errnoCode === "EPERM") throw refuse();
      throw error;
    }
    if (isDirectory && rgPathIsRelative && !pathInWorkingPath(resolvedPath, ripgrepSpawnCwd))
      refuseRelativeRg();
    return {
      lexical: realCandidate,
      canonical: resolvedPath,
      spawnCwd: ripgrepSpawnCwd,
      target: resolvedPath,
      relativeOutput: false,
      isDirectory,
      recheckBeforeSpawn: recheck,
      recheckByPath: recheck,
      close: async () => {},
    };
  }
  let handle;
  try {
    handle = await open(realCandidate, constants.O_RDONLY | constants.O_NONBLOCK);
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
    let stats = await handle.stat();
    let procFdPath = null;
    if (platform === "linux" || platform === "wsl")
      try {
        procFdPath = await readlink(`/proc/self/fd/${handle.fd}`);
      } catch {}
    let viaProcFd = procFdPath !== null;
    let canonicalTarget = procFdPath ?? canonicalPath();
    if (!allowedSet.has(canonicalTarget)) throw refuse();
    let openHandle = handle;
    let checkUnchanged = () => {
      recheckPermissions();
      if (canonicalPath() !== canonicalTarget) throw refuse();
    };
    let recheckBeforeSpawn = viaProcFd ? () => {} : checkUnchanged;
    if (stats.isDirectory())
      try {
        await access(viaProcFd ? `/proc/self/fd/${openHandle.fd}` : canonicalTarget, constants.X_OK);
      } catch {
        throw new SymlinkReadRefusedError(
          `Cannot search ${realCandidate}: the directory is not traversable (no execute permission).`,
        );
      }
    if (stats.isDirectory() && pathModule_2.isAbsolute(ripgrepCommand().rgPath))
      return {
        lexical: realCandidate,
        canonical: canonicalTarget,
        spawnCwd: viaProcFd ? `/proc/self/fd/${openHandle.fd}` : canonicalTarget,
        target: ".",
        relativeOutput: true,
        isDirectory: true,
        recheckBeforeSpawn,
        recheckByPath: checkUnchanged,
        close: () => openHandle.close(),
      };
    if (stats.isDirectory()) {
      let ripgrepSpawnCwd = resolveRipgrepSpawnCwd(canonicalTarget, ripgrepCommand().rgPath);
      if (!pathInWorkingPath(canonicalTarget, ripgrepSpawnCwd)) refuseRelativeRg();
      return {
        lexical: realCandidate,
        canonical: canonicalTarget,
        spawnCwd: ripgrepSpawnCwd,
        target: canonicalTarget,
        relativeOutput: false,
        isDirectory: true,
        recheckBeforeSpawn: checkUnchanged,
        recheckByPath: checkUnchanged,
        close: () => openHandle.close(),
      };
    }
    return {
      lexical: realCandidate,
      canonical: canonicalTarget,
      spawnCwd: resolveRipgrepSpawnCwd(canonicalTarget, ripgrepCommand().rgPath),
      target: viaProcFd ? INHERITED_FD_PATH : canonicalTarget,
      inheritFd: viaProcFd ? openHandle.fd : undefined,
      relativeOutput: false,
      isDirectory: false,
      recheckBeforeSpawn,
      recheckByPath: checkUnchanged,
      close: () => openHandle.close(),
    };
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}
//@ chunk-fq0cr76a.js:888681-889078 layout
/**
 * 把 ripgrep 输出的路径映射回用户给出的词法路径（处理规范化目录、相对输出）。
 */
function mapRipgrepOutputPath(outputPath, target) {
  if (!target.isDirectory && outputPath === target.target) return target.lexical;
  if (pathModule_2.isAbsolute(outputPath)) {
    for (let rootPath of [target.target, target.canonical]) {
      let rootWithSep = rootPath.endsWith(pathModule_2.sep) ? rootPath : rootPath + pathModule_2.sep;
      if (outputPath.startsWith(rootWithSep) && rootPath !== target.lexical)
        return pathModule_2.join(target.lexical, outputPath.slice(rootWithSep.length));
    }
    return outputPath;
  }
  if (target.relativeOutput) {
    let relative = outputPath.startsWith("./") ? outputPath.slice(2) : outputPath;
    return relative === "." || relative === ""
      ? target.lexical + (outputPath.endsWith("/") ? pathModule_2.sep : "")
      : pathModule_2.join(target.lexical, relative);
  }
  return outputPath;
}
//@ chunk-fq0cr76a.js:889078-889319 layout
/**
 * 搜索准备期间 Read 拒绝规则对应路径发生变化时拒绝搜索（防竞态）。
 */
function assertDenyGlobsUnchanged(patternsByRoot, target, expectedGlobs, options) {
  let denyRuleGlobs = buildDenyRuleGlobs(patternsByRoot, target, options);
  if (
    denyRuleGlobs.length !== expectedGlobs.length ||
    denyRuleGlobs.some((denyRuleGlob, index) => denyRuleGlob !== expectedGlobs[index])
  )
    throw new SymlinkReadRefusedError(
      `Refusing to search ${target.lexical}: a path one of its Read deny rules is written through changed while the search was being prepared. Retry.`,
    );
}
//@ chunk-fq0cr76a.js:889319-889439 layout
function getRipgrepRootSpellings(target) {
  return uniq(
    target.relativeOutput || target.spawnCwd === target.canonical
      ? [target.canonical, target.lexical]
      : [target.spawnCwd, safeRealpath(target.spawnCwd)],
  );
}
//@ chunk-fq0cr76a.js:889439-889532 layout
function getRipgrepDisplayRoot(target) {
  return target.relativeOutput || target.spawnCwd === target.canonical
    ? target.canonical
    : safeRealpath(target.spawnCwd);
}
//@ chunk-fq0cr76a.js:889532-889581 layout
function safeRealpath(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
//@ chunk-fq0cr76a.js:889581-890288 layout
/**
 * 把 Read 拒绝规则转成 ripgrep 的 !glob 排除参数；规则覆盖整个搜索目标时返回 ["!**"]。
 */
function buildDenyRuleGlobs(patternsByRoot, target, options) {
  let ripgrepRootSpellings = getRipgrepRootSpellings(target);
  let seenGlobs = new Set();
  let globs = [];
  if (target.isDirectory)
    for (let rootPath of new Set([...ripgrepRootSpellings, target.canonical, target.lexical]))
      for (let [baseDir, patterns] of patternsByRoot) {
        let relativePath = pathModule_2.relative(baseDir ?? getCwd(), rootPath);
        if (
          relativePath === "" ||
          relativePath === ".." ||
          relativePath.startsWith(`..${pathModule_2.sep}`) ||
          pathModule_2.isAbsolute(relativePath)
        )
          continue;
        let replaced = relativePath.replaceAll("\\", "/");
        let ignore = pathModule.default().add(patterns);
        if (ignore.ignores(replaced) || ignore.ignores(replaced + "/")) return ["!**"];
      }
  for (let rootPath of new Set(ripgrepRootSpellings))
    for (let pattern of normalizePatternsToPath(patternsByRoot, rootPath)) {
      if (pattern.includes("[")) continue;
      let escaped = escapeBracesInGlob(pattern);
      if (escaped === "/" || escaped === "") {
        if (!seenGlobs.has("!**")) {
          seenGlobs.add("!**");
          globs.push("!**");
        }
        continue;
      }
      let glob = escaped.startsWith("/")
        ? options?.depthAgnostic
          ? `!**${escaped}`
          : `!${escaped}`
        : `!**/${escaped}`;
      if (!seenGlobs.has(glob)) {
        seenGlobs.add(glob);
        globs.push(glob);
      }
      if (glob.endsWith("/**") && glob.length > 4) {
        let sliced = glob.slice(0, -3);
        if (sliced !== "!**" && !seenGlobs.has(sliced)) {
          seenGlobs.add(sliced);
          globs.push(sliced);
        }
      }
    }
  return globs;
}
//@ chunk-fq0cr76a.js:890288-890463 layout
function hasUnsafeDenyGlob(patternsByRoot, target) {
  if (target !== undefined) {
    let ripgrepRootSpellings = getRipgrepRootSpellings(target);
    for (let rootPath of new Set(ripgrepRootSpellings))
      for (let pattern of normalizePatternsToPath(patternsByRoot, rootPath))
        if (isGlobUnsafeForRipgrep(pattern)) return true;
  }
  for (let patterns of patternsByRoot.values())
    for (let pattern of patterns) if (isGlobUnsafeForRipgrep(pattern)) return true;
  return false;
}
//@ chunk-fq0cr76a.js:890463-890534 layout
function isGlobUnsafeForRipgrep(pattern) {
  return pattern.includes("[") || pattern.includes("\\") || /\s$/.test(pattern);
}
//@ chunk-fq0cr76a.js:890534-890768 layout
function escapeBracesInGlob(glob) {
  let escaped = "";
  let inClass = false;
  for (let j = 0; j < glob.length; j++) {
    let char = glob[j];
    if (char === "\\" && j + 1 < glob.length) {
      escaped += char + glob[j + 1];
      j++;
      continue;
    }
    if (inClass) {
      if (char === "]") inClass = false;
      escaped += char;
      continue;
    }
    if (char === "[") {
      inClass = true;
      escaped += char;
    } else if (char === "{" || char === "}") escaped += `[${char}]`;
    else escaped += char;
  }
  return escaped;
}
//@ chunk-fq0cr76a.js:890768-891205 layout
function resolveRipgrepSpawnCwd(target, rgPath) {
  let cwdOrNull = getCwdOrNull();
  if (cwdOrNull === null) {
    if (!pathModule_2.isAbsolute(target) || !pathModule_2.isAbsolute(rgPath))
      throw new NoProjectDirectoryError();
    return pathModule_2.parse(pathModule_2.resolve(target)).root;
  }
  if (!pathModule_2.isAbsolute(target) || !pathModule_2.isAbsolute(rgPath)) return cwdOrNull;
  try {
    if (pathInWorkingPath(target, cwdOrNull)) {
      let sliced = target.slice(0, cwdOrNull.length);
      if (
        sliced !== cwdOrNull &&
        sliced.toLowerCase() === cwdOrNull.toLowerCase() &&
        (target.length === cwdOrNull.length ||
          target[cwdOrNull.length] === pathModule_2.sep ||
          target[cwdOrNull.length] === "/")
      )
        return sliced;
      return cwdOrNull;
    }
  } catch {
    return cwdOrNull;
  }
  let resolved = pathModule_2.resolve(target);
  try {
    if (statSync(resolved).isDirectory()) return resolved;
  } catch {}
  return cwdOrNull;
}
//@ chunk-fq0cr76a.js:891205-891264 layout
/**
 * ripgrepStorageOverride：存储模式下 ripgrep 覆盖值。
 */
function ripgrepStorageOverride(target) {
  return isStorageV5Enabled() && target !== undefined ? (getCwdOrNull() ?? undefined) : undefined;
}
//@ chunk-fq0cr76a.js:891264-891325 layout
var MACOS_PROTECTED_LIBRARY_DIRS = ["Containers", "Group Containers", "Mobile Documents"];
//@ chunk-fq0cr76a.js:891325-891906 layout
/**
 * macOS 下搜索根包含 ~/Library/Containers 等受保护目录时追加排除，避免触发系统授权弹窗。
 */
function addMacosProtectedDirExcludes(args, target, spawnCwd) {
  if (getPlatform() !== "macos") return args;
  try {
    let realSpawnCwd = safeRealpath(spawnCwd);
    let targetAbsolute = pathModule_2.isAbsolute(target);
    let absTarget = targetAbsolute ? pathModule_2.resolve(target) : pathModule_2.join(realSpawnCwd, target);
    let realTarget = absTarget === realSpawnCwd ? realSpawnCwd : safeRealpath(absTarget);
    let joined = pathModule_2.join(safeRealpath(homedir()), "Library");
    let flattened = MACOS_PROTECTED_LIBRARY_DIRS.flatMap((dirName) => {
      let relativePath = pathModule_2.relative(realTarget, pathModule_2.join(joined, dirName));
      if (!isStrictSubpath(relativePath)) return [];
      let joined_2 = pathModule_2.join(absTarget, relativePath);
      let relativePath_2 = pathModule_2.relative(realSpawnCwd, joined_2);
      if (!isStrictSubpath(relativePath_2) && !targetAbsolute) return [];
      return [
        "--glob",
        `!/${(isStrictSubpath(relativePath_2) ? relativePath_2 : joined_2).replace(/[\\*?[\]{}]/g, "\\$&")}`,
      ];
    });
    if (flattened.length === 0) return args;
    logForDebugging(`ripgrep: leaving other apps' data out of the walk of ${realTarget}`);
    return args.includes("--") ? [...flattened, ...args] : [...args, ...flattened];
  } catch (error) {
    logForDebugging(`ripgrep: other apps' data not excluded: ${error}`, {
      level: "error",
    });
    return args;
  }
}
//@ chunk-fq0cr76a.js:891906-891994 layout
function isStrictSubpath(relativePath) {
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${pathModule_2.sep}`) &&
    !pathModule_2.isAbsolute(relativePath)
  );
}
//@ chunk-fq0cr76a.js:891994-894506 fingerprint (2.1.88 match: ripGrepRaw, 0.57)
/**
 * ripGrepRaw：spawn ripgrep，按字节上限收集 stdout/stderr，支持 stdin 管道与继承 fd，macOS 自动排除 ~/Library 受保护目录。
 */
function ripGrepRaw(
  args,
  target,
  signal,
  onResult,
  singleThread = false,
  cwd,
  stdin,
  inheritFd,
  searchOtherAppsData = false,
) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  let spawnCwd = cwd ?? resolveRipgrepSpawnCwd(target, rgPath);
  assertNoNullBytesForRipgrep(args, target, spawnCwd);
  let threadArgs = singleThread ? ["-j", "1"] : [];
  let fullArgs = [
    ...rgArgs,
    ...threadArgs,
    ...(searchOtherAppsData ? args : addMacosProtectedDirExcludes(args, target, spawnCwd)),
    target,
  ];
  let defaultTimeoutMs = getPlatform() === "wsl" ? 60000 : 20000;
  let CLAUDE_CODE_GLOB_TIMEOUT_SECONDS = env.CLAUDE_CODE_GLOB_TIMEOUT_SECONDS || 0;
  let timeoutMs =
    CLAUDE_CODE_GLOB_TIMEOUT_SECONDS > 0 ? CLAUDE_CODE_GLOB_TIMEOUT_SECONDS * 1000 : defaultTimeoutMs;
  if (argv0 || inheritFd !== undefined) {
    let child = spawn(rgPath, fullArgs, {
      ...(argv0 && {
        argv0,
      }),
      ...(inheritFd !== undefined && {
        stdio: ["pipe", "pipe", "pipe", inheritFd],
      }),
      cwd: spawnCwd,
      signal,
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    if (stdin && child.stdin) {
      child.stdin.on("error", () => {});
      let stdinSource = stdin();
      stdinSource
        .on("error", (data) => {
          child.kill();
          child.emit(
            "error",
            Object.assign(data, {
              stdinSourceFailed: true,
            }),
          );
        })
        .pipe(child.stdin);
      child.once("close", () => stdinSource.destroy());
    }
    let stdoutCollector = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES);
    let stderrCollector = new BoundedOutputCollector(MAX_RIPGREP_OUTPUT_BYTES);
    let killTimer;
    let graceTimer;
    let timedOut = false;
    let timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(
        (childProcess, onGraceExpired) => {
          onGraceExpired();
          childProcess.kill("SIGKILL");
        },
        5000,
        child,
        armGraceTimer,
      );
    }, timeoutMs);
    let settled = false;
    let finish = (error, stdout, stderr) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      clearTimeout(killTimer);
      clearTimeout(graceTimer);
      onResult(error, stdout, stderr);
    };
    let killChild = () => {
      try {
        child.kill(RIPGREP_KILL_SIGNAL);
      } catch {}
    };
    let fail = (error) => {
      if (settled) return;
      stdoutCollector.release();
      stderrCollector.release();
      finish(toRipgrepOutputError(toError(error)), "", "");
      killChild();
    };
    let makeMaxBufferError = () => {
      let maxBufferError = Error("stdout maxBuffer length exceeded");
      maxBufferError.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
      return maxBufferError;
    };
    let onStdout = (chunk) => {
      try {
        if (!settled && stdoutCollector.append(chunk)) killChild();
      } catch (error) {
        fail(error);
      }
    };
    let onStderr = (chunk) => {
      try {
        if (!settled) stderrCollector.append(chunk);
      } catch (error) {
        fail(error);
      }
    };
    let onClose = (code, signalName) => {
      try {
        if (settled) return;
        let stdoutText = stdoutCollector.takeText();
        let stderrText = stderrCollector.takeText();
        if (code === 0 || code === 1) {
          finish(stdoutCollector.truncated ? makeMaxBufferError() : null, stdoutText, stderrText);
          return;
        }
        let error = Error(`ripgrep exited with code ${code}${signalName ? ` (signal ${signalName})` : ""}`);
        error.code = code ?? undefined;
        error.signal = signalName ?? (timedOut ? "SIGTERM" : undefined);
        finish(stdoutCollector.truncated ? makeMaxBufferError() : error, stdoutText, stderrText);
      } catch (error) {
        fail(error);
      }
    };
    let onError = (error) => {
      try {
        if (settled) return;
        if (error.code === "ENOENT") ripgrepStatus().invalidate();
        finish(
          stdoutCollector.truncated ? makeMaxBufferError() : error,
          stdoutCollector.takeText(),
          stderrCollector.takeText(),
        );
      } catch (error) {
        fail(error);
      }
    };
    let armGraceTimer = () => {
      graceTimer = setTimeout(
        (onGrace) => {
          logForDebugging("rg did not report close after the timeout kill; the search ends without it", {
            level: "error",
          });
          onGrace(null, null);
        },
        RIPGREP_KILL_GRACE_MS,
        onClose,
      );
    };
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("close", onClose);
    child.on("error", onError);
    return child;
  }
  let timeoutHandle = {};
  let settled = false;
  let onExecDone = (error, stdout, stderr) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle.id);
    onResult(error, stdout, stderr);
  };
  let child = execFile(
    rgPath,
    fullArgs,
    {
      cwd: spawnCwd,
      maxBuffer: MAX_RIPGREP_OUTPUT_BYTES,
      signal,
      timeout: timeoutMs,
      killSignal: RIPGREP_KILL_SIGNAL,
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    },
    onExecDone,
  );
  if (!settled)
    timeoutHandle.id = setTimeout(
      (code, signal) => {
        code.id = setTimeout(
          (onGrace) => {
            logForDebugging("rg did not report close after the timeout kill; the search ends without it", {
              level: "error",
            });
            let killError = Error("ripgrep did not exit after the timeout kill");
            killError.signal = "SIGTERM";
            onGrace(killError, "", "");
          },
          RIPGREP_KILL_GRACE_MS,
          signal,
        );
      },
      timeoutMs,
      timeoutHandle,
      onExecDone,
    );
  if (stdin && child.stdin) {
    child.stdin.on("error", () => {});
    let stdinSource = stdin();
    stdinSource
      .on("error", (err) => {
        child.kill();
        child.emit(
          "error",
          Object.assign(err, {
            stdinSourceFailed: true,
          }),
        );
      })
      .pipe(child.stdin);
    child.once("close", () => stdinSource.destroy());
  }
  return child;
}
//@ chunk-fq0cr76a.js:894506-895018 fingerprint (2.1.88 match: ripGrepFileCount, 0.912)
async function ripGrepFileCount(args, target, abortSignal) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let spawnCwd = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, spawnCwd);
    let child = addMacosProtectedDirExcludes(args, target, spawnCwd);
    let countChild = spawn(rgPath, [...rgArgs, ...child, target], {
      argv0,
      cwd: spawnCwd,
      signal: abortSignal,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      ...cgroupSpawnOptions("helper"),
    });
    let lines = 0;
    countChild.stdout?.on("data", (chunk) => {
      lines += countCharInString(
        chunk,
        `
`,
      );
    });
    let settled = false;
    countChild.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0 || code === 1 || code === null) resolve(lines);
      else reject(Error(`rg --files exited ${code}`));
    });
    countChild.on("error", (err) => {
      if (settled) return;
      settled = true;
      let explained = explainRipgrepNotFound(sanitizeSpawnError(err));
      if (err.code === "ENOENT" && argv0) ripgrepStatus().invalidate();
      reject(explained);
    });
  });
}
//@ chunk-fq0cr76a.js:895018-895043 layout (2.1.88 match: killCaffeinate, 0.805)
var RIPGREP_KILL_SIGNAL = "SIGKILL";
var RIPGREP_KILL_GRACE_MS = 5000;
//@ chunk-fq0cr76a.js:895043-896024 fingerprint (2.1.88 match: ripGrepStream, 0.631)
/**
 * 流式运行 ripgrep，逐批回调输出行（SIGKILL 结束）。
 */
async function ripGrepStream(args, target, abortSignal, onLines) {
  assertProgramLaunchAllowed();
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  return new Promise((resolve, reject) => {
    let spawnCwd = resolveRipgrepSpawnCwd(target, rgPath);
    assertNoNullBytesForRipgrep(args, target, spawnCwd);
    let child = addMacosProtectedDirExcludes(args, target, spawnCwd);
    let streamChild = spawn(rgPath, [...rgArgs, ...child, target], {
      argv0,
      cwd: spawnCwd,
      signal: abortSignal,
      killSignal: RIPGREP_KILL_SIGNAL,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      ...cgroupSpawnOptions("helper"),
    });
    let stripCR = (remainder) => (remainder.endsWith("\r") ? remainder.slice(0, -1) : remainder);
    let decoder = new StringDecoder("utf8");
    let remainder = "";
    streamChild.stdout?.on("data", (chunk) => {
      let lines = (remainder + decoder.write(chunk)).split(`
`);
      remainder = lines.pop() ?? "";
      if (lines.length) onLines(lines.map(stripCR));
    });
    let settled = false;
    let abortTimer;
    streamChild.on("close", (code) => {
      clearTimeout(abortTimer);
      if (settled) return;
      if (abortSignal.aborted) {
        settled = true;
        resolve("aborted");
        return;
      }
      settled = true;
      remainder += decoder.end();
      if (code === 0 || code === 1) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("complete");
      } else if (code === 2) {
        if (remainder) onLines([stripCR(remainder)]);
        resolve("error-exit-2");
      } else if (code === null) resolve("external-kill");
      else reject(Error(`ripgrep exited with code ${code}`));
    });
    streamChild.on("error", (err) => {
      if (settled) return;
      if (err.code === "ABORT_ERR" || err.name === "AbortError") {
        if (streamChild.pid === undefined) {
          settled = true;
          resolve("aborted");
          return;
        }
        abortTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve("aborted");
          }
        }, RIPGREP_KILL_GRACE_MS);
        abortTimer.unref?.();
        return;
      }
      settled = true;
      let explained = explainRipgrepNotFound(sanitizeSpawnError(err));
      if (err.code === "ENOENT" && argv0) ripgrepStatus().invalidate();
      reject(explained);
    });
  });
}
//@ chunk-fq0cr76a.js:896024-896386 layout
/**
 * 在 lexical 与 canonical 路径前缀间互换，得到同一路径的另一种拼写（deny 规则匹配用）。
 */
function getAlternateRootSpellings(path, target) {
  if (target.lexical === target.canonical) return [];
  let canonicalWithSep = target.canonical.endsWith(sep) ? target.canonical : target.canonical + sep;
  let lexicalWithSep = target.lexical.endsWith(sep) ? target.lexical : target.lexical + sep;
  let alternates = [];
  if (isSearchResultRootRespellEnabled()) {
    if (path === target.lexical) alternates.push(target.canonical);
    else if (path.startsWith(lexicalWithSep))
      alternates.push(canonicalWithSep + path.slice(lexicalWithSep.length));
  }
  if (path === target.canonical) alternates.push(target.lexical);
  else if (path.startsWith(canonicalWithSep))
    alternates.push(lexicalWithSep + path.slice(canonicalWithSep.length));
  return alternates;
}
//@ chunk-fq0cr76a.js:896386-899328 fingerprint (2.1.88 match: ripGrep, 0.505)
/**
 * 运行 ripgrep 并返回行数组：首次使用时自检；处理超时（WSL 60s、其他 20s，可由 CLAUDE_CODE_GLOB_TIMEOUT_SECONDS 覆盖）、资源耗尽重试、输出超限。
 */
async function ripGrep_2(args, target, signal, options) {
  ripgrepStatus()
    .testOnFirstUse()
    .catch((error) => {
      logError(error);
    });
  return new Promise((resolve, reject) => {
    let handleResult = (error, stdout, stderr, isRetry) => {
      if (!error) {
        if (options?.rejectOnPartial && stdout.length >= MAX_RIPGREP_OUTPUT_BYTES) {
          reject(new RipgrepTimeoutError("Ripgrep output exceeded the output buffer and was truncated.", []));
          return;
        }
        resolve(
          options?.rawLines
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
      let maxBufferHit = error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
      if (!isRetry && !maxBufferHit && isEagainError(stderr)) {
        logForDebugging("rg EAGAIN error detected, retrying with single-threaded mode (-j 1)");
        logEvent("tengu_ripgrep_eagain_retry", {});
        try {
          options?.beforeSpawn?.();
          ripGrepRaw(
            args,
            target,
            signal,
            (retryError, retryStdout, retryStderr) => {
              safeHandleResult(retryError, retryStdout, retryStderr, true);
            },
            true,
            options?.cwd,
            options?.stdin,
            options?.inheritFd,
            options?.searchOtherAppsData,
          );
        } catch (error) {
          reject(
            RipgrepSpawnResourceError.from(error, options?.rejectOnInputError, "thrown") ?? toError(error),
          );
        }
        return;
      }
      let hasOutput = stdout && stdout.trim().length > 0;
      let killed = error.signal === "SIGTERM" || error.signal === "SIGKILL" || error.code === "ABORT_ERR";
      let benignSignal =
        error.code === undefined && (error.signal === undefined || BENIGN_KILL_SIGNALS.has(error.signal));
      let lines = [];
      if (hasOutput) {
        lines = options?.rawLines
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
        if (lines.length > 0 && (killed || maxBufferHit || benignSignal))
          lines = options?.rawLines ? dropIncompleteLastLine(lines, stdout) : lines.slice(0, -1);
      }
      logForDebugging(
        `rg error (signal=${error.signal}, code=${error.code}, stderr: ${stderr}), ${lines.length} results`,
      );
      if (options?.rejectOnPartial && (killed || maxBufferHit || benignSignal)) {
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
        options?.rejectOnInputError &&
        error.code === 2 &&
        lines.length === 0 &&
        RIPGREP_USAGE_ERROR_RE.test(stderr)
      ) {
        reject(new RipgrepUsageError(stderr));
        return;
      }
      if (
        options?.rejectOnInputError &&
        error.code === 2 &&
        lines.every((line) => line.endsWith('"type":"summary"}')) &&
        stderr.startsWith(`rg: ${target}: `) &&
        !stderr.trimEnd().includes(`
`)
      ) {
        let osError = Number(/\(os error (\d+)\)\s*$/.exec(stderr)?.[1]);
        let expectedMissing =
          target !== INHERITED_FD_PATH &&
          (getPlatform() === "windows"
            ? [WIN_ERROR_FILE_NOT_FOUND, WIN_ERROR_PATH_NOT_FOUND]
            : [ENOENT_CODE, ENOTDIR_CODE]
          ).includes(osError);
        if (!Number.isNaN(osError) && !expectedMissing) {
          reject(new RipgrepTargetUnreadableError(osError));
          return;
        }
      }
      if (options?.rejectOnInputError && "stdinSourceFailed" in error && error.stdinSourceFailed === true) {
        reject(sanitizeSpawnError(error));
        return;
      }
      if (error.code !== 2 && error.code !== "ABORT_ERR") {
        let resourceExhausted = RESOURCE_EXHAUSTION_CODES.has(getErrnoCode(error) ?? "");
        if (killed || maxBufferHit || benignSignal || resourceExhausted || isEagainError(stderr))
          logForDebugging(`rg failed (signal=${error.signal}, code=${error.code}): ${error.message}`, {
            level: "error",
          });
        else {
          let abnormalError =
            lines.length === 0 && options?.rejectOnInputError && error.code !== "ECHILD"
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
          if (abnormalError !== undefined) {
            reject(abnormalError);
            return;
          }
        }
      }
      let spawnResourceError =
        lines.length === 0
          ? RipgrepSpawnResourceError.from(error, options?.rejectOnInputError, "emitted")
          : undefined;
      if (spawnResourceError) {
        reject(spawnResourceError);
        return;
      }
      if (maxBufferHit && lines.length === 0 && options?.rejectOnInputError) {
        reject(new RipgrepOutputTooLargeError(error.message.startsWith("stderr") ? "stderr" : "stdout"));
        return;
      }
      if (killed && lines.length === 0) {
        reject(createRipgrepAbortError(signal));
        return;
      }
      resolve(lines);
    };
    let safeHandleResult = (error, stdout, stderr, isRetry) => {
      try {
        handleResult(error, stdout, stderr, isRetry);
      } catch (error) {
        reject(error instanceof RangeError ? toRipgrepOutputError(error) : toError(error));
      }
    };
    try {
      options?.beforeSpawn?.();
      ripGrepRaw(
        args,
        target,
        signal,
        (error, stdout, stderr) => {
          safeHandleResult(error, stdout, stderr, false);
        },
        false,
        options?.cwd,
        options?.stdin,
        options?.inheritFd,
        options?.searchOtherAppsData,
      );
    } catch (error) {
      reject(RipgrepSpawnResourceError.from(error, options?.rejectOnInputError, "thrown") ?? error);
    }
  });
}
//@ chunk-fq0cr76a.js:899328-899388 layout
/**
 * 统计目录文件数（四舍五入），委托给 ripgrep 状态对象。
 */
function countFilesRounded(dirPath, abortSignal, ignorePatterns = []) {
  return ripgrepStatus().countFilesRounded(dirPath, abortSignal, ignorePatterns);
}
//@ chunk-fq0cr76a.js:899388-899763 fingerprint (2.1.88 match: countFilesRoundedRg, 0.852)
/**
 * 用 rg --files --hidden 统计目录文件数（家目录本身或其祖先时跳过）。
 */
async function countFilesRoundedRg(dirPath, abortSignal, ignorePatterns) {
  let relativePath = pathModule_2.relative(safeRealpath(dirPath), safeRealpath(homedir()));
  if (relativePath === "" || isStrictSubpath(relativePath)) return;
  try {
    let fileCount;
    let devNull = null;
    {
      let args = ["--files", "--hidden"];
      ignorePatterns.forEach((pattern) => {
        args.push("--glob", `!${pattern}`);
      });
      fileCount = await ripGrepFileCount(args, dirPath, abortSignal);
    }
    if (fileCount === 0) return 0;
    let magnitude = Math.floor(Math.log10(fileCount));
    let power = Math.pow(10, magnitude);
    return Math.round(fileCount / power) * power;
  } catch (error) {
    if (error?.name !== "AbortError")
      logForDebugging(`countFilesRoundedRg failed: ${error}`, {
        level: "error",
      });
  }
}
//@ chunk-fq0cr76a.js:899763-899859 layout (2.1.88 match: getRipgrepStatus, 1)
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
//@ chunk-fq0cr76a.js:899859-900715 fingerprint (2.1.88 match: testRipgrepOnFirstUse, 0.902)
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
function splitNulDelimitedOutput(lines, mode, separator = "nul") {
  let joined = lines.join(`
`);
  if (!joined.includes("\x00")) return lines;
  let result = [];
  if (mode === "count") {
    let countPattern = /([^\0]*)\0:?(\d+)(?:\n|$)/gy;
    for (let match = countPattern.exec(joined); match !== null; match = countPattern.exec(joined))
      if (match[2] !== "0") result.push(`${match[1]}:${match[2]}`);
    return result;
  }
  let parts = joined.split("\x00");
  parts.pop();
  for (let j = 0; j < parts.length; j++) {
    let entry = j === 0 || separator === "nul" ? parts[j] : parts[j].replace(/^\n/, "");
    if (entry !== "") result.push(entry);
  }
  return result;
}
//@ chunk-aqdf5t3e.js:8562-8617 fingerprint (2.1.88 match: getRipgrepStatus, 1)
/**
 * 订阅 ripgrep 可用状态变化。
 */
function getRipgrepStatus(status, listener) {
  return presenceStores.of(status).working.subscribe(listener);
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
