/**
 * tools/REPLTool/preflightChecks.ts
 *
 * 内层命令执行前的预检：工作目录可否进入（超时/权限）与换了写法仍危险的删除复检（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (7)
 * attribution: placement 7
 */
import { access, constants } from "fs/promises";
import { sleep } from "../../utils/sleep.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { getErrnoCode, isAbortError } from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { runWithoutTelemetry } from "../BashTool/dangerousRemoval.js";
import { findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { logError } from "../../utils/log.js";

//@ chunk-n51jggtb.js:84108-84135 placement
/**
 * 超时哨兵 Symbol。
 */
var TIMED_OUT = Symbol("timed out");
//@ chunk-n51jggtb.js:84135-84281 placement
/**
 * 给 Promise 套上超时，超时返回哨兵。
 */
async function raceTimeout(timeoutMs, promise) {
  let abortController = new AbortController();
  let timer = sleep(Math.max(0, timeoutMs), abortController.signal).then(() => TIMED_OUT);
  try {
    return await Promise.race([promise, timer]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-n51jggtb.js:84281-84748 placement
/**
 * 探查目录可否进入（超时/不存在/权限），Windows 上跳过可执行位检查。
 */
async function probeDirectory(path, clock) {
  try {
    let result = await raceTimeout(clock(), getFsImplementation().stat(path));
    if (result === TIMED_OUT) return "timeout";
    if (!result.isDirectory()) return "missing";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "missing";
    if ((errnoCode === "EPERM" || errnoCode === "EACCES") && getPlatform() !== "windows") {
      let opened = await raceTimeout(
        clock(),
        getFsImplementation()
          .openDirNoFollow(path)
          .then(
            () => true,
            () => false,
          ),
      );
      if (opened === TIMED_OUT) return "timeout";
      if (opened) return;
    }
    return errnoCode ?? "";
  }
  if (getPlatform() === "windows") return;
  try {
    if ((await raceTimeout(clock(), access(path, constants.X_OK))) === TIMED_OUT) return "timeout";
  } catch (error) {
    return getErrnoCode(error) ?? "";
  }
  return;
}
//@ chunk-n51jggtb.js:84748-85085 placement
/**
 * 生成目录读取失败的说明文本。
 */
function directoryProblemText({ named, hint }, problem, ms) {
  let limitText = ms >= 1000 ? `${Math.ceil(ms / 1000)} s` : `${ms} ms`;
  return `${problem === "missing" ? `${named} is missing or not a directory` : problem === "EACCES" ? `${named} cannot be entered (permission denied)` : problem === "timeout" ? `${named} could not be read within ${limitText}` : `${named} could not be read${problem === "" ? "" : ` (${problem})`}`}, so the command did not run${hint ?? ""}`;
}
//@ chunk-n51jggtb.js:85085-85369 placement
/**
 * 在预算内逐个逻辑目录做探查，任一处失败即给出说明。
 */
async function checkDirectories(entries, timeoutMs) {
  let deadline = Date.now() + timeoutMs;
  let remainingMs = () => deadline - Date.now();
  for (let entry of entries) {
    let problem;
    for (let path of entry.logical) {
      problem = await probeDirectory(path, remainingMs);
      if (problem !== undefined) break;
    }
    if (problem === undefined) continue;
    if (entry.physical !== undefined && problem !== "timeout") {
      let physicalProblem = await probeDirectory(entry.physical, remainingMs);
      if (physicalProblem === undefined) continue;
      problem = physicalProblem;
    }
    return directoryProblemText(entry, problem, timeoutMs);
  }
  return;
}
//@ chunk-n51jggtb.js:85369-85497 placement
/**
 * 取出危险删除熔断的理由。
 */
async function dangerousRemovalReason(check, command) {
  let result = await runWithoutTelemetry(() => check(command));
  return findSafetyCheckReason(
    result.decisionReason,
    (reason) => reason.circuitBreaker === "dangerousRemoval",
  )?.reason;
}
//@ chunk-n51jggtb.js:85497-86346 placement
/**
 * 编译命令里的变量引用与导出一致性，判断是否只是“换路径也照样危险”的情形并给出说明。
 */
async function refuseRelativeRemoval({ sent, exports: exportPrefix, written, directory }, check) {
  if (!/\br\W*m/i.test(written)) return;
  try {
    let variables = new Set([...written.matchAll(/\$\{?[!#]?([A-Za-z_]\w*)/g)].map(([, capture]) => capture));
    let full = [...exportPrefix.matchAll(/ (\w+)='[^']*(?:'\\''[^']*)*'/g)].some(([, capture]) =>
      variables.has(capture),
    )
      ? exportPrefix + written
      : written;
    let reason = await runInRemoteCallFrameMain(directory, () => dangerousRemovalReason(check, full));
    if (
      reason === undefined ||
      (await dangerousRemovalReason(check, full)) === undefined ||
      (await dangerousRemovalReason(check, sent)) !== undefined
    )
      return;
    return `This command was not run. ${reason}.
If you mean to remove it, write the full path in the command itself, not a shell variable or a relative path. The command then gets the normal permission check.`;
  } catch (error) {
    if (isAbortError(error)) throw error;
    logError(error);
    return `This command was not run. The check for a dangerous removal failed because of a fault in Claude Code.
To run it, send it in a new call, as the only command, with full paths and with no change of folder or environment. It then gets the normal permission check.`;
  }
}
export { refuseRelativeRemoval, checkDirectories };
