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

//@ chunk-s61vbvea.js:277278-277426 placement
var PROBED_PROGRAMS = getPlatform_2() === "windows" ? ["git", "powershell.exe"] : ["git", "ps"];
var WINDOWS_EXEC_EXTENSIONS = [
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
var MAX_PATHEXT_ENTRIES = 32;
//@ chunk-s61vbvea.js:277426-277665 placement
function listProgramNames(envCaseInsensitive) {
  let n =
    getPlatform_2() === "windows"
      ? uniq([
          ...WINDOWS_EXEC_EXTENSIONS,
          ...(envCaseInsensitive ?? "")
            .split(";")
            .map((r) => r.trim().toLowerCase())
            .filter((r) => /^\.[^.\\/]+$/.test(r))
            .slice(0, MAX_PATHEXT_ENTRIES),
        ])
      : [];
  return PROBED_PROGRAMS.flatMap((r) =>
    getPlatform_2() === "windows" && !r.includes(".") ? [r, ...n.map((s) => r + s)] : [r],
  );
}
//@ chunk-s61vbvea.js:277665-277704 placement
/**
 * 用探测程序列表判断某个程序目录是否安全（无越权文件）。
 */
function isProgramDirSafe(e, n, r) {
  return isProgramDirSafeFor(e, n, PROBED_PROGRAMS, r);
}
//@ chunk-s61vbvea.js:277704-277799 placement
/**
 * 判断目录 e 对路径 n 是否安全：可达或不在团队目录内即可。
 */
function isProgramDirSafeFor(realCandidate, reachPredicate, r, s) {
  if (isReachableOrUnsafe(realCandidate, reachPredicate, s)) return true;
  let h = isRealPathWithinTeamDir(realCandidate);
  return h === null || !isPathDirSafe(realCandidate, reachPredicate, [...h, ...r], s);
}
//@ chunk-s61vbvea.js:277799-277998 placement = isRealPathWithinTeamDir (0.762)
function isRealPathWithinTeamDir(realCandidate) {
  try {
    let mapped = readdirSync(realCandidate, {
      withFileTypes: true,
    })
      .filter((r) => getPlatform_2() === "windows" || !r.isFile())
      .map((r) => r.name);
    return mapped.length > MAX_DIRECTORY_ENTRIES ? null : mapped;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-s61vbvea.js:277998-278413 placement
function findXcodeGit(e, reachPredicate, r) {
  return [e, join(e, "Contents", "Developer")].some((s) => {
    if (isReachableOrUnsafe(s, reachPredicate, r)) return true;
    let h = isReachableOrUnsafe(join(s, "Toolchains"), reachPredicate, r)
      ? null
      : isRealPathWithinTeamDir_2(join(s, "Toolchains"));
    let y = h === null ? null : [s, ...h.map((S) => join(s, "Toolchains", S))];
    return (
      y === null ||
      !isPathDirSafe(join(s, "usr", "lib"), reachPredicate, ["libxcrun.dylib"], r) ||
      !isPathDirSafe(join(s, "usr", "bin"), reachPredicate, ["xcrun", "xcodebuild"], r) ||
      y.some(
        (S) =>
          !isPathDirSafe(join(S, "usr", "bin"), reachPredicate, ["git"], r) ||
          isProgramDirSafe(join(S, "usr", "libexec", "git-core"), reachPredicate, r),
      )
    );
  });
}
//@ chunk-s61vbvea.js:278413-278534 placement = isRealPathWithinTeamDir (1)
function isRealPathWithinTeamDir_2(realCandidate) {
  try {
    let n = readdirSync(realCandidate);
    return n.length > MAX_DIRECTORY_ENTRIES ? null : n;
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
  constructor(e = "host") {
    this.screenMemo = e === "host" ? undefined : createReachCollector(e === "operation");
  }
  gitExeOnPath(e) {
    let n = getEnvCaseInsensitive(e, "PATH") ?? "";
    let r = this.#e.get(n);
    if (r !== undefined) return r;
    let gitOnPath = findGitOnPath(n);
    if (gitOnPath !== null) this.#e.set(n, gitOnPath);
    return gitOnPath;
  }
}
//@ chunk-s61vbvea.js:278785-278810 placement
var WINDOWS_EXEC_RE = /\.(?:exe|com)$/i;
//@ chunk-s61vbvea.js:278810-278956 placement
function findGitOnPath(e, n = "linux") {
  let r = whichOnPath("git", e);
  if (n !== "win32" || r === null || WINDOWS_EXEC_RE.test(r)) return r;
  let s = whichOnPath("git.exe", e);
  return s !== null && WINDOWS_EXEC_RE.test(s) ? s : null;
}
//@ chunk-s61vbvea.js:278956-279038 placement
/**
 * 判断 PATH 上只有 shim（git 解析不到 exe，但 which 能找到）。
 */
function isGitShimOnly() {
  let e = getEnvCaseInsensitive(auditEnvironment(), "PATH") ?? "";
  return findGitOnPath(e) === null && whichOnPath("git", e) !== null;
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
var gitBinaryStateRegistry = new HostScoped(() => new GitBinaryError());
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
function gitExeOnPathInEnv(gitEnv, n = currentGitBinaryState()) {
  return n.gitExeOnPath(gitEnv);
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
