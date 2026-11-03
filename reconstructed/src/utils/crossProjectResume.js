/**
 * utils/crossProjectResume.ts
 *
 * 跨项目 resume 检查：所选会话属于其他目录时给出切换目录的命令提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/crossProjectResume.ts
 * pieces: chunk-b79vwm1h.js (3)
 * attribution: affinity 1, callgraph-fingerprint 1, sole-consumer 1
 */
import { sep, sep as sep_2, win32, posix } from "path";
import { lstat } from "fs/promises";
import { getPlatform } from "./platform.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { Qn } from "./pathClassification.js";
import { Qg } from "./networkPaths.js";
import { getSessionIdFromLog } from "./sessionStorage.js";
import { isSafeIdSegment } from "./agentId.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { getErrnoCode } from "./errors.js";

//@ chunk-b79vwm1h.js:20088-20135 affinity
function $Tr() {
  return getPlatform() === "windows" ? ";" : "&&";
}
/**
 * 所选会话属于其他项目时，给出 cd 到对应目录再 claude --resume 的提示（同仓库 worktree 可直接恢复）。
 */
//@ chunk-b79vwm1h.js:20135-20477 callgraph-fingerprint = checkCrossProjectResume (0.251)
async function checkCrossProjectResume(log, showAllProjects, worktreePaths) {
  let currentCwd = getOriginalCwd();
  if (!showAllProjects || !log.projectPath || log.projectPath === currentCwd) return null;
  if (worktreePaths.some((wt) => log.projectPath === wt || log.projectPath.startsWith(wt + sep_2)))
    return null;
  if (!Qn(log.projectPath) && !Qg(log.projectPath) && !(await pathHasSymlinkOrUnreadable(log.projectPath)))
    return null;
  let sessionId = getSessionIdFromLog(log),
    b = isSafeIdSegment(sessionId) ? ` ${sessionId}` : "";
  return `cd ${shellQuoteArgs([log.projectPath])} ${$Tr()} claude --resume${b}`;
}
/**
 * 检查路径上是否有符号链接或无法读取的部分（兼容 Windows 路径）。
 */
//@ chunk-b79vwm1h.js:20477-20816 sole-consumer
async function pathHasSymlinkOrUnreadable(o) {
  let d = getPlatform() === "windows",
    { parse: parse, sep: sep } = d ? win32 : posix,
    u = d ? parse(o).root.replaceAll("/", sep) : parse(o).root,
    filtered = o
      .slice(parse(o).root.length)
      .split(d ? /[\\/]+/ : sep)
      .filter(Boolean),
    b = u;
  for (let p of filtered) {
    b = b === "" || b.endsWith(sep) ? b + p : b + sep + p;
    try {
      if ((await lstat(b)).isSymbolicLink()) return !0;
    } catch (error) {
      let F = getErrnoCode(error);
      return F !== "ENOENT" && F !== "ENOTDIR";
    }
  }
  return !0;
}

export { checkCrossProjectResume, $Tr };
