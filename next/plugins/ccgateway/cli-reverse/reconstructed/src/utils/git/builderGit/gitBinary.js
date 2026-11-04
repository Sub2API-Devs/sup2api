/**
 * utils/git/builderGit/gitBinary.ts
 *
 * builderGit：定位 git 可执行文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (17)
 * attribution: placement 17
 */
import { readdirSync } from "fs";
import { join } from "path";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq } from "../../collections.js";
import { isReachableOrUnsafe, isPathDirSafe, createReachCollector } from "./sandboxReach.js";
import { getErrnoCode } from "../../errors.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { whichOnPath } from "../../which.js";
import { auditEnvironment } from "./gitConfigAudit.js";
import { HostScoped } from "../../hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:277278-277426 placement
var PROBED_PROGRAMS; // deferred: uses getPlatform (../../platform.js) of its import cycle while loading; runs once the cycle is complete
var WINDOWS_EXEC_EXTENSIONS;
var MAX_PATHEXT_ENTRIES;
deferInit("chunk-s61vbvea.js:277278", () => {
  PROBED_PROGRAMS = getPlatform_2() === "windows" ? ["git", "powershell.exe"] : ["git", "ps"];
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
//@ chunk-s61vbvea.js:277426-277665 placement
function listProgramNames(envCaseInsensitive) {
  let execExtensions =
    getPlatform_2() === "windows"
      ? uniq([
          ...WINDOWS_EXEC_EXTENSIONS,
          ...(envCaseInsensitive ?? "")
            .split(";")
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => /^\.[^.\\/]+$/.test(entry))
            .slice(0, MAX_PATHEXT_ENTRIES),
        ])
      : [];
  return PROBED_PROGRAMS.flatMap((program) =>
    getPlatform_2() === "windows" && !program.includes(".")
      ? [program, ...execExtensions.map((extension) => program + extension)]
      : [program],
  );
}
//@ chunk-s61vbvea.js:277665-277704 placement
/**
 * 用探测程序列表判断某个程序目录是否安全（无越权文件）。
 */
function isProgramDirSafe(realCandidate, reachPredicate, collector) {
  return isProgramDirSafeFor(realCandidate, reachPredicate, PROBED_PROGRAMS, collector);
}
//@ chunk-s61vbvea.js:277704-277799 placement
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
//@ chunk-s61vbvea.js:277799-277998 placement (2.1.88 match: isRealPathWithinTeamDir, 0.762)
function isRealPathWithinTeamDir(realCandidate) {
  try {
    let mapped = readdirSync(realCandidate, {
      withFileTypes: true,
    })
      .filter((dirent) => getPlatform_2() === "windows" || !dirent.isFile())
      .map((dirent) => dirent.name);
    return mapped.length > MAX_DIRECTORY_ENTRIES ? null : mapped;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-s61vbvea.js:277998-278413 placement
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
//@ chunk-s61vbvea.js:278413-278534 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isRealPathWithinTeamDir_2(realCandidate) {
  try {
    let entries = readdirSync(realCandidate);
    return entries.length > MAX_DIRECTORY_ENTRIES ? null : entries;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-s61vbvea.js:278534-278546 placement
var MAX_DIRECTORY_ENTRIES = 1024;
//@ chunk-s61vbvea.js:278546-278785 placement
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
//@ chunk-s61vbvea.js:278785-278810 placement
var WINDOWS_EXEC_RE = /\.(?:exe|com)$/i;
//@ chunk-s61vbvea.js:278810-278956 placement
function findGitOnPath(pathValue, platform = "linux") {
  let gitPath = whichOnPath("git", pathValue);
  if (platform !== "win32" || gitPath === null || WINDOWS_EXEC_RE.test(gitPath)) return gitPath;
  let gitExePath = whichOnPath("git.exe", pathValue);
  return gitExePath !== null && WINDOWS_EXEC_RE.test(gitExePath) ? gitExePath : null;
}
//@ chunk-s61vbvea.js:278956-279038 placement
/**
 * 判断 PATH 上只有 shim（git 解析不到 exe，但 which 能找到）。
 */
function isGitShimOnly() {
  let pathValue = getEnvCaseInsensitive(auditEnvironment(), "PATH") ?? "";
  return findGitOnPath(pathValue) === null && whichOnPath("git", pathValue) !== null;
}
//@ chunk-s61vbvea.js:279038-279145 placement
function windowsGitNote() {
  return getPlatform_2() === "windows"
    ? " (only git.exe counts; git.cmd and git.bat wrappers are skipped)"
    : "";
}
//@ chunk-s61vbvea.js:279145-279290 placement
/**
 * Windows 目录须含 git.exe 的说明。
 */
function windowsGitDirNote() {
  return getPlatform_2() === "windows"
    ? " On Windows, that directory must hold git.exe itself, since git.cmd and git.bat wrappers are skipped."
    : "";
}
//@ chunk-s61vbvea.js:279290-279316 placement
var gitBinaryStateRegistry; // deferred: uses GitBinaryError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:279290", () => {
  gitBinaryStateRegistry = new HostScoped(() => new GitBinaryError());
});
//@ chunk-s61vbvea.js:279316-279354 placement
/**
 * 取当前宿主的 git 二进制状态缓存。
 */
function currentGitBinaryState() {
  return gitBinaryStateRegistry.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:279354-279403 placement
/**
 * 在给定环境中解析 PATH 上的 git 可执行文件。
 */
function gitExeOnPathInEnv(gitEnv, probes = currentGitBinaryState()) {
  return probes.gitExeOnPath(gitEnv);
}
export {
  GitBinaryError,
  gitExeOnPathInEnv,
  currentGitBinaryState,
  isGitShimOnly,
  windowsGitDirNote,
  listProgramNames,
  isProgramDirSafe,
  findXcodeGit,
  isProgramDirSafeFor,
  windowsGitNote,
};
