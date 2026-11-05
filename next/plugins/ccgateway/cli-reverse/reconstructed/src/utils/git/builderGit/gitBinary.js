/**
 * utils/git/builderGit/gitBinary.ts
 *
 * builderGit：定位 git 可执行文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fepf8jp6.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdirSync } from "fs";
import { join } from "path";
import { getPlatform } from "../../platform.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { isReachableOrUnsafe, isPathDirSafe, createReachCollector } from "./sandboxReach.js";
import { getErrnoCode } from "../../errors.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { whichOnPath } from "../../which.js";
import { auditEnvironment } from "./gitConfigAudit.js";
import { HostScoped } from "../../hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:70958-71106 placement
var PROBED_PROGRAMS; // deferred: uses getPlatform (../../platform.js) of its import cycle while loading; runs once the cycle is complete
var WINDOWS_EXEC_EXTENSIONS;
var MAX_PATHEXT_ENTRIES;
deferInit("chunk-fepf8jp6.js:70958", () => {
  PROBED_PROGRAMS = getPlatform() === "windows" ? ["git", "powershell.exe"] : ["git", "ps"];
  WINDOWS_EXEC_EXTENSIONS = [
    ".exe",
    ".com",
    ".cmd",
    ".bat",
    ".vbs",
    ".vbe",
    ".js",
    ".jse",
    ".wsf",
    ".wsh",
    ".msc",
  ];
  MAX_PATHEXT_ENTRIES = 32;
});
//@ chunk-fepf8jp6.js:71106-71345 placement
function listProgramNames(envCaseInsensitive) {
  let execExtensions =
    getPlatform() === "windows"
      ? normalizeCaseForComparison_2([
          ...WINDOWS_EXEC_EXTENSIONS,
          ...(envCaseInsensitive ?? "")
            .split(";")
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => /^\.[^.\\/]+$/.test(entry))
            .slice(0, MAX_PATHEXT_ENTRIES),
        ])
      : [];
  return PROBED_PROGRAMS.flatMap((program) =>
    getPlatform() === "windows" && !program.includes(".")
      ? [program, ...execExtensions.map((extension) => program + extension)]
      : [program],
  );
}
//@ chunk-fepf8jp6.js:71345-71384 placement
/**
 * 用探测程序列表判断某个程序目录是否安全（无越权文件）。
 */
function isProgramDirSafe(realCandidate, reachPredicate, collector) {
  return isProgramDirSafeFor(realCandidate, reachPredicate, PROBED_PROGRAMS, collector);
}
//@ chunk-fepf8jp6.js:71384-71479 placement
/**
 * 判断目录 e 对路径 n 是否安全：可达或不在团队目录内即可。
 */
function isProgramDirSafeFor(realCandidate, programDir, expectedEntries, collector) {
  if (isReachableOrUnsafe(realCandidate, programDir, collector)) return true;
  let entries = isRealPathWithinTeamDir(realCandidate);
  return (
    entries === null || !isPathDirSafe(realCandidate, programDir, [...entries, ...expectedEntries], collector)
  );
}
//@ chunk-fepf8jp6.js:71479-71678 placement (2.1.88 match: isRealPathWithinTeamDir, 0.762)
function isRealPathWithinTeamDir(realCandidate) {
  try {
    let mapped = readdirSync(realCandidate, {
      withFileTypes: true,
    })
      .filter((dirent) => getPlatform() === "windows" || !dirent.isFile())
      .map((dirent) => dirent.name);
    return mapped.length > MAX_DIRECTORY_ENTRIES ? null : mapped;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-fepf8jp6.js:71678-72085 placement
function findXcodeGit(xcodeRoot, reachPredicate, collector) {
  return [xcodeRoot, join(xcodeRoot, "Contents", "Developer")].some((candidateRoot) => {
    if (isReachableOrUnsafe(candidateRoot, reachPredicate, collector)) return true;
    let toolchainEntries = isReachableOrUnsafe(join(candidateRoot, "Toolchains"), reachPredicate, collector)
      ? null
      : isRealPathWithinTeamDir_2(join(candidateRoot, "Toolchains"));
    let toolchainPaths =
      toolchainEntries === null
        ? null
        : [
            candidateRoot,
            ...toolchainEntries.map((toolchainName) => join(candidateRoot, "Toolchains", toolchainName)),
          ];
    return (
      toolchainPaths === null ||
      !isPathDirSafe(join(candidateRoot, "usr", "lib"), reachPredicate, ["libxcrun.dylib"], collector) ||
      !isPathDirSafe(join(candidateRoot, "usr", "bin"), reachPredicate, ["xcrun", "xcodebuild"], collector) ||
      toolchainPaths.some(
        (toolchainPath) =>
          !isPathDirSafe(join(toolchainPath, "usr", "bin"), reachPredicate, ["git"], collector) ||
          isProgramDirSafe(join(toolchainPath, "usr", "libexec", "git-core"), reachPredicate, collector),
      )
    );
  });
}
//@ chunk-fepf8jp6.js:72085-72206 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isRealPathWithinTeamDir_2(realCandidate) {
  try {
    let entries = readdirSync(realCandidate);
    return entries.length > MAX_DIRECTORY_ENTRIES ? null : entries;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-fepf8jp6.js:72206-72218 placement
var MAX_DIRECTORY_ENTRIES = 1024;
//@ chunk-fepf8jp6.js:72218-72457 placement
class GitBinaryError {
  #e = new Map();
  screenMemo;
  constructor(scope = "host") {
    this.screenMemo = scope === "host" ? undefined : createReachCollector(scope === "operation");
  }
  gitExeOnPath(env) {
    let pathValue = getEnvCaseInsensitive(env, "PATH") ?? "";
    let cachedPath = this.#e.get(pathValue);
    if (cachedPath !== undefined) return cachedPath;
    let gitOnPath = findGitOnPath(pathValue);
    if (gitOnPath !== null) this.#e.set(pathValue, gitOnPath);
    return gitOnPath;
  }
}
//@ chunk-fepf8jp6.js:72457-72482 placement
var WINDOWS_EXEC_RE = /\.(?:exe|com)$/i;
//@ chunk-fepf8jp6.js:72482-72628 placement
function findGitOnPath(pathValue, platform = "linux") {
  let gitPath = whichOnPath("git", pathValue);
  if (platform !== "win32" || gitPath === null || WINDOWS_EXEC_RE.test(gitPath)) return gitPath;
  let gitExePath = whichOnPath("git.exe", pathValue);
  return gitExePath !== null && WINDOWS_EXEC_RE.test(gitExePath) ? gitExePath : null;
}
//@ chunk-fepf8jp6.js:72628-72710 placement
/**
 * 判断 PATH 上只有 shim（git 解析不到 exe，但 which 能找到）。
 */
function isGitShimOnly() {
  let pathValue = getEnvCaseInsensitive(auditEnvironment(), "PATH") ?? "";
  return findGitOnPath(pathValue) === null && whichOnPath("git", pathValue) !== null;
}
//@ chunk-fepf8jp6.js:72710-72817 placement
function windowsGitNote() {
  return getPlatform() === "windows"
    ? " (only git.exe counts; git.cmd and git.bat wrappers are skipped)"
    : "";
}
//@ chunk-fepf8jp6.js:72817-72962 placement
/**
 * Windows 目录须含 git.exe 的说明。
 */
function windowsGitDirNote() {
  return getPlatform() === "windows"
    ? " On Windows, that directory must hold git.exe itself, since git.cmd and git.bat wrappers are skipped."
    : "";
}
//@ chunk-fepf8jp6.js:72962-72988 placement
var gitBinaryStateRegistry; // deferred: uses GitBinaryError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fepf8jp6.js:72962", () => {
  gitBinaryStateRegistry = new HostScoped(() => new GitBinaryError());
});
//@ chunk-fepf8jp6.js:72988-73026 placement
/**
 * 取当前宿主的 git 二进制状态缓存。
 */
function currentGitBinaryState() {
  return gitBinaryStateRegistry.of(getRootSession().host);
}
//@ chunk-fepf8jp6.js:73026-73074 placement
/**
 * 在给定环境中解析 PATH 上的 git 可执行文件。
 */
function gitExeOnPathInEnv(gitEnv, probes = currentGitBinaryState()) {
  return probes.gitExeOnPath(gitEnv);
}
export {
  listProgramNames,
  isProgramDirSafe,
  findXcodeGit,
  isProgramDirSafeFor,
  currentGitBinaryState,
  gitExeOnPathInEnv,
  windowsGitNote,
  GitBinaryError,
  isGitShimOnly,
  windowsGitDirNote,
};
