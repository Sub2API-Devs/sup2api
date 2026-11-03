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
import { readdirSync, readdirSync as readdirSync_2, readdirSync as readdirSync_3 } from "fs";
import {
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
} from "path";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq } from "../../collections.js";
import { isReachableOrUnsafe, isPathDirSafe, Lqr } from "./sandboxReach.js";
import { getErrnoCode } from "../../errors.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { whichOnPath } from "../../which.js";
import { Oqr } from "./gitConfigAudit.js";
import { HostScoped } from "../../hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";

//@ chunk-s61vbvea.js:277278-277426 placement
var PROBED_PROGRAMS = getPlatform_2() === "windows" ? ["git", "powershell.exe"] : ["git", "ps"],
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
  ],
  MAX_PATHEXT_ENTRIES = 32;
//@ chunk-s61vbvea.js:277426-277665 placement
function listProgramNames(e) {
  let n =
    getPlatform_2() === "windows"
      ? uniq([
          ...WINDOWS_EXEC_EXTENSIONS,
          ...(e ?? "")
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
function yS(e, n, r) {
  return xd(e, n, PROBED_PROGRAMS, r);
}
//@ chunk-s61vbvea.js:277704-277799 placement
function xd(e, n, r, s) {
  if (isReachableOrUnsafe(e, n, s)) return !0;
  let h = isRealPathWithinTeamDir(e);
  return h === null || !isPathDirSafe(e, n, [...h, ...r], s);
}
//@ chunk-s61vbvea.js:277799-277998 placement = isRealPathWithinTeamDir (0.762)
function isRealPathWithinTeamDir(realCandidate) {
  try {
    let mapped = readdirSync(realCandidate, { withFileTypes: !0 })
      .filter((r) => getPlatform_2() === "windows" || !r.isFile())
      .map((r) => r.name);
    return mapped.length > SS ? null : mapped;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-s61vbvea.js:277998-278413 placement
function findXcodeGit(e, n, r) {
  return [e, join_7(e, "Contents", "Developer")].some((s) => {
    if (isReachableOrUnsafe(s, n, r)) return !0;
    let h = isReachableOrUnsafe(join_7(s, "Toolchains"), n, r)
        ? null
        : isRealPathWithinTeamDir_2(join_7(s, "Toolchains")),
      y = h === null ? null : [s, ...h.map((S) => join_7(s, "Toolchains", S))];
    return (
      y === null ||
      !isPathDirSafe(join_7(s, "usr", "lib"), n, ["libxcrun.dylib"], r) ||
      !isPathDirSafe(join_7(s, "usr", "bin"), n, ["xcrun", "xcodebuild"], r) ||
      y.some(
        (S) =>
          !isPathDirSafe(join_7(S, "usr", "bin"), n, ["git"], r) ||
          yS(join_7(S, "usr", "libexec", "git-core"), n, r),
      )
    );
  });
}
//@ chunk-s61vbvea.js:278413-278534 placement = isRealPathWithinTeamDir (1)
function isRealPathWithinTeamDir_2(realCandidate) {
  try {
    let n = readdirSync(realCandidate);
    return n.length > SS ? null : n;
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? [] : null;
  }
}
//@ chunk-s61vbvea.js:278534-278546 placement
var SS = 1024;
//@ chunk-s61vbvea.js:278546-278785 placement
class GitBinaryError {
  #e = new Map();
  screenMemo;
  constructor(e = "host") {
    this.screenMemo = e === "host" ? void 0 : Lqr(e === "operation");
  }
  gitExeOnPath(e) {
    let n = getEnvCaseInsensitive(e, "PATH") ?? "",
      r = this.#e.get(n);
    if (r !== void 0) return r;
    let s = findGitOnPath(n);
    if (s !== null) this.#e.set(n, s);
    return s;
  }
}
//@ chunk-s61vbvea.js:278785-278810 placement
var Ey = /\.(?:exe|com)$/i;
//@ chunk-s61vbvea.js:278810-278956 placement
function findGitOnPath(e, n = "linux") {
  let r = whichOnPath("git", e);
  if (n !== "win32" || r === null || Ey.test(r)) return r;
  let s = whichOnPath("git.exe", e);
  return s !== null && Ey.test(s) ? s : null;
}
//@ chunk-s61vbvea.js:278956-279038 placement
function HVo() {
  let e = getEnvCaseInsensitive(Oqr(), "PATH") ?? "";
  return findGitOnPath(e) === null && whichOnPath("git", e) !== null;
}
//@ chunk-s61vbvea.js:279038-279145 placement
function windowsGitNote() {
  return getPlatform_2() === "windows"
    ? " (only git.exe counts; git.cmd and git.bat wrappers are skipped)"
    : "";
}
/**
 * Windows 目录须含 git.exe 的说明。
 */
//@ chunk-s61vbvea.js:279145-279290 placement
function windowsGitDirNote() {
  return getPlatform_2() === "windows"
    ? " On Windows, that directory must hold git.exe itself, since git.cmd and git.bat wrappers are skipped."
    : "";
}
//@ chunk-s61vbvea.js:279290-279316 placement
var AI = new HostScoped(() => new GitBinaryError());
//@ chunk-s61vbvea.js:279316-279354 placement
function HNe() {
  return AI.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:279354-279403 placement
function iKt(e, n = HNe()) {
  return n.gitExeOnPath(e);
}

export {
  GitBinaryError,
  iKt,
  HNe,
  HVo,
  windowsGitDirNote,
  listProgramNames,
  yS,
  findXcodeGit,
  xd,
  windowsGitNote,
};
