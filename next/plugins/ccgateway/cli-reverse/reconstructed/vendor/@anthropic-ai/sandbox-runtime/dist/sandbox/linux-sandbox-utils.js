/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-eswddw2z.js (1), chunk-qg41pqt6.js (61)
 * attribution: esm-fingerprint 46, esm-layout 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import path, { join } from "path";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { tmpdir, endianness } from "os";
import { spawnSync, spawn } from "child_process";
import { randomBytes } from "crypto";
import {
  isAtOrUnder,
  DANGEROUS_FILES,
  getDangerousDirectories,
  normalizeCaseForComparison,
  isAbsenceErrno,
  workingDirectory,
  nameLocation,
  coversChildPath,
  normalizePathForSandbox,
  isSymlinkOutsideBoundary,
  properAncestors,
  encodeSandboxedCommand,
  orDefault,
  buildPosixGitSafeDirEnv,
  generateProxyEnvVars,
} from "./sandbox-utils.js";
import { realPathOf, wayTo } from "../utils/real-path.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { ripGrep, RipgrepError } from "../utils/ripgrep.js";
import { quote } from "../utils/shell-quote.js";
import { whichSync } from "../utils/which.js";
import { getApplySeccompBinaryPath } from "./generate-seccomp-filter.js";
import { readNamesOf, writeNamesOf } from "./path-entries.js";
import { buildJavaToolOptions } from "./java-proxy-agent.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:725271-725280 esm-layout
var DEFAULT_MANDATORY_DENY_SEARCH_DEPTH = 3;
//@ chunk-qg41pqt6.js:725280-725475 esm-fingerprint
function findSymlinkInPath(targetPath, allowedWritePaths) {
  let parts = targetPath.split(path.sep);
  let currentPath = "";
  for (let part of parts) {
    if (!part) continue;
    let nextPath = currentPath + path.sep + part;
    try {
      if (fsModule_2.lstatSync(nextPath).isSymbolicLink()) {
        if (allowedWritePaths.some((allowedWritePath) => isAtOrUnder(nextPath, allowedWritePath)))
          return nextPath;
      }
    } catch {
      break;
    }
    currentPath = nextPath;
  }
  return null;
}
//@ chunk-qg41pqt6.js:725475-725485 esm-layout
var MAX_MISSING_NAMES_PASSED = 40;
//@ chunk-qg41pqt6.js:725485-726257 esm-fingerprint
function resolveSymlinkedDenyPath(targetPath, alsoDenied) {
  try {
    return realPathOf(targetPath);
  } catch {}
  let ancestor = targetPath;
  let remainder = [];
  let resolvedAncestor = null;
  while (resolvedAncestor === null) {
    let parent = path.dirname(ancestor);
    if (parent === ancestor) return null;
    remainder.unshift(path.basename(ancestor));
    ancestor = parent;
    try {
      resolvedAncestor = realPathOf(ancestor);
    } catch {}
  }
  let rejoined = path.join(resolvedAncestor, ...remainder);
  try {
    fsModule_2.readlinkSync(path.join(resolvedAncestor, remainder[0]));
  } catch {
    return rejoined;
  }
  let why = "it goes up from too many names that are not there";
  try {
    let onward = rejoined;
    for (let i = 0; i < MAX_MISSING_NAMES_PASSED; i++) {
      let { real, rest, notThere } = wayTo(onward);
      if (notThere?.code === "EACCES") return real || "/";
      let names = rest.filter((name) => name !== "" && name !== ".");
      if (names[1] !== "..") return [real, ...names.slice(0, 2)].join("/") || "/";
      alsoDenied?.push(`${real}/${names[0]}`);
      onward = [real, ...names.slice(2)].join("/");
    }
  } catch (err) {
    why = err;
  }
  if (alsoDenied === undefined)
    logForDebugging_2(
      `[Sandbox Linux] Where a write to ${targetPath} would land cannot be settled: ${why}. The link on the way is masked instead, which can keep the sandbox from starting.`,
      {
        level: "warn",
      },
    );
  return null;
}
//@ chunk-qg41pqt6.js:726257-726416 esm-fingerprint
function fileOnTheWay(targetPath) {
  let parts = targetPath.split(path.sep);
  let currentPath = "";
  for (let part of parts) {
    if (!part) continue;
    let nextPath = currentPath + path.sep + part;
    try {
      if (!fsModule_2.statSync(nextPath).isDirectory()) return nextPath;
    } catch {
      break;
    }
    currentPath = nextPath;
  }
  return;
}
//@ chunk-qg41pqt6.js:726416-726549 esm-fingerprint
function findFirstNonExistentComponent(targetPath) {
  let parts = targetPath.split(path.sep);
  let currentPath = "";
  for (let part of parts) {
    if (!part) continue;
    let nextPath = currentPath + path.sep + part;
    if (!fsModule_2.existsSync(nextPath)) return nextPath;
    currentPath = nextPath;
  }
  return targetPath;
}
//@ chunk-qg41pqt6.js:726549-726556 esm-layout
var MountPointKind;
//@ chunk-qg41pqt6.js:726556-726662 esm-fingerprint
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:726556", () => {
  (function (MountPointKind) {
    MountPointKind.File = "file";
    MountPointKind.Directory = "directory";
    MountPointKind.Held = "held";
    MountPointKind.Unmakeable = "unmakeable";
  })(MountPointKind || (MountPointKind = {}));
});
//@ chunk-qg41pqt6.js:726662-726689 esm-fingerprint
var O_PATH = 2097152;
var V9FS_MAGIC = 16914839;
//@ chunk-qg41pqt6.js:726689-727478 esm-fingerprint
function makeableMountPoint(dest, wanted) {
  let refusalOf = (attempt) => {
    try {
      attempt();
      return;
    } catch (err) {
      let code = err.code;
      if (code === "EACCES" || code === "EPERM" || code === "EROFS") return code;
      throw err;
    }
  };
  let fd;
  try {
    fd = fsModule_2.openSync(
      path.dirname(dest),
      O_PATH | fsModule_2.constants.O_NOFOLLOW | fsModule_2.constants.O_DIRECTORY,
    );
    let parent = `/proc/self/fd/${fd}`;
    if (fsModule_2.readlinkSync(parent) !== path.dirname(dest)) return wanted;
    let { uid, mode } = fsModule_2.fstatSync(fd);
    let refusal = refusalOf(() =>
      fsModule_2.accessSync(parent, fsModule_2.constants.W_OK | fsModule_2.constants.X_OK),
    );
    if (fsModule_2.statfsSync(parent).type !== V9FS_MAGIC)
      return refusal === undefined || (refusal === "EACCES" && uid === process.geteuid?.())
        ? wanted
        : MountPointKind.Unmakeable;
    if (refusal === undefined) {
      let entry = `${parent}/${path.basename(dest)}`;
      if (
        wanted === MountPointKind.File &&
        refusalOf(() => fsModule_2.closeSync(fsModule_2.openSync(entry, "wx", 292))) === undefined
      )
        return MountPointKind.File;
      if (refusalOf(() => fsModule_2.mkdirSync(entry)) === undefined) return MountPointKind.Directory;
    }
    return refusalOf(() => fsModule_2.chmodSync(parent, mode & 4095)) === undefined
      ? wanted
      : MountPointKind.Unmakeable;
  } catch {
    return wanted;
  } finally {
    if (fd !== undefined) fsModule_2.closeSync(fd);
  }
}
//@ chunk-qg41pqt6.js:727478-727485 esm-layout
var DotGitKind;
//@ chunk-qg41pqt6.js:727485-727569 esm-fingerprint
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:727485", () => {
  (function (DotGitKind) {
    DotGitKind.Directory = "directory";
    DotGitKind.File = "file";
    DotGitKind.Absent = "absent";
  })(DotGitKind || (DotGitKind = {}));
});
//@ chunk-qg41pqt6.js:727569-727669 esm-fingerprint
function dotGitKindAt(dotGitPath) {
  try {
    return fsModule_2.statSync(dotGitPath).isDirectory() ? DotGitKind.Directory : DotGitKind.File;
  } catch {
    return DotGitKind.Absent;
  }
}
//@ chunk-qg41pqt6.js:727669-727942 esm-fingerprint
function linuxGetCwdMandatoryDenyPaths(allowGitConfig = false) {
  let cwd = process.cwd();
  let denyPaths = [
    ...DANGEROUS_FILES.map((f) => path.resolve(cwd, f)),
    ...getDangerousDirectories().map((d) => path.resolve(cwd, d)),
  ];
  let dotGitPath = path.resolve(cwd, ".git");
  let dotGit = dotGitKindAt(dotGitPath);
  if (dotGit === DotGitKind.File) denyPaths.push(dotGitPath);
  if (dotGit === DotGitKind.Directory) {
    denyPaths.push(path.resolve(cwd, ".git/hooks"));
    if (!allowGitConfig) denyPaths.push(path.resolve(cwd, ".git/config"));
  }
  return denyPaths;
}
//@ chunk-qg41pqt6.js:727942-728469 esm-fingerprint
function unreadableDirectories(stderr, cwd, maxDepth) {
  let found = [];
  let tried = new Set();
  for (let line of stderr.split(`
`)) {
    let said = line.startsWith("rg: ") ? line.slice(4) : line;
    for (let cut = said.indexOf(": "); cut !== -1; cut = said.indexOf(": ", cut + 1))
      for (
        let dir = path.resolve(cwd, said.slice(0, cut));
        dir.startsWith(cwd + path.sep) && !tried.has(dir);
        dir = path.dirname(dir)
      ) {
        tried.add(dir);
        try {
          let stat = fsModule_2.lstatSync(dir);
          if (!stat.isDirectory() || stat.uid !== process.getuid?.() || realPathOf(dir) !== dir) break;
        } catch (error) {
          if (error.code === "EACCES") continue;
          break;
        }
        try {
          fsModule_2.accessSync(dir, fsModule_2.constants.R_OK | fsModule_2.constants.X_OK);
        } catch {
          if (path.relative(cwd, dir).split(path.sep).length <= maxDepth) found.push(dir);
        }
        break;
      }
  }
  return found;
}
//@ chunk-qg41pqt6.js:728469-729521 esm-fingerprint
async function linuxGetMandatoryDenyPaths(
  ripgrepConfig = {
    command: "rg",
  },
  maxDepth = DEFAULT_MANDATORY_DENY_SEARCH_DEPTH,
  allowGitConfig = false,
  abortSignal,
) {
  let cwd = process.cwd();
  let fallbackController = new AbortController();
  let signal = abortSignal ?? fallbackController.signal;
  let dangerousDirectories = getDangerousDirectories();
  let denyPaths = linuxGetCwdMandatoryDenyPaths(allowGitConfig);
  let iglobArgs = [];
  for (let fileName of DANGEROUS_FILES) iglobArgs.push("--iglob", fileName);
  for (let dirName of dangerousDirectories) iglobArgs.push("--iglob", `**/${dirName}/**`);
  iglobArgs.push("--iglob", "**/.git/hooks/**", "--iglob", "**/.git/HEAD");
  if (!allowGitConfig) iglobArgs.push("--iglob", "**/.git/config");
  let matches = [];
  try {
    matches = await ripGrep(
      [
        "--files",
        "--hidden",
        "--no-ignore",
        "--no-config",
        "--line-buffered",
        "--max-depth",
        String(maxDepth + 1),
        ...iglobArgs,
        "-g",
        "!**/node_modules/**",
      ],
      cwd,
      signal,
      ripgrepConfig,
    );
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof RipgrepError) {
      matches = error.listed;
      denyPaths.push(...unreadableDirectories(error.stderr, cwd, maxDepth));
    }
    logForDebugging_2(`[Sandbox] ripgrep scan failed: ${error}`, {
      level: "warn",
    });
  }
  let directoryNames = [...dangerousDirectories, ".git/hooks", ".git/config", ".git/HEAD"].map((name) =>
    normalizeCaseForComparison(name).split("/"),
  );
  for (let match of matches) {
    let segments = path.relative(cwd, path.resolve(cwd, match)).split(path.sep);
    let lower = segments.map(normalizeCaseForComparison);
    let at = segments.length - 1;
    let length = 1;
    let deepest = maxDepth - 1;
    e: for (let i = 0; i < lower.length; i++)
      for (let name of directoryNames)
        if (name.every((component, k) => lower[i + k] === component)) {
          at = i;
          length = name.length;
          deepest = maxDepth - 2;
          break e;
        }
    if (at > deepest) continue;
    let found = segments.slice(0, at + length);
    if (lower[at] === ".git" && lower[at + 1] === "head") found[at + 1] = "hooks";
    denyPaths.push(path.join(cwd, ...found));
  }
  return [...new Set(denyPaths)];
}
//@ chunk-qg41pqt6.js:729521-729539 esm-layout
var bwrapMountPoints; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var emptyMountSourceDir;
deferInit("chunk-qg41pqt6.js:729521", () => {
  bwrapMountPoints = new Set();
});
//@ chunk-qg41pqt6.js:729539-729911 esm-fingerprint
function ensureEmptyMountSourceDir() {
  if (emptyMountSourceDir !== undefined) {
    try {
      let stat = fsModule_2.lstatSync(emptyMountSourceDir);
      if (
        stat.isDirectory() &&
        stat.uid === process.getuid?.() &&
        (stat.mode & 63) === 0 &&
        fsModule_2.readdirSync(emptyMountSourceDir).length === 0
      )
        return emptyMountSourceDir;
    } catch {}
    logForDebugging_2(
      `[Sandbox Linux] Not reusing the empty-directory mount source, it is gone or no longer our own empty directory: ${emptyMountSourceDir}`,
    );
  }
  emptyMountSourceDir = fsModule_2.mkdtempSync(path.join(tmpdir(), "claude-empty-"));
  fsModule_2.chmodSync(emptyMountSourceDir, 448);
  return emptyMountSourceDir;
}
//@ chunk-qg41pqt6.js:729911-729931 esm-layout
var CAP_SETFCAP = 31;
var boundingCapabilities;
var capabilityReadFailureLogged = false;
//@ chunk-qg41pqt6.js:729931-730286 esm-fingerprint
function processHasBoundingCapability(cap) {
  let bits = boundingCapabilities;
  if (bits === undefined) {
    let failure = "has no CapBnd or CapInh line";
    try {
      bits = boundingCapabilitiesFromStatus(fsModule_2.readFileSync("/proc/self/status", "utf8"));
      boundingCapabilities = bits;
    } catch (e) {
      failure = `could not be read (${String(e)})`;
    }
    if (bits === undefined) {
      if (!capabilityReadFailureLogged) {
        capabilityReadFailureLogged = true;
        logForDebugging_2(
          `[Sandbox Linux] /proc/self/status ${failure} - assuming this process holds no capabilities`,
          {
            level: "warn",
          },
        );
      }
      return false;
    }
  }
  return ((bits >> BigInt(cap)) & 1n) === 1n;
}
//@ chunk-qg41pqt6.js:730286-730448 esm-fingerprint
function boundingCapabilitiesFromStatus(status) {
  let bounding = status.match(/^CapBnd:\s*([0-9a-fA-F]+)\s*$/m);
  let inheritable = status.match(/^CapInh:\s*([0-9a-fA-F]+)\s*$/m);
  return bounding && inheritable ? BigInt("0x" + bounding[1]) | BigInt("0x" + inheritable[1]) : undefined;
}
//@ chunk-qg41pqt6.js:730448-730612 esm-fingerprint
function capabilityArgs({ euid, hasSetfcap, usesSeccompHelper }) {
  let args = ["--cap-drop", "ALL"];
  if (euid !== 0) return args;
  if (!hasSetfcap) return args;
  if (usesSeccompHelper) args.push("--cap-add", "CAP_SETFCAP");
  return args;
}
//@ chunk-qg41pqt6.js:730612-730987 esm-layout
var setfcapMissingLogged = false;
var CAP_SETFCAP_MISSING_MESSAGE = `running as uid 0 without CAP_SETFCAP in this process's capability bounding set - on kernels that enforce the CAP_SETFCAP requirement for mapping uid 0 into a user namespace (Linux 5.12 and distribution backports) every sandboxed command fails while writing a uid map ("Operation not permitted"). Grant CAP_SETFCAP to this process, or run as a non-root user`;
var linuxMaxArgStrlen;
//@ chunk-qg41pqt6.js:730987-731266 esm-fingerprint
function maxArgStrlen() {
  if (linuxMaxArgStrlen === undefined) {
    let pageSize = 4096;
    try {
      let auxv = fsModule_2.readFileSync("/proc/self/auxv");
      let wordBytes = /64|s390x/.test("x64") ? 8 : 4;
      let low = Math.min(wordBytes, 6);
      let word = (at) =>
        endianness() === "BE" ? auxv.readUIntBE(at + wordBytes - low, low) : auxv.readUIntLE(at, low);
      for (let at = 0; at + 2 * wordBytes <= auxv.length; at += 2 * wordBytes)
        if (word(at) === 6) {
          pageSize = word(at + wordBytes);
          break;
        }
    } catch {}
    linuxMaxArgStrlen = 32 * pageSize;
  }
  return linuxMaxArgStrlen;
}
//@ chunk-qg41pqt6.js:731266-731338 esm-fingerprint
var ARG_HEADROOM_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BWRAP_MAX_ARGS;
var BWRAP_ARGS_FD;
var O_TMPFILE;
var bwrapArgsFds;
deferInit("chunk-qg41pqt6.js:731266", () => {
  ARG_HEADROOM_BYTES = 4096;
  BWRAP_MAX_ARGS = 9000;
  BWRAP_ARGS_FD = 9;
  O_TMPFILE = 4194304 | fsModule_2.constants.O_DIRECTORY;
  bwrapArgsFds = new Set();
});
//@ chunk-qg41pqt6.js:731338-731390 esm-fingerprint
function bwrapArgsProfilePath(fd) {
  return `/proc/${process.pid}/fd/${fd}`;
}
//@ chunk-qg41pqt6.js:731390-731836 esm-fingerprint
function openBwrapArgsProfile(mountWords) {
  let contents = mountWords.map((word) => word + "\x00").join("");
  let failures = [];
  for (let dir of new Set([tmpdir(), "/dev/shm"])) {
    let fd;
    try {
      fd = fsModule_2.openSync(dir, O_TMPFILE | fsModule_2.constants.O_RDWR, 384);
    } catch (error) {
      failures.push(`${dir}: ${errorText(error)}`);
      continue;
    }
    try {
      fsModule_2.writeFileSync(fd, contents);
      fsModule_2.fchmodSync(fd, 256);
      fsModule_2.closeSync(fsModule_2.openSync(bwrapArgsProfilePath(fd), fsModule_2.constants.O_RDONLY));
    } catch (error) {
      failures.push(`${dir}: ${errorText(error)}`);
      fsModule_2.closeSync(fd);
      continue;
    }
    bwrapArgsFds.add(fd);
    return fd;
  }
  throw Error(`no unnamed file could be opened for it (${failures.join("; ")})`);
}
//@ chunk-qg41pqt6.js:731836-731892 esm-fingerprint
function closeBwrapArgsProfile(fd) {
  bwrapArgsFds.delete(fd);
  try {
    fsModule_2.closeSync(fd);
  } catch {}
}
//@ chunk-qg41pqt6.js:731892-731953 esm-layout
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-qg41pqt6.js:731953-732156 esm-fingerprint
class LinuxSandboxProfileError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "LinuxSandboxProfileError";
    this.code = code;
    if (cause !== undefined)
      Object.defineProperty(this, "cause", {
        value: cause,
        writable: true,
        configurable: true,
        enumerable: false,
      });
  }
}
//@ chunk-qg41pqt6.js:732156-732305 esm-fingerprint
class WorkingDirectoryChanged extends Error {
  constructor() {
    super("The working directory changed while the command was being wrapped");
    this.name = "WorkingDirectoryChanged";
  }
}
//@ chunk-qg41pqt6.js:732305-734242 esm-fingerprint
function renderBwrapInvocation(bwrapBinary, bwrapArgs, mounts) {
  let shares = () =>
    `${mounts.mandatoryDenyArgs} of its arguments are built-in write protection, in no list of the configuration: shell and tool settings and each git repository's hooks and config, in and below the working directory, and the directories holding them. For fewer, run from a directory with fewer repositories in it, or allow writing to fewer of them; a lower mandatoryDenySearchDepth leaves the deeper ones unprotected. The other ${bwrapArgs.length - mounts.mandatoryDenyArgs} are what the configuration expands to: each path takes about three arguments, each environment variable two`;
  if (bwrapArgs.length > BWRAP_MAX_ARGS)
    throw new LinuxSandboxProfileError(
      "too_many_arguments",
      `Sandbox profile has ${bwrapArgs.length} bwrap arguments and bwrap accepts at most ${BWRAP_MAX_ARGS} (about ${BWRAP_MAX_ARGS / 3} mounts). ${shares()}`,
    );
  let mountWords = bwrapArgs.slice(mounts.start, mounts.end);
  if (mountWords.some((word) => word.includes("\x00")))
    throw new LinuxSandboxProfileError(
      "nul_in_path",
      "Sandbox profile contains a path with a NUL byte, which neither a command line nor a file of bwrap arguments can carry",
    );
  let inline = quote([bwrapBinary, ...bwrapArgs]);
  let inlineBytes = Buffer.byteLength(inline, "utf8");
  let limit = maxArgStrlen() - 1;
  if (inlineBytes <= limit - ARG_HEADROOM_BYTES) return inline;
  let tooLong = `Sandbox profile is too long for the command line (${inlineBytes} bytes; past ${limit - ARG_HEADROOM_BYTES} it goes through a file)`;
  if (bwrapArgs.length + 2 > BWRAP_MAX_ARGS)
    throw new LinuxSandboxProfileError(
      "too_many_arguments",
      `${tooLong} and, passed through a file, would exceed the ${BWRAP_MAX_ARGS} arguments bwrap accepts. ${shares()}`,
    );
  let argsFd;
  try {
    argsFd = openBwrapArgsProfile(mountWords);
  } catch (error) {
    throw new LinuxSandboxProfileError(
      "args_file_unavailable",
      `${tooLong} and cannot be passed through a file: ${errorText(error)}`,
      error,
    );
  }
  let viaArgsFile = quote([
    "/bin/sh",
    "-c",
    `exec ${BWRAP_ARGS_FD}<"$1" && shift && exec "$@"`,
    "srt-args",
    bwrapArgsProfilePath(argsFd),
    bwrapBinary,
    ...bwrapArgs.slice(0, mounts.start),
    "--args",
    String(BWRAP_ARGS_FD),
    ...bwrapArgs.slice(mounts.end),
  ]);
  let viaArgsFileBytes = Buffer.byteLength(viaArgsFile, "utf8");
  if (viaArgsFileBytes > limit) {
    closeBwrapArgsProfile(argsFd);
    throw new LinuxSandboxProfileError(
      "command_too_long",
      `Sandboxed command is too long for one shell argument even with the mounts passed through a file (${viaArgsFileBytes} bytes; the limit here is ${limit})`,
    );
  }
  logForDebugging_2(
    `[Sandbox Linux] bwrap mounts moved to an unnamed file, read through ${bwrapArgsProfilePath(argsFd)} on bwrap's fd ${BWRAP_ARGS_FD}: the command line would be ${inlineBytes} bytes as one argument`,
  );
  return viaArgsFile;
}
//@ chunk-qg41pqt6.js:734242-734268 esm-layout
var activeSandboxCount = 0;
var forcedCleanups = 0;
var exitHandlerRegistered = false;
var cleanupInstalled = false;
//@ chunk-qg41pqt6.js:734268-734288 esm-layout
function markExitCleanupNeeded() {
  exitHandlerRegistered = true;
}
//@ chunk-qg41pqt6.js:734288-734366 esm-fingerprint
function registerExitCleanupHandler() {
  if (cleanupInstalled) return;
  process.on("exit", () => {
    markExitCleanupNeeded();
    cleanupBwrapMountPoints({
      force: true,
    });
  });
  cleanupInstalled = true;
}
//@ chunk-qg41pqt6.js:734366-735355 esm-fingerprint
function cleanupBwrapMountPoints(opts) {
  if (!opts?.force) {
    if (activeSandboxCount > 0) activeSandboxCount--;
    if (activeSandboxCount > 0) {
      logForDebugging_2(
        `[Sandbox Linux] Deferring mount point cleanup \u2014 ${activeSandboxCount} sandbox(es) still active`,
      );
      return;
    }
  } else if (exitHandlerRegistered && activeSandboxCount > 0) {
    logForDebugging_2(
      `[Sandbox Linux] Leaving mount points in place while this process ends \u2014 ${activeSandboxCount} sandbox(es) still active`,
    );
    return;
  }
  if (opts?.force) {
    activeSandboxCount = 0;
    forcedCleanups++;
  }
  let deepestFirst = [...bwrapMountPoints].sort((a, b) => b.length - a.length);
  for (let mountPoint of deepestFirst)
    try {
      let stat = fsModule_2.statSync(mountPoint);
      if (stat.isFile() && stat.size === 0) {
        fsModule_2.unlinkSync(mountPoint);
        logForDebugging_2(`[Sandbox Linux] Cleaned up bwrap mount point (file): ${mountPoint}`);
      } else if (stat.isDirectory()) {
        if (fsModule_2.readdirSync(mountPoint).length === 0) {
          fsModule_2.rmdirSync(mountPoint);
          logForDebugging_2(`[Sandbox Linux] Cleaned up bwrap mount point (dir): ${mountPoint}`);
        }
      }
    } catch {}
  bwrapMountPoints.clear();
  if (emptyMountSourceDir !== undefined)
    try {
      fsModule_2.rmdirSync(emptyMountSourceDir);
      logForDebugging_2(
        `[Sandbox Linux] Cleaned up the empty-directory mount source: ${emptyMountSourceDir}`,
      );
      emptyMountSourceDir = undefined;
    } catch (err) {
      let code = err.code;
      if (code === "ENOTEMPTY")
        logForDebugging_2(
          `[Sandbox Linux] Left the empty-directory mount source behind, something has written into it: ${emptyMountSourceDir}`,
        );
      if (code === "ENOENT" || code === "ENOTDIR") emptyMountSourceDir = undefined;
    }
  for (let argsFd of [...bwrapArgsFds]) closeBwrapArgsProfile(argsFd);
}
//@ chunk-qg41pqt6.js:735355-735435 esm-fingerprint
function isExecutable(p) {
  try {
    fsModule_2.accessSync(p, fsModule_2.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-qg41pqt6.js:735435-736035 esm-fingerprint
function checkLinuxDependencies(opts) {
  let { seccompConfig, bwrapPath, socatPath } = opts ?? {};
  let errors = [];
  let warnings = [];
  let usableBwrap = null;
  if (bwrapPath) {
    if (isExecutable(bwrapPath)) usableBwrap = bwrapPath;
    else errors.push(`bubblewrap (bwrap) not executable at ${bwrapPath}`);
  } else {
    usableBwrap = whichSync("bwrap");
    if (usableBwrap === null) errors.push("bubblewrap (bwrap) not installed");
  }
  if (socatPath) {
    if (!isExecutable(socatPath)) errors.push(`socat not executable at ${socatPath}`);
  } else if (whichSync("socat") === null) errors.push("socat not installed");
  if (!seccompConfig?.argv0 && getApplySeccompBinaryPath(seccompConfig?.applyPath) === null)
    warnings.push("seccomp not available - unix socket access not restricted");
  let uid0Error = uid0SandboxError({
    euid: process.geteuid?.(),
    hasSetfcap: processHasBoundingCapability(CAP_SETFCAP),
    bwrap: usableBwrap,
  });
  if (uid0Error !== null) errors.push(uid0Error);
  let outdated = outdatedBwrapWarning(usableBwrap);
  if (outdated !== null) warnings.push(outdated);
  return {
    warnings,
    errors,
  };
}
//@ chunk-qg41pqt6.js:736035-736061 esm-fingerprint
var MIN_COMMAND_VERSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var commandVersionCache;
deferInit("chunk-qg41pqt6.js:736035", () => {
  MIN_COMMAND_VERSION = "0.5.0";
  commandVersionCache = new Map();
});
//@ chunk-qg41pqt6.js:736061-736310 esm-fingerprint
/**
 * 同步执行 cmd --version 取版本号（缓存）。
 */
function getCommandVersion(bwrap) {
  let cached = commandVersionCache.get(bwrap);
  if (cached !== undefined) return cached;
  let probe = spawnSync(bwrap, ["--version"], {
    timeout: 5000,
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
  let version =
    probe.error === undefined && probe.status === 0
      ? (/\d+(?:\.\d+)*/.exec(probe.stdout ?? "")?.[0] ?? null)
      : null;
  commandVersionCache.set(bwrap, version);
  return version;
}
//@ chunk-qg41pqt6.js:736310-736532 esm-fingerprint
function compareVersions(a, b) {
  let partsOf = (version) =>
    version.split(".").map((part) => {
      let parsed = Number.parseInt(part, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
  let left = partsOf(a);
  let right = partsOf(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    let difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
//@ chunk-qg41pqt6.js:736532-736837 esm-layout
function outdatedBwrapWarning(bwrap) {
  if (bwrap === null) return null;
  let version = getCommandVersion(bwrap);
  if (version === null || compareVersions(version, MIN_COMMAND_VERSION) >= 0) return null;
  return `bubblewrap ${version} at ${bwrap} is older than ${MIN_COMMAND_VERSION}: a denyRead entry or credential mask naming a path that is not a regular file (a fifo, socket or device node) cannot be applied on it. Everything else is unaffected`;
}
//@ chunk-qg41pqt6.js:736837-736994 esm-fingerprint
function uid0SandboxError({ euid, hasSetfcap, bwrap }) {
  if (euid !== 0 || hasSetfcap || bwrap === null) return null;
  let refusal = probeUid0UserNamespace(bwrap);
  if (refusal === null) return null;
  return refusal === ""
    ? CAP_SETFCAP_MISSING_MESSAGE
    : `${CAP_SETFCAP_MISSING_MESSAGE} (bubblewrap: ${refusal})`;
}
//@ chunk-qg41pqt6.js:736994-737009 esm-layout
var uid0UserNamespaceProbes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:736994", () => {
  uid0UserNamespaceProbes = new Map();
});
//@ chunk-qg41pqt6.js:737009-737330 esm-fingerprint
function probeUid0UserNamespace(bwrap) {
  let cached = uid0UserNamespaceProbes.get(bwrap);
  if (cached !== undefined) return cached;
  let probe = spawnSync(bwrap, ["--unshare-user", "--dev-bind", "/", "/", "true"], {
    timeout: 5000,
    stdio: ["ignore", "ignore", "pipe"],
    encoding: "utf8",
  });
  let refusal =
    probe.error === undefined && probe.status === 0
      ? null
      : ((probe.stderr ?? "")
          .split(
            `
`,
          )
          .map((line) => line.trim())
          .find((line) => line.length > 0)
          ?.slice(0, 200) ?? "");
  uid0UserNamespaceProbes.set(bwrap, refusal);
  return refusal;
}
//@ chunk-qg41pqt6.js:737330-739053 esm-fingerprint
async function initializeLinuxNetworkBridge(httpProxyPort, socksProxyPort, socatPath) {
  let socat = socatPath ?? "socat";
  let socketId = randomBytes(8).toString("hex");
  let httpSocketPath = join(tmpdir(), `claude-http-${socketId}.sock`);
  let socksSocketPath = join(tmpdir(), `claude-socks-${socketId}.sock`);
  let httpSocatArgs = [
    `UNIX-LISTEN:${httpSocketPath},fork,reuseaddr`,
    `TCP:localhost:${httpProxyPort},keepalive,keepidle=10,keepintvl=5,keepcnt=3`,
  ];
  logForDebugging_2(`Starting HTTP bridge: ${socat} ${httpSocatArgs.join(" ")}`);
  let httpBridgeProcess = spawn(socat, httpSocatArgs, {
    stdio: "ignore",
  });
  httpBridgeProcess.on("error", (err) => {
    logForDebugging_2(`HTTP bridge process error: ${err}`, {
      level: "error",
    });
  });
  httpBridgeProcess.on("exit", (code, signal) => {
    logForDebugging_2(`HTTP bridge process exited with code ${code}, signal ${signal}`, {
      level: code === 0 ? "info" : "error",
    });
  });
  if (!httpBridgeProcess.pid) throw Error("Failed to start HTTP bridge process");
  let socksBridgeProcess;
  let socksSockPath;
  if (socksProxyPort === httpProxyPort) {
    socksBridgeProcess = httpBridgeProcess;
    socksSockPath = httpSocketPath;
  } else {
    socksSockPath = socksSocketPath;
    let socksSocatArgs = [
      `UNIX-LISTEN:${socksSocketPath},fork,reuseaddr`,
      `TCP:localhost:${socksProxyPort},keepalive,keepidle=10,keepintvl=5,keepcnt=3`,
    ];
    logForDebugging_2(`Starting SOCKS bridge: ${socat} ${socksSocatArgs.join(" ")}`);
    socksBridgeProcess = spawn(socat, socksSocatArgs, {
      stdio: "ignore",
    });
    socksBridgeProcess.on("error", (err) => {
      logForDebugging_2(`SOCKS bridge process error: ${err}`, {
        level: "error",
      });
    });
    socksBridgeProcess.on("exit", (code, signal) => {
      logForDebugging_2(`SOCKS bridge process exited with code ${code}, signal ${signal}`, {
        level: code === 0 ? "info" : "error",
      });
    });
    if (!socksBridgeProcess.pid) {
      if (httpBridgeProcess.pid)
        try {
          process.kill(httpBridgeProcess.pid, "SIGTERM");
        } catch {}
      throw Error("Failed to start SOCKS bridge process");
    }
  }
  let maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    if (
      !httpBridgeProcess.pid ||
      httpBridgeProcess.killed ||
      !socksBridgeProcess.pid ||
      socksBridgeProcess.killed
    )
      throw Error("Linux bridge process died unexpectedly");
    try {
      if (fsModule_2.existsSync(httpSocketPath) && fsModule_2.existsSync(socksSockPath)) {
        logForDebugging_2(`Linux bridges ready after ${i + 1} attempts`);
        break;
      }
    } catch (err) {
      logForDebugging_2(`Error checking sockets (attempt ${i + 1}): ${err}`, {
        level: "error",
      });
    }
    if (i === maxAttempts - 1) {
      if (httpBridgeProcess.pid)
        try {
          process.kill(httpBridgeProcess.pid, "SIGTERM");
        } catch {}
      if (socksBridgeProcess.pid)
        try {
          process.kill(socksBridgeProcess.pid, "SIGTERM");
        } catch {}
      throw Error(`Failed to create bridge sockets after ${maxAttempts} attempts`);
    }
    await new Promise((resolve) => setTimeout(resolve, i * 100));
  }
  return {
    httpSocketPath,
    socksSocketPath: socksSockPath,
    httpBridgeProcess,
    socksBridgeProcess,
    httpProxyPort,
    socksProxyPort,
  };
}
//@ chunk-qg41pqt6.js:739053-739086 esm-fingerprint
var NESTED_USERNS_ENV = "SRT_ALLOW_NESTED_USERNS";
//@ chunk-qg41pqt6.js:739086-739129 esm-layout
function helperEnvironmentPrefix(allowNestedUserNamespaces) {
  return `${NESTED_USERNS_ENV}=${allowNestedUserNamespaces ? "1" : "0"} `;
}
//@ chunk-qg41pqt6.js:739129-739144 esm-layout
var disableUsernsProbes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:739129", () => {
  disableUsernsProbes = new Map();
});
//@ chunk-qg41pqt6.js:739144-739480 esm-fingerprint
function bwrapCanDisableUserns(bwrap) {
  let cached = disableUsernsProbes.get(bwrap);
  if (cached !== undefined) return cached;
  let can = false;
  try {
    if ((fsModule_2.statSync(bwrap).mode & 2048) === 0) {
      let help = spawnSync(bwrap, ["--help"], {
        timeout: 5000,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
      let text = `${help.stdout ?? ""}${help.stderr ?? ""}`;
      if (help.error !== undefined || text.trim() === "") return false;
      can = text.includes("--disable-userns");
    }
  } catch {
    return false;
  }
  disableUsernsProbes.set(bwrap, can);
  return can;
}
//@ chunk-qg41pqt6.js:739480-739490 esm-layout
var noUsernsLimitLogged = false;
//@ chunk-qg41pqt6.js:739490-739670 esm-fingerprint
function resolveApplySeccompPrefix(applyPath, argv0) {
  if (argv0) {
    if (!applyPath) throw Error("seccompConfig.argv0 requires seccompConfig.applyPath");
    return `ARGV0=${quote([argv0])} ${quote([applyPath])} `;
  }
  let binary = getApplySeccompBinaryPath(applyPath);
  return binary ? `${quote([binary])} ` : undefined;
}
//@ chunk-qg41pqt6.js:739670-740413 esm-fingerprint
var RELAYS_LISTEN = [
  "_srt_since=",
  'while [ -r /proc/net/sockstat ] && kill -0 "$_srt_http" "$_srt_socks" 2>/dev/null; do',
  "  _srt_up=0",
  "  for _srt_counts in /proc/net/sockstat /proc/net/sockstat6; do",
  '    [ -r "$_srt_counts" ] || continue',
  "    while read -r _srt_kind _srt_skip _srt_inuse _srt_skip; do",
  '      case "$_srt_kind" in TCP: | TCP6:) _srt_up=$((_srt_up + _srt_inuse)); break ;; esac',
  '    done < "$_srt_counts"',
  "  done",
  '  [ "$_srt_up" -lt 2 ] || break',
  "  read -r _srt_now _srt_skip 2>/dev/null < /proc/uptime || break",
  "  _srt_now=1${_srt_now%.*}${_srt_now#*.}",
  '  [ "$((_srt_now - ${_srt_since:=$_srt_now}))" -lt 30 ] || break',
  "done",
  "unset _srt_since _srt_now _srt_up _srt_counts _srt_kind _srt_skip _srt_inuse _srt_http _srt_socks",
];
//@ chunk-qg41pqt6.js:740413-740965 esm-fingerprint
function buildSandboxCommand(
  httpSocketPath,
  socksSocketPath,
  userCommand,
  applySeccompPrefix,
  shell,
  socatPath,
) {
  let shellPath = shell || "bash";
  let socat = quote([socatPath ?? "socat"]);
  let socatListenOptions = "fork,reuseaddr,backlog=4096";
  let relay = (port, socketPath) =>
    `{ ${socat} TCP6-LISTEN:${port},ipv6only=0,fork,reuseaddr,backlog=4096 UNIX-CONNECT:${socketPath} || exec ${socat} TCP4-LISTEN:${port},fork,reuseaddr,backlog=4096 UNIX-CONNECT:${socketPath}; } >/dev/null 2>&1 &`;
  let socatCommands = [
    relay(3128, httpSocketPath),
    "_srt_http=$!",
    relay(1080, socksSocketPath),
    "_srt_socks=$!",
    "trap 'rc=$?; kill %1 %2 2>/dev/null; exit $rc' EXIT",
    ...RELAYS_LISTEN,
  ];
  if (applySeccompPrefix) {
    let applySeccompCmd = applySeccompPrefix + quote([shellPath, "-c", userCommand]);
    let innerScript = [...socatCommands, applySeccompCmd].join(`
`);
    return `${shellPath} -c ${quote([innerScript])}`;
  } else {
    let innerScript = [...socatCommands, `eval ${quote([userCommand])}`].join(`
`);
    return `${shellPath} -c ${quote([innerScript])}`;
  }
}
//@ chunk-qg41pqt6.js:740965-741067 esm-fingerprint
function isTransientErrno(err) {
  let code = err?.code;
  return code === "EIO" || code === "ESTALE" || code === "EMFILE" || code === "ENFILE" || code === "EAGAIN";
}
//@ chunk-qg41pqt6.js:741067-741135 esm-layout
function retryingTransient(attempt) {
  try {
    return attempt();
  } catch (err) {
    if (!isTransientErrno(err)) throw err;
  }
  return attempt();
}
//@ chunk-qg41pqt6.js:741135-741166 esm-fingerprint
var KERNEL_TOP_LEVEL_DIRS = ["/proc", "/dev", "/sys"];
//@ chunk-qg41pqt6.js:741166-741773 esm-fingerprint
function ancestorPinArgs(seeds, writeRoots) {
  let { rootIsWriteRoot } = writeRoots;
  let pinDirs = new Set();
  let coverDirs = new Set();
  let visited = new Set();
  for (let seed of seeds) {
    if (rootIsWriteRoot && KERNEL_TOP_LEVEL_DIRS.some((dir) => isAtOrUnder(seed, dir))) continue;
    for (
      let dir = path.dirname(seed);
      dir !== "/" && !visited.has(dir) && writeRoots.isWithinAllowedWrite(dir);
      dir = path.dirname(dir)
    ) {
      visited.add(dir);
      if (rootIsWriteRoot) {
        if (path.dirname(dir) === "/") {
          coverDirs.add(dir);
          continue;
        }
      } else if (writeRoots.isAllowedWriteRoot(dir)) continue;
      try {
        fsModule_2.statSync(dir);
      } catch (err) {
        if (isAbsenceErrno(err)) continue;
      }
      pinDirs.add(dir);
    }
  }
  let covers = [...coverDirs];
  if (covers.length > 0)
    logForDebugging_2(`[Sandbox Linux] Covering the pinned ancestors under: ${covers.join(", ")}`);
  return [
    ...[...pinDirs]
      .sort((a, b) => a.split("/").length - b.split("/").length)
      .flatMap((dir) => ["--ro-bind", dir, dir]),
    ...covers.flatMap((dir) => ["--bind", dir, dir]),
  ];
}
//@ chunk-qg41pqt6.js:741773-742957 esm-fingerprint
function pushReadDenyDirMounts(args, unit) {
  let { landing, allowedWritePaths, readAllowPaths } = unit;
  args.push("--tmpfs", landing);
  let restorePlacementOf = (p) => {
    let dest = unit.nameLocation(p);
    if (!isAtOrUnder(dest, landing)) return;
    let { canonical: source, resolved } = unit.resolve(p);
    if (!resolved) {
      logForDebugging_2(
        `[Sandbox Linux] Not restoring ${p} over denyRead tmpfs ${landing}: nothing there resolves (absent, dangling or unreadable), so the only source available is the name itself`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (!isAtOrUnder(source, landing)) {
      logForDebugging_2(
        `[Sandbox Linux] Not restoring ${p} over denyRead tmpfs ${landing}: it resolves outside it, to ${source}`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (source !== dest) {
      let denied = unit.readDenialAround(source);
      if (denied !== undefined) {
        logForDebugging_2(
          `[Sandbox Linux] Not restoring ${p} over denyRead tmpfs ${landing}: it resolves to ${source}, and the read section denies or masks ${denied}`,
          {
            level: "warn",
          },
        );
        return;
      }
    }
    return {
      source,
      dest,
    };
  };
  let restoredWrites = [];
  for (let writePath of allowedWritePaths) {
    let placement = restorePlacementOf(writePath);
    if (placement === undefined) continue;
    args.push("--bind", placement.source, placement.dest);
    restoredWrites.push(placement);
    logForDebugging_2(`[Sandbox Linux] Re-bound write path wiped by denyRead tmpfs: ${writePath}`);
  }
  let restoredReads = [];
  for (let allowPath of readAllowPaths) {
    let placement = restorePlacementOf(allowPath);
    if (placement === undefined) continue;
    if (restoredWrites.some((w) => isAtOrUnder(placement.dest, w.dest))) continue;
    args.push("--ro-bind", placement.source, placement.dest);
    restoredReads.push(placement);
    logForDebugging_2(`[Sandbox Linux] Re-allowed read access within denied region: ${allowPath}`);
  }
  return {
    restoredWrites,
    restoredReads,
  };
}
//@ chunk-qg41pqt6.js:742957-754071 esm-fingerprint
async function generateFilesystemArgs(
  readConfig,
  writeConfig,
  maskedFileBinds,
  maskedFileStoreDir,
  ripgrepConfig = {
    command: "rg",
  },
  mandatoryDenySearchDepth = DEFAULT_MANDATORY_DENY_SEARCH_DEPTH,
  allowGitConfig = false,
  abortSignal,
) {
  let args = [];
  let startedIn = workingDirectory();
  let allowedWritePaths = [];
  let denyWriteArgs = [];
  let mandatoryDenyArgsStart = 1 / 0;
  let readOnlyDenyDirSpellings = new Map();
  let symlinkedDenySpellingDests = new Set();
  let denyWriteRawDests = new Map();
  let unmakeableDenyDests = new Set();
  let emptySource;
  let canonicalFormCache = new Map();
  let canonicalFormGuesses = new Set();
  let canonicalFormUnresolved = new Set();
  let canonicalForm = (p) => {
    let canonical = canonicalFormCache.get(p);
    if (canonical === undefined) {
      try {
        canonical = retryingTransient(() => realPathOf(p));
      } catch (err) {
        canonical = p;
        canonicalFormUnresolved.add(p);
        if (!isAbsenceErrno(err)) {
          canonicalFormGuesses.add(p);
          logForDebugging_2(
            `[Sandbox Linux] Where ${p} really is cannot be told, so what is mounted for it is mounted on this spelling, which bubblewrap may refuse: ${err}`,
            {
              level: "warn",
            },
          );
        }
      }
      canonicalFormCache.set(p, canonical);
    }
    return canonical;
  };
  let canonicalLocationOf = (p) => ({
    canonical: canonicalForm(p),
    resolved: !canonicalFormUnresolved.has(p),
  });
  let mountForms = (p) => {
    let canonical = canonicalForm(p);
    return canonical === p ? [p] : [p, canonical];
  };
  let nameLocationOf = (p) => nameLocation(p, canonicalForm);
  let isWithinAnyAllowedWritePath = (candidatePath) =>
    allowedWritePaths.some((allowedPath) => isAtOrUnder(candidatePath, allowedPath));
  let meetsAnyAllowedWritePath = (candidatePath) =>
    isWithinAnyAllowedWritePath(candidatePath) ||
    allowedWritePaths.some((allowedPath) => coversChildPath(allowedPath, candidatePath));
  let isAllowedWriteRoot = (candidatePath) => allowedWritePaths.includes(candidatePath);
  let readAllowPathsMemo;
  let readAllowPaths = () =>
    readAllowPathsMemo ??
    (readAllowPathsMemo = (readConfig?.allowWithinDeny || []).map((p) =>
      normalizePathForSandbox(p, {
        literal: true,
      }),
    ));
  let ownReadAllowPathsMemo;
  let ownReadAllowPaths = () =>
    ownReadAllowPathsMemo ??
    (ownReadAllowPathsMemo = (readConfig?.ownAllowWithinDeny ?? []).map((p) =>
      normalizePathForSandbox(p, {
        literal: true,
      }),
    ));
  let credentialDenies = new Set(readConfig?.credentialDenyOnly);
  let readExceptionsTo = (isCredential) => (isCredential ? ownReadAllowPaths() : readAllowPaths());
  let readDenyTargetOf = (entry) => {
    for (let candidate = entry; ; candidate = path.dirname(candidate)) {
      if (candidate === "/" && candidate !== entry) return;
      try {
        let stats = retryingTransient(() => fsModule_2.statSync(candidate));
        return {
          path: candidate,
          isDirectory: stats.isDirectory(),
          isStandIn: candidate !== entry,
        };
      } catch (err) {
        if (isAbsenceErrno(err) || candidate === "/") return;
      }
    }
  };
  let readDenyMountOf = (entry) => {
    let target = readDenyTargetOf(entry);
    if (target === undefined) return;
    let landing = canonicalForm(target.path);
    if (landing !== "/")
      return {
        landing,
        named: target.path,
        isDirectory: target.isDirectory,
        isStandIn: target.isStandIn,
      };
    let holder = canonicalForm(path.dirname(target.path));
    if (holder === "/") return;
    return {
      landing: holder,
      named: target.path,
      isDirectory: true,
      isStandIn: true,
    };
  };
  let readDenyEntriesMemo;
  let readDenyEntries = () => {
    if (readDenyEntriesMemo !== undefined) return readDenyEntriesMemo;
    if (!readConfig) return [];
    let entries = [];
    for (let p of readConfig.denyOnly || []) {
      if (
        normalizePathForSandbox(p, {
          literal: true,
        }) !== "/"
      ) {
        entries.push(p);
        continue;
      }
      let children = retryingTransient(() => fsModule_2.readdirSync("/"));
      let isCredential = credentialDenies.has(p);
      for (let child of children) {
        if (KERNEL_TOP_LEVEL_DIRS.includes(`/${child}`)) continue;
        let childLocation = canonicalForm("/" + child);
        if (
          readExceptionsTo(isCredential).some((allowEntry) =>
            isAtOrUnder(childLocation, nameLocationOf(allowEntry)),
          )
        ) {
          logForDebugging_2(`[Sandbox Linux] Root deny expansion skips /${child}: covered by allowRead`);
          continue;
        }
        entries.push("/" + child);
        if (isCredential) credentialDenies.add("/" + child);
      }
    }
    if (fsModule_2.existsSync("/etc/ssh/ssh_config.d")) entries.push("/etc/ssh/ssh_config.d");
    readDenyEntriesMemo = entries;
    return entries;
  };
  let canonicalDepth = (p) => canonicalForm(p).split("/").length;
  let readDenyPlanMemo;
  let readDenyPlan = () =>
    readDenyPlanMemo ??
    (readDenyPlanMemo = readDenyEntries()
      .map((p) => ({
        normalizedPath: normalizePathForSandbox(p, {
          literal: true,
        }),
        isCredential: credentialDenies.has(p),
      }))
      .sort((a, b) => canonicalDepth(a.normalizedPath) - canonicalDepth(b.normalizedPath))
      .map(({ normalizedPath, isCredential }) => {
        let mount = readDenyMountOf(normalizedPath);
        return {
          normalizedPath,
          mount,
          isCredential,
          liftedFile:
            mount !== undefined &&
            !mount.isDirectory &&
            readExceptionsTo(isCredential).some((allowPath) => nameLocationOf(allowPath) === mount.landing),
        };
      }));
  let ancestorPinInsertAt;
  if (writeConfig) {
    args.push("--ro-bind", "/", "/");
    let beneathAllowBinds = args.length;
    for (let pathPattern of writeConfig.allowOnly || []) {
      let normalized = normalizePathForSandbox(pathPattern, {
        literal: true,
      });
      let normalizedPath = normalized === "" ? "" : normalized.replace(/\/+$/, "") || "/";
      logForDebugging_2(`[Sandbox Linux] Processing write path: ${pathPattern} -> ${normalizedPath}`);
      if (normalizedPath.startsWith("/dev/")) {
        logForDebugging_2(`[Sandbox Linux] Skipping /dev path: ${normalizedPath}`);
        continue;
      }
      if (!fsModule_2.existsSync(normalizedPath)) {
        logForDebugging_2(`[Sandbox Linux] Skipping non-existent write path: ${normalizedPath}`);
        continue;
      }
      try {
        let resolvedPath = realPathOf(normalizedPath);
        let normalizedForComparison = normalizedPath.replace(/\/+$/, "");
        if (
          resolvedPath !== normalizedForComparison &&
          isSymlinkOutsideBoundary(normalizedPath, resolvedPath)
        ) {
          logForDebugging_2(
            `[Sandbox Linux] Skipping symlink write path pointing outside expected location: ${pathPattern} -> ${resolvedPath}`,
          );
          continue;
        }
      } catch {
        logForDebugging_2(
          `[Sandbox Linux] Skipping write path that could not be resolved: ${normalizedPath}`,
        );
        continue;
      }
      args.push("--bind", normalizedPath, normalizedPath);
      allowedWritePaths.push(normalizedPath);
    }
    ancestorPinInsertAt = isAllowedWriteRoot("/") ? args.length : beneathAllowBinds;
    let stubSkipVetoInputs;
    let getStubSkipVetoInputs = () => {
      if (stubSkipVetoInputs !== undefined) return stubSkipVetoInputs;
      let unusable = (cause) => {
        logForDebugging_2(
          `[Sandbox Linux] Read-deny prediction unusable (${cause}); keeping every deny placeholder, which refuses to start wherever a covering deny directory is read-only: bubblewrap cannot create a placeholder's mount point there`,
          {
            level: "warn",
          },
        );
        return {
          usable: false,
        };
      };
      try {
        let allowedWritePathsBothForms = allowedWritePaths.flatMap(mountForms);
        let prospectiveReadDenyTmpfsDirsBothForms = readDenyPlan().flatMap(({ mount }) => {
          if (!mount?.isDirectory) return [];
          return [...new Set([...mountForms(mount.named), mount.landing])].filter((form) => form !== "/");
        });
        stubSkipVetoInputs =
          canonicalFormGuesses.size > 0
            ? unusable(`no canonical location for ${[...canonicalFormGuesses].join(", ")}`)
            : {
                usable: true,
                allowedWritePathsBothForms,
                prospectiveReadDenyTmpfsDirsBothForms,
              };
      } catch (err) {
        stubSkipVetoInputs = unusable(`deriving it threw: ${err}`);
      }
      return stubSkipVetoInputs;
    };
    let configuredDenyPaths = writeConfig.denyWithinAllow || [];
    let denyPaths = [
      ...configuredDenyPaths,
      ...(await linuxGetMandatoryDenyPaths(
        ripgrepConfig,
        mandatoryDenySearchDepth,
        allowGitConfig,
        abortSignal,
      )),
    ];
    if (workingDirectory() !== startedIn) throw new WorkingDirectoryChanged();
    let seenDenyWrite = new Set();
    let denyPathAncestors = new Set();
    for (let pathPattern of denyPaths) {
      let rawPath = normalizePathForSandbox(pathPattern, {
        literal: true,
      });
      if (rawPath.startsWith("/dev/")) continue;
      let resolvedPath = resolveSymlinkedDenyPath(rawPath, denyPaths);
      if (resolvedPath === null || resolvedPath.startsWith("/dev/")) continue;
      for (let above of properAncestors(resolvedPath)) denyPathAncestors.add(above);
      if (findSymlinkInPath(resolvedPath, allowedWritePaths)) continue;
      if (resolvedPath !== rawPath) symlinkedDenySpellingDests.add(resolvedPath);
      let isDirectory = false;
      try {
        isDirectory = fsModule_2.statSync(resolvedPath).isDirectory();
      } catch {
        continue;
      }
      if (!isDirectory) continue;
      if (meetsAnyAllowedWritePath(resolvedPath)) {
        let spellings = readOnlyDenyDirSpellings.get(resolvedPath);
        if (spellings === undefined) {
          spellings = new Set();
          readOnlyDenyDirSpellings.set(resolvedPath, spellings);
        }
        spellings.add(rawPath);
      }
    }
    let coveringDirUnsafeVerdicts = new Map();
    let coveringDirIsUnsafe = (denyDir) => {
      let cached = coveringDirUnsafeVerdicts.get(denyDir);
      if (cached !== undefined) return cached;
      let vetoInputs = getStubSkipVetoInputs();
      let unsafe =
        !vetoInputs.usable ||
        vetoInputs.allowedWritePathsBothForms.some(
          (writePath) =>
            coversChildPath(writePath, denyDir) &&
            vetoInputs.prospectiveReadDenyTmpfsDirsBothForms.some((tmpfsDir) =>
              isAtOrUnder(writePath, tmpfsDir),
            ),
        ) ||
        vetoInputs.prospectiveReadDenyTmpfsDirsBothForms.some((tmpfsDir) =>
          [denyDir, ...(readOnlyDenyDirSpellings.get(denyDir) ?? [])].some((spelling) =>
            isAtOrUnder(spelling, tmpfsDir),
          ),
        );
      coveringDirUnsafeVerdicts.set(denyDir, unsafe);
      return unsafe;
    };
    let readOnlyDenyDirs = [...readOnlyDenyDirSpellings.keys()];
    let uncoveredWritePaths = allowedWritePaths.filter(
      (allowedPath) => !readOnlyDenyDirs.some((denyDir) => coversChildPath(allowedPath, denyDir)),
    );
    let coveredBySafeReadOnlyDenyDir = (candidate) => {
      let covered = false;
      for (let denyDir of readOnlyDenyDirs) {
        if (!coversChildPath(candidate, denyDir)) continue;
        if (coveringDirIsUnsafe(denyDir)) {
          if (denyDir === "/") {
            let vetoInputs = getStubSkipVetoInputs();
            if (
              vetoInputs.usable &&
              !vetoInputs.prospectiveReadDenyTmpfsDirsBothForms.some((tmpfsDir) =>
                isAtOrUnder(candidate, tmpfsDir),
              )
            )
              covered = true;
            continue;
          }
          return false;
        }
        covered = true;
      }
      return covered;
    };
    let decidedMountPoints = new Set();
    let decidedMountPointOver = (p) => [p, ...properAncestors(p)].find((at) => decidedMountPoints.has(at));
    let mountPointFor = (absentPath) => {
      let none = (why) => {
        logForDebugging_2(`[Sandbox Linux] No placeholder for non-existent deny path ${absentPath}: ${why}`);
        return;
      };
      let decided = decidedMountPointOver(absentPath);
      if (decided !== undefined) return none(`decided with ${decided}`);
      if (
        !uncoveredWritePaths.some((allowedPath) => isAtOrUnder(absentPath, allowedPath)) ||
        coveredBySafeReadOnlyDenyDir(absentPath)
      )
        return none("it is read-only there");
      let file = fileOnTheWay(path.dirname(absentPath));
      if (file !== undefined) {
        if (seenDenyWrite.has(file)) return none(`${file} is denied itself`);
        if (!uncoveredWritePaths.some((allowedPath) => isAtOrUnder(path.dirname(file), allowedPath)))
          return none(`${file} is a file, in a directory that is read-only`);
        seenDenyWrite.add(file);
        decidedMountPoints.add(file);
        return {
          dest: file,
          kind: MountPointKind.Held,
        };
      }
      let dest = findFirstNonExistentComponent(absentPath);
      decidedMountPoints.add(dest);
      let kind = makeableMountPoint(
        dest,
        denyPathAncestors.has(dest) ? MountPointKind.Directory : MountPointKind.File,
      );
      if (kind === MountPointKind.Unmakeable) unmakeableDenyDests.add(dest);
      else {
        bwrapMountPoints.add(dest);
        registerExitCleanupHandler();
      }
      return {
        dest,
        kind,
      };
    };
    let mountSourceFor = ({ dest, kind }) => {
      switch (kind) {
        case MountPointKind.Held:
          return dest;
        case MountPointKind.Directory:
          return emptySource ?? (emptySource = ensureEmptyMountSourceDir());
        case MountPointKind.File:
          return "/dev/null";
        case MountPointKind.Unmakeable:
          return "/dev/null";
      }
    };
    for (let [index, pathPattern] of denyPaths.entries()) {
      if (index === configuredDenyPaths.length) mandatoryDenyArgsStart = denyWriteArgs.length;
      let rawPath = normalizePathForSandbox(pathPattern, {
        literal: true,
      });
      if (rawPath.startsWith("/dev/")) continue;
      let normalizedPath = resolveSymlinkedDenyPath(rawPath);
      if (normalizedPath === null) {
        let unresolvableSymlink = findSymlinkInPath(rawPath, allowedWritePaths);
        if (unresolvableSymlink && !seenDenyWrite.has(unresolvableSymlink)) {
          seenDenyWrite.add(unresolvableSymlink);
          denyWriteArgs.push("--ro-bind", "/dev/null", unresolvableSymlink);
          denyWriteRawDests.set(unresolvableSymlink, rawPath);
        }
        logForDebugging_2(
          `[Sandbox Linux] Deny path could not be resolved through symlinks, failing closed: ${rawPath}`,
        );
        continue;
      }
      if (normalizedPath !== rawPath)
        logForDebugging_2(`[Sandbox Linux] Resolved symlinked deny path: ${rawPath} -> ${normalizedPath}`);
      if (normalizedPath.startsWith("/dev/")) continue;
      if (seenDenyWrite.has(normalizedPath)) continue;
      seenDenyWrite.add(normalizedPath);
      let symlinkInPath = findSymlinkInPath(normalizedPath, allowedWritePaths);
      if (symlinkInPath) {
        if (!seenDenyWrite.has(symlinkInPath)) {
          seenDenyWrite.add(symlinkInPath);
          denyWriteArgs.push("--ro-bind", "/dev/null", symlinkInPath);
          denyWriteRawDests.set(symlinkInPath, rawPath);
        }
        logForDebugging_2(
          `[Sandbox Linux] Mounted /dev/null at symlink ${symlinkInPath} to prevent symlink replacement attack`,
        );
        continue;
      }
      if (decidedMountPointOver(normalizedPath) !== undefined || !fsModule_2.existsSync(normalizedPath)) {
        let placeholder = mountPointFor(normalizedPath);
        if (placeholder !== undefined) {
          let { dest, kind } = placeholder;
          let source = mountSourceFor(placeholder);
          denyWriteArgs.push("--ro-bind", source, dest);
          denyWriteRawDests.set(dest, rawPath);
          logForDebugging_2(
            kind === MountPointKind.Unmakeable
              ? `[Sandbox Linux] No mount point at ${dest}, which neither bubblewrap nor the command can create, for ${normalizedPath}`
              : `[Sandbox Linux] Mounted ${source} at ${dest} to block creation of ${normalizedPath}`,
          );
        }
        continue;
      }
      if (meetsAnyAllowedWritePath(normalizedPath)) {
        if (!symlinkedDenySpellingDests.has(normalizedPath) && coveredBySafeReadOnlyDenyDir(normalizedPath)) {
          logForDebugging_2(
            `[Sandbox Linux] Skipping deny path already under read-only denied directory: ${normalizedPath}`,
          );
          continue;
        }
        for (let buried of allowedWritePaths)
          if (coversChildPath(buried, normalizedPath))
            logForDebugging_2(
              `[Sandbox Linux] Write deny ${normalizedPath} covers allowed write path ${buried}; ${buried} will be read-only`,
              {
                level: "warn",
              },
            );
        denyWriteArgs.push("--ro-bind", normalizedPath, normalizedPath);
        denyWriteRawDests.set(normalizedPath, rawPath);
      } else
        logForDebugging_2(`[Sandbox Linux] Skipping deny path not within allowed paths: ${normalizedPath}`);
    }
  } else {
    args.push("--bind", "/", "/");
    allowedWritePaths.push("/");
    ancestorPinInsertAt = args.length;
  }
  let readDenyTmpfsUnits = [];
  let fileMasks = [];
  let isHiddenByTmpfs = (location, broughtBackBy) => {
    let broughtBack = (restored) => restored.some((r) => isAtOrUnder(location, r.dest));
    let hidden = false;
    for (let unit of readDenyTmpfsUnits) {
      if (isAtOrUnder(location, unit.landing)) hidden = true;
      if (
        broughtBack(unit.restoredWrites) ||
        (broughtBackBy === "writes and reads" && broughtBack(unit.restoredReads))
      )
        hidden = false;
    }
    return hidden;
  };
  let unlistableDenyDirs = new Set(readConfig?.unlistableDenyDirs ?? []);
  let credentialMaskFakes = new Map();
  for (let { realPath, fakePath } of maskedFileBinds ?? [])
    credentialMaskFakes.set(canonicalForm(realPath), fakePath);
  let fileMaskLandings = new Set(credentialMaskFakes.keys());
  let readDeniedLocations = [
    ...readDenyPlan().flatMap(({ mount, liftedFile }) =>
      mount === undefined || liftedFile ? [] : [mount.landing],
    ),
    ...credentialMaskFakes.keys(),
  ];
  let readDenialAround = (target, landing) =>
    readDeniedLocations.find(
      (denied) =>
        !isAtOrUnder(landing, denied) && (isAtOrUnder(denied, target) || isAtOrUnder(target, denied)),
    );
  let credentialLandings = readDenyPlan().flatMap(({ mount, isCredential }) =>
    mount !== undefined && isCredential ? [mount.landing] : [],
  );
  let leftOut = new Set();
  let outsideCredentials = (p) => {
    let landing = credentialLandings.find((at) => isAtOrUnder(nameLocationOf(p), at));
    if (landing !== undefined && !leftOut.has(p)) {
      leftOut.add(p);
      logForDebugging_2(
        `[Sandbox Linux] ${p} is at or beneath the credential deny ${landing}: not bound back`,
        {
          level: "warn",
        },
      );
    }
    return landing === undefined;
  };
  let restorableReadPaths = readAllowPaths().filter(
    (p) => ownReadAllowPaths().includes(p) || outsideCredentials(p),
  );
  let restorableWritePaths = allowedWritePaths.filter(outsideCredentials);
  for (let { normalizedPath, mount, liftedFile } of readDenyPlan()) {
    if (mount === undefined) {
      logForDebugging_2(
        `[Sandbox Linux] Read deny path mounts nothing this wrap can place (absent, or uninspectable, or a link to '/' with nothing but '/' holding it): ${normalizedPath}`,
      );
      continue;
    }
    let { landing, isDirectory, isStandIn } = mount;
    if (isHiddenByTmpfs(landing, "writes and reads")) {
      logForDebugging_2(`[Sandbox Linux] Skipping read deny already hidden by a denyRead tmpfs: ${landing}`);
      continue;
    }
    if (isDirectory) {
      if (isStandIn)
        logForDebugging_2(
          `[Sandbox Linux] Read deny path ${normalizedPath} cannot be mounted where it names; hiding ${landing} instead`,
          {
            level: "warn",
          },
        );
      let unlistable = unlistableDenyDirs.has(normalizedPath) || unlistableDenyDirs.has(landing);
      if (unlistable)
        logForDebugging_2(
          `[Sandbox Linux] Read-denied directory could not be listed when the glob was expanded; restoring nothing beneath it: ${landing}`,
          {
            level: "warn",
          },
        );
      let restoresNothing = isStandIn || unlistable;
      let restored = pushReadDenyDirMounts(args, {
        landing,
        allowedWritePaths: restoresNothing ? [] : restorableWritePaths,
        readAllowPaths: restoresNothing ? [] : restorableReadPaths,
        resolve: canonicalLocationOf,
        readDenialAround: (restoreTarget) => readDenialAround(restoreTarget, landing),
        nameLocation: nameLocationOf,
      });
      readDenyTmpfsUnits.push({
        landing,
        ...restored,
      });
    } else {
      if (liftedFile) {
        logForDebugging_2(`[Sandbox Linux] Skipping read deny for re-allowed path: ${normalizedPath}`);
        continue;
      }
      if (fileMaskLandings.has(landing)) {
        logForDebugging_2(
          `[Sandbox Linux] Skipping read deny at a destination a file mask already covers: ${normalizedPath} -> ${landing}`,
        );
        continue;
      }
      fileMaskLandings.add(landing);
      args.push("--ro-bind", "/dev/null", landing);
      fileMasks.push({
        source: "/dev/null",
        landing,
      });
    }
  }
  for (let [landing, fakePath] of credentialMaskFakes) {
    args.push("--ro-bind", fakePath, landing);
    fileMasks.push({
      source: fakePath,
      landing,
    });
  }
  let pinArgs = ancestorPinArgs(
    [
      ...denyWriteRawDests.keys(),
      ...fileMasks.map((mask) => mask.landing),
      ...readDenyTmpfsUnits.map((unit) => unit.landing),
    ],
    {
      rootIsWriteRoot: isAllowedWriteRoot("/"),
      isWithinAllowedWrite: isWithinAnyAllowedWritePath,
      isAllowedWriteRoot,
    },
  );
  args.splice(ancestorPinInsertAt, 0, ...pinArgs);
  let pinned = new Set(pinArgs);
  let mandatoryDenyPins = new Set();
  for (let i = mandatoryDenyArgsStart; i < denyWriteArgs.length; i += 3)
    for (
      let dir = path.dirname(denyWriteArgs[i + 2]);
      dir !== "/" && !mandatoryDenyPins.has(dir);
      dir = path.dirname(dir)
    )
      if (pinned.has(dir)) mandatoryDenyPins.add(dir);
  let mandatoryDenyArgs = 3 * mandatoryDenyPins.size;
  let emittedDenyWriteDests = [];
  let restoredReadOnlyWritePaths = new Set();
  for (let i = 0; i < denyWriteArgs.length; i += 3) {
    let dest = denyWriteArgs[i + 2];
    if (unmakeableDenyDests.has(dest)) continue;
    let rawDest = denyWriteRawDests.get(dest) ?? dest;
    if (fileMasks.some((mask) => mask.landing === dest)) continue;
    if (isHiddenByTmpfs(dest, "writes")) {
      logForDebugging_2(`[Sandbox Linux] Skipping denyWrite bind already hidden by denyRead tmpfs: ${dest}`);
      for (let unit of readDenyTmpfsUnits)
        for (let writeMount of unit.restoredWrites) {
          let writePath = writeMount.dest;
          if (!isAtOrUnder(writePath, dest) && !isAtOrUnder(writePath, rawDest)) continue;
          if (fileMasks.some((mask) => mask.landing === writePath)) {
            logForDebugging_2(
              `[Sandbox Linux] Leaving a masked file to its mask inside dropped denyWrite bind ${dest}: ${writePath}`,
            );
            continue;
          }
          if (restoredReadOnlyWritePaths.has(writePath)) continue;
          restoredReadOnlyWritePaths.add(writePath);
          args.push("--ro-bind", writeMount.source, writePath);
          emittedDenyWriteDests.push(writePath);
          logForDebugging_2(
            `[Sandbox Linux] Restoring write path read-only inside dropped denyWrite bind ${dest}: ${writePath}`,
          );
        }
      continue;
    }
    args.push(denyWriteArgs[i], denyWriteArgs[i + 1], dest);
    if (i >= mandatoryDenyArgsStart) mandatoryDenyArgs += 3;
    emittedDenyWriteDests.push(dest);
    if (rawDest !== dest) emittedDenyWriteDests.push(rawDest);
  }
  for (let unit of readDenyTmpfsUnits) {
    let reExposingDest = emittedDenyWriteDests.find((dest) => coversChildPath(unit.landing, dest));
    if (reExposingDest !== undefined) {
      logForDebugging_2(
        `[Sandbox Linux] Re-applying denyRead tmpfs re-exposed by denyWrite bind: ${unit.landing}`,
      );
      if (unit.restoredWrites.length > 0)
        logForDebugging_2(
          `[Sandbox Linux] Restoring write paths read-only inside denyWrite bind ${reExposingDest}: ${unit.restoredWrites.map((w) => w.dest).join(", ")}`,
        );
      args.push("--tmpfs", unit.landing);
      for (let restored of [...unit.restoredWrites, ...unit.restoredReads])
        args.push("--ro-bind", restored.source, restored.dest);
    }
  }
  for (let mask of fileMasks)
    if (emittedDenyWriteDests.some((dest) => isAtOrUnder(mask.landing, dest))) {
      logForDebugging_2(
        `[Sandbox Linux] Re-applying file mask re-exposed by denyWrite bind: ${mask.landing}`,
      );
      args.push("--ro-bind", mask.source, mask.landing);
    }
  if (maskedFileStoreDir !== undefined) args.push("--ro-bind", maskedFileStoreDir, maskedFileStoreDir);
  if (emptySource !== undefined) args.push("--ro-bind", emptySource, emptySource);
  return {
    args,
    mandatoryDenyArgs,
  };
}
//@ chunk-qg41pqt6.js:754071-758042 esm-fingerprint
async function wrapCommandWithSandboxLinux(params) {
  let {
    command,
    commandId,
    needsNetworkRestriction,
    httpSocketPath,
    socksSocketPath,
    httpProxyPort,
    socksProxyPort,
    proxyAuthToken,
    caCertPath,
    javaAgentJarPath,
    unsetEnvVars,
    setEnvVars,
    maskedFileBinds,
    maskedFileStoreDir,
    enableWeakerNestedSandbox,
    allowNestedUserNamespaces,
    allowAllUnixSockets,
    binShell,
    ripgrepConfig = {
      command: "rg",
    },
    mandatoryDenySearchDepth = DEFAULT_MANDATORY_DENY_SEARCH_DEPTH,
    allowGitConfig = false,
    gitSafeDirectories,
    seccompConfig,
    bwrapPath,
    socatPath,
    observeSocketPath,
    abortSignal,
  } = params;
  let readConfig = readNamesOf(params.readConfig);
  let writeConfig = writeNamesOf(params.writeConfig);
  let hasReadRestrictions =
    (readConfig && readConfig.denyOnly.length > 0) ||
    (maskedFileBinds !== undefined && maskedFileBinds.length > 0);
  let hasWriteRestrictions = writeConfig !== undefined;
  let hasEnvRestrictions =
    (unsetEnvVars !== undefined && unsetEnvVars.length > 0) ||
    (setEnvVars !== undefined && Object.keys(setEnvVars).length > 0);
  let hasGitConfig = (gitSafeDirectories?.length ?? 0) > 0;
  if (
    !needsNetworkRestriction &&
    !hasReadRestrictions &&
    !hasWriteRestrictions &&
    !hasEnvRestrictions &&
    !hasGitConfig
  )
    return command;
  activeSandboxCount++;
  let countedAfter = forcedCleanups;
  let attributionKey = encodeSandboxedCommand(orDefault(command, commandId));
  let bwrapArgs = ["--new-session", "--die-with-parent"];
  let applySeccompPrefix;
  try {
    if (!allowAllUnixSockets) {
      applySeccompPrefix = resolveApplySeccompPrefix(seccompConfig?.applyPath, seccompConfig?.argv0);
      if (!applySeccompPrefix)
        logForDebugging_2(
          "[Sandbox Linux] apply-seccomp binary not available - unix socket blocking disabled. Install @anthropic-ai/sandbox-runtime globally for full protection.",
          {
            level: "warn",
          },
        );
      else {
        applySeccompPrefix = helperEnvironmentPrefix(allowNestedUserNamespaces === true) + applySeccompPrefix;
        logForDebugging_2("[Sandbox Linux] Applying seccomp filter for Unix socket blocking");
      }
    } else logForDebugging_2("[Sandbox Linux] Skipping seccomp filter - allowAllUnixSockets is enabled");
    if (observeSocketPath && applySeccompPrefix)
      if (fsModule_2.existsSync(observeSocketPath)) {
        bwrapArgs.push("--bind", observeSocketPath, observeSocketPath);
        bwrapArgs.push("--setenv", "SRT_OBSERVE_SOCK", observeSocketPath);
        bwrapArgs.push("--setenv", "SRT_ENCODED_CMD", attributionKey);
      } else
        logForDebugging_2(
          "[Sandbox Linux] observe socket missing \u2014 supervisor not running; " +
            "continuing without violation monitoring",
        );
    if (hasEnvRestrictions) {
      for (let name of unsetEnvVars ?? []) bwrapArgs.push("--unsetenv", name);
      for (let [name, value] of Object.entries(setEnvVars ?? {})) bwrapArgs.push("--setenv", name, value);
    }
    if (gitSafeDirectories && gitSafeDirectories.length > 0) {
      let gitCfg = buildPosixGitSafeDirEnv({
        safeDirs: gitSafeDirectories,
        unsetEnvVars,
        setEnvVars,
      });
      for (let [name, value] of Object.entries(gitCfg)) bwrapArgs.push("--setenv", name, value);
    }
    if (needsNetworkRestriction) {
      bwrapArgs.push("--unshare-net");
      if (httpSocketPath && socksSocketPath) {
        if (!fsModule_2.existsSync(httpSocketPath))
          throw Error(
            `Linux HTTP bridge socket does not exist: ${httpSocketPath}. The bridge process may have died. Try reinitializing the sandbox.`,
          );
        if (!fsModule_2.existsSync(socksSocketPath))
          throw Error(
            `Linux SOCKS bridge socket does not exist: ${socksSocketPath}. The bridge process may have died. Try reinitializing the sandbox.`,
          );
        bwrapArgs.push("--bind", httpSocketPath, httpSocketPath);
        if (socksSocketPath !== httpSocketPath) bwrapArgs.push("--bind", socksSocketPath, socksSocketPath);
        let proxyEnv = generateProxyEnvVars(
          3128,
          1080,
          caCertPath,
          proxyAuthToken,
          writeConfig === undefined,
          attributionKey,
        );
        bwrapArgs.push(
          ...proxyEnv.flatMap((env) => {
            let firstEq = env.indexOf("=");
            let key = env.slice(0, firstEq);
            let value = env.slice(firstEq + 1);
            return ["--setenv", key, value];
          }),
        );
        let javaToolOptions = buildJavaToolOptions({
          agentJarPath: javaAgentJarPath,
          unsetEnvVars,
          inherited: process.env.JAVA_TOOL_OPTIONS,
        });
        if (javaToolOptions !== undefined) bwrapArgs.push("--setenv", "JAVA_TOOL_OPTIONS", javaToolOptions);
        if (httpProxyPort !== undefined)
          bwrapArgs.push("--setenv", "CLAUDE_CODE_HOST_HTTP_PROXY_PORT", String(httpProxyPort));
        if (socksProxyPort !== undefined)
          bwrapArgs.push("--setenv", "CLAUDE_CODE_HOST_SOCKS_PROXY_PORT", String(socksProxyPort));
      }
    }
    let { args: fsArgs, mandatoryDenyArgs } = await generateFilesystemArgs(
      readConfig,
      writeConfig,
      maskedFileBinds,
      maskedFileStoreDir,
      ripgrepConfig,
      mandatoryDenySearchDepth,
      allowGitConfig,
      abortSignal,
    );
    let mountsStart = bwrapArgs.length;
    bwrapArgs.push(...fsArgs);
    let mounts = {
      start: mountsStart,
      end: bwrapArgs.length,
      mandatoryDenyArgs,
    };
    bwrapArgs.push("--dev", "/dev");
    bwrapArgs.push("--unshare-pid");
    let euid = process.geteuid?.();
    let hasSetfcap = processHasBoundingCapability(CAP_SETFCAP);
    if (euid === 0 && !hasSetfcap && !setfcapMissingLogged) {
      setfcapMissingLogged = true;
      logForDebugging_2(`[Sandbox Linux] ${CAP_SETFCAP_MISSING_MESSAGE}`, {
        level: "warn",
      });
    }
    bwrapArgs.push(
      "--unshare-user",
      ...capabilityArgs({
        euid,
        hasSetfcap,
        usesSeccompHelper: applySeccompPrefix !== undefined,
      }),
    );
    if (!enableWeakerNestedSandbox) bwrapArgs.push("--proc", "/proc");
    else bwrapArgs.push("--bind", "/proc", "/proc");
    bwrapArgs.push("--unsetenv", NESTED_USERNS_ENV);
    if (applySeccompPrefix === undefined && allowNestedUserNamespaces !== true) {
      let bwrap = enableWeakerNestedSandbox ? null : (bwrapPath ?? whichSync("bwrap"));
      if (bwrap !== null && bwrapCanDisableUserns(bwrap)) bwrapArgs.push("--disable-userns");
      else if (!noUsernsLimitLogged) {
        noUsernsLimitLogged = true;
        logForDebugging_2(
          "[Sandbox Linux] no seccomp helper in use, and bubblewrap cannot disable user namespaces (needs 0.8.0 or later, not setuid, and no enableWeakerNestedSandbox) - a sandboxed command that creates one can undo the write denies",
          {
            level: "warn",
          },
        );
      }
    }
    let shellName = binShell || "bash";
    let shell = whichSync(shellName);
    if (!shell) throw Error(`Shell '${shellName}' not found in PATH`);
    bwrapArgs.push("--", shell, "-c");
    if (needsNetworkRestriction && httpSocketPath && socksSocketPath) {
      let sandboxCommand = buildSandboxCommand(
        httpSocketPath,
        socksSocketPath,
        command,
        applySeccompPrefix,
        shell,
        socatPath,
      );
      bwrapArgs.push(sandboxCommand);
    } else if (applySeccompPrefix) {
      let applySeccompCmd = applySeccompPrefix + quote([shell, "-c", command]);
      bwrapArgs.push(applySeccompCmd);
    } else bwrapArgs.push(command);
    let wrappedCommand = renderBwrapInvocation(bwrapPath ?? "bwrap", bwrapArgs, mounts);
    let restrictions = [];
    if (needsNetworkRestriction) restrictions.push("network");
    if (hasReadRestrictions || hasWriteRestrictions) restrictions.push("filesystem");
    if (hasEnvRestrictions) restrictions.push("env");
    if (applySeccompPrefix) restrictions.push("seccomp(unix-block)");
    logForDebugging_2(`[Sandbox Linux] Wrapped command with bwrap (${restrictions.join(", ")} restrictions)`);
    if (forcedCleanups !== countedAfter) activeSandboxCount++;
    return wrappedCommand;
  } catch (error) {
    if (forcedCleanups === countedAfter) cleanupBwrapMountPoints();
    throw error;
  }
}
//@ chunk-eswddw2z.js:218-248 esm-fingerprint
var sandboxPaths = ["/proc", "/sys", "/dev"];
export {
  capabilityArgs,
  processHasBoundingCapability,
  CAP_SETFCAP,
  sandboxPaths,
  markExitCleanupNeeded,
  linuxGetCwdMandatoryDenyPaths,
  initializeLinuxNetworkBridge,
  checkLinuxDependencies,
  wrapCommandWithSandboxLinux,
  WorkingDirectoryChanged,
  cleanupBwrapMountPoints,
};
